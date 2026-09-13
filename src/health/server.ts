import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { runtime } from '../runtime.js';
import { store } from '../db/index.js';
import { control } from '../control.js';
import { pause, resume } from '../takeover/takeover.js';
import { DASHBOARD_HTML } from './dashboard-html.js';

export function startHealthServer(): void {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  const tokenOK = (req: Request): boolean => {
    const t =
      (req.query.token as string) ||
      (req.headers['x-admin-token'] as string) ||
      (req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '');
    return t === config.http.pairingToken;
  };
  const requireToken = (req: Request, res: Response, next: NextFunction) => {
    if (!tokenOK(req)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    next();
  };

  // ---- Public: liveness ----
  app.get('/health', (_req, res) => {
    const ok = runtime.whatsapp === 'connected';
    res.status(ok ? 200 : 503).json({
      status: ok ? 'ok' : 'degraded',
      whatsapp: runtime.whatsapp,
      ai: runtime.aiReady ? 'ready' : 'not_ready',
      uptime: Math.floor((Date.now() - runtime.startedAt) / 1000),
    });
  });

  // ---- Public-ish: non-sensitive status ----
  app.get('/status', (_req, res) => {
    res.json(publicState());
  });

  // ---- Dashboard SPA ----
  app.get('/', (_req, res) => {
    res.type('html').send(DASHBOARD_HTML);
  });

  // ---- QR pairing page (token in query) ----
  app.get('/qr', async (req, res) => {
    if (!tokenOK(req)) {
      res.status(403).send('Forbidden: invalid or missing token.');
      return;
    }
    if (runtime.whatsapp === 'connected') {
      res.send(qrPage('✅ متصل', '<p>الوكيل مرتبط بواتساب بالفعل.</p>'));
      return;
    }
    if (!runtime.currentQR) {
      res.send(qrPage('⏳ لا يوجد QR حالياً', `<p>الحالة: <b>${runtime.whatsapp}</b>. حدّث بعد لحظات.</p>`, true));
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(runtime.currentQR, { width: 320, margin: 2 });
      res.send(
        qrPage(
          'امسح لربط Abjad Agi',
          `<img src="${dataUrl}" alt="QR"/><p>واتساب ← الأجهزة المرتبطة ← ربط جهاز، وامسح الكود.</p>`,
          true,
        ),
      );
    } catch (err) {
      res.status(500).send('QR error: ' + (err as Error).message);
    }
  });

  // ================= API (token required) =================
  const api = express.Router();
  api.use(requireToken);

  api.get('/state', (_req, res) => res.json(publicState()));

  api.get('/qr', async (_req, res) => {
    let qr: string | null = null;
    if (runtime.currentQR && runtime.whatsapp !== 'connected') {
      qr = await QRCode.toDataURL(runtime.currentQR, { width: 300, margin: 2 });
    }
    res.json({ status: runtime.whatsapp, qr });
  });

  api.get('/contacts', (_req, res) => res.json(store.listContacts(200)));

  api.get('/conversation', (req, res) => {
    const jid = String(req.query.jid || '');
    if (!jid) return res.status(400).json({ error: 'jid required' });
    res.json(store.conversation(jid, 80));
  });

  api.get('/escalations', (_req, res) => res.json(store.listEscalations(80)));

  api.post('/escalations/handle', (req, res) => {
    const id = Number(req.body?.id);
    if (!id) return res.status(400).json({ error: 'id required' });
    store.markEscalationHandled(id);
    res.json({ ok: true });
  });

  api.post('/pause', (req, res) => {
    const jid = String(req.body?.jid || '');
    const minutes = Number(req.body?.minutes) || undefined;
    if (!jid) return res.status(400).json({ error: 'jid required' });
    const until = pause(jid, minutes);
    res.json({ ok: true, until });
  });

  api.post('/resume', (req, res) => {
    const jid = String(req.body?.jid || '');
    if (!jid) return res.status(400).json({ error: 'jid required' });
    resume(jid);
    res.json({ ok: true });
  });

  api.post('/send', async (req, res) => {
    const jid = String(req.body?.jid || '');
    const text = String(req.body?.text || '');
    if (!jid || !text) return res.status(400).json({ error: 'jid and text required' });
    if (!control.sendMessage) return res.status(503).json({ error: 'whatsapp not connected' });
    try {
      await control.sendMessage(jid, text);
      store.addMessage(jid, 'assistant', text);
      pause(jid); // manual message -> pause AI for this contact
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  api.post('/ai-global', (req, res) => {
    const enabled = Boolean(req.body?.enabled);
    control.aiGloballyEnabled = enabled;
    store.setSetting('ai_enabled', enabled ? '1' : '0');
    logger.warn('[DASHBOARD] global AI set to %s', enabled ? 'ON' : 'OFF');
    res.json({ ok: true, enabled });
  });

  api.post('/reset-session', async (_req, res) => {
    if (!control.resetSession) return res.status(503).json({ error: 'not ready' });
    res.json({ ok: true }); // respond first; reset runs async
    control.resetSession().catch((e) => logger.error('[DASHBOARD] reset failed: %s', e.message));
  });

  api.get('/logs', (_req, res) => {
    res.type('text/plain').send(tailLogs(300));
  });

  app.use('/api', api);

  app.listen(config.http.port, () => {
    logger.info('[HTTP] dashboard + API on port %d', config.http.port);
    logger.info('[HTTP]   dashboard: /   (token required)  |  QR: /qr?token=***');
  });
}

function publicState() {
  let contacts = 0;
  let messages = 0;
  try {
    contacts = (store.raw.prepare('SELECT COUNT(*) AS c FROM contacts').get() as { c: number }).c;
    messages = (store.raw.prepare('SELECT COUNT(*) AS c FROM messages').get() as { c: number }).c;
  } catch {
    /* ignore */
  }
  return {
    app: 'abjad-agent',
    whatsapp: runtime.whatsapp,
    aiProvider: runtime.aiProviderName,
    aiReady: runtime.aiReady,
    aiGloballyEnabled: control.aiGloballyEnabled,
    adminConfigured: Boolean(config.admin.number),
    lastDisconnect: runtime.lastDisconnect,
    reconnectAttempts: runtime.reconnectAttempts,
    contacts,
    messages,
    uptimeSeconds: Math.floor((Date.now() - runtime.startedAt) / 1000),
    startedAt: new Date(runtime.startedAt).toISOString(),
  };
}

function tailLogs(lines: number): string {
  try {
    const dir = config.paths.logs;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.log'))
      .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    if (files.length === 0) return '(no logs yet)';
    const content = fs.readFileSync(path.join(dir, files[0].f), 'utf8');
    return content.split('\n').slice(-lines).join('\n');
  } catch (err) {
    return 'log read error: ' + (err as Error).message;
  }
}

function qrPage(title: string, body: string, autoRefresh = false): string {
  return `<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
${autoRefresh ? '<meta http-equiv="refresh" content="15"/>' : ''}
<title>${title} — Abjad Agi</title>
<style>body{font-family:system-ui,Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;
min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center}
.card{background:#1e293b;padding:32px;border-radius:16px;max-width:420px}
img{background:#fff;padding:12px;border-radius:12px}p{color:#94a3b8;font-size:14px;line-height:1.7}</style>
</head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
}
