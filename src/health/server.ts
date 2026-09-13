import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { logger, recentLogs } from '../logger.js';
import { runtime } from '../runtime.js';
import { store } from '../db/index.js';
import { control } from '../control.js';
import { pause, resume } from '../takeover/takeover.js';
import { activeProvider, activeProviderName, activeModel } from '../ai/index.js';
import { generateInsight, suggestReply, analyzeTrends } from '../ai/insight.js';
import { executiveAsk } from '../executive/brain.js';
import { textToSpeech, VOICES, getVoice, getVoiceInstructions } from '../ai/tts.js';
import { DASHBOARD_HTML } from './dashboard-html.js';
import { EXECUTIVE_HTML } from './executive-html.js';

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

  // ---- Executive AI page (owner assistant, voice-first) ----
  app.get('/executive', (_req, res) => {
    res.type('html').send(EXECUTIVE_HTML);
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
    res.type('text/plain').send(recentLogs(400));
  });

  // ---- Executive AI ----
  api.post('/executive/chat', async (req, res) => {
    const message = String(req.body?.message || '').trim();
    const session = String(req.body?.session || 'default');
    if (!message) return res.status(400).json({ error: 'message required' });
    const r = await executiveAsk(message, session);
    res.json(r);
  });
  api.get('/executive/history', (req, res) => {
    const session = String(req.query.session || 'default');
    res.json(store.execRecent(60, session));
  });
  api.post('/executive/reset', (req, res) => {
    store.execClear(String(req.body?.session || 'default'));
    res.json({ ok: true });
  });
  api.post('/executive/tts', async (req, res) => {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'text required' });
    try {
      const buf = await textToSpeech(text);
      if (!buf) return res.status(503).json({ error: 'tts unavailable' });
      res.type('audio/mpeg').send(buf);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ---- Voice settings ----
  api.get('/voice', (_req, res) => {
    res.json({ voice: getVoice(), instructions: getVoiceInstructions(), voices: VOICES });
  });
  api.post('/voice', (req, res) => {
    if (req.body?.voice) store.setSetting('exec_voice', String(req.body.voice));
    if (typeof req.body?.instructions === 'string')
      store.setSetting('exec_voice_instructions', req.body.instructions);
    res.json({ ok: true, voice: getVoice() });
  });

  // ---- Database backup (download a consistent .sqlite snapshot) ----
  api.get('/backup', async (_req, res) => {
    try {
      const tmp = path.join(config.paths.data, `backup-${Date.now()}.sqlite`);
      await store.backup(tmp);
      res.download(tmp, `abjad-backup-${new Date().toISOString().slice(0, 10)}.sqlite`, () => {
        try {
          fs.unlinkSync(tmp);
        } catch {
          /* ignore */
        }
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ---- CRM / sales ----
  api.get('/kpis', (_req, res) => res.json(store.kpis()));
  api.get('/pipeline', (_req, res) => res.json(store.pipeline()));
  api.get('/analytics', (_req, res) => res.json(store.analytics()));

  api.post('/contact/stage', (req, res) => {
    const jid = String(req.body?.jid || '');
    const stage = String(req.body?.stage || '');
    if (!jid || !stage) return res.status(400).json({ error: 'jid and stage required' });
    store.setStage(jid, stage);
    res.json({ ok: true });
  });

  api.post('/contact/followup', (req, res) => {
    const jid = String(req.body?.jid || '');
    if (!jid) return res.status(400).json({ error: 'jid required' });
    const at = req.body?.at ? Number(req.body.at) : null;
    const note = req.body?.note ? String(req.body.note) : null;
    store.setFollowup(jid, at, note);
    res.json({ ok: true });
  });

  // ---- AI intelligence ----
  api.get('/insight', async (req, res) => {
    const jid = String(req.query.jid || '');
    if (!jid) return res.status(400).json({ error: 'jid required' });
    const cached = store.getInsight(jid);
    const refresh = req.query.refresh === '1';
    if (cached.insight && !refresh) {
      return res.json({ insight: JSON.parse(cached.insight), at: cached.insight_at, cached: true });
    }
    const insight = await generateInsight(jid);
    if (!insight) return res.json({ insight: null });
    res.json({ insight, at: Date.now(), cached: false });
  });

  api.post('/suggest', async (req, res) => {
    const jid = String(req.body?.jid || '');
    if (!jid) return res.status(400).json({ error: 'jid required' });
    res.json({ text: await suggestReply(jid) });
  });

  api.get('/analyze-trends', async (_req, res) => {
    res.json({ text: await analyzeTrends() });
  });

  // ---- Model / provider selection (live, no rebuild) ----
  api.get('/model', (_req, res) => {
    res.json({
      provider: activeProviderName(),
      model: activeModel(),
      ready: activeProvider().isReady(),
      reason: activeProvider().notReadyReason(),
      presets: {
        openai: ['gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4o-mini', 'o4-mini'],
        anthropic: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'],
      },
    });
  });
  api.post('/model', (req, res) => {
    const p = String(req.body?.provider || '').toLowerCase();
    const m = String(req.body?.model || '').trim();
    if (p && p !== 'openai' && p !== 'anthropic')
      return res.status(400).json({ error: 'provider must be openai or anthropic' });
    if (p) store.setSetting('ai_provider', p);
    if (m) store.setSetting('ai_model', m);
    logger.warn('[DASHBOARD] AI set to provider=%s model=%s', activeProviderName(), activeModel());
    res.json({
      ok: true,
      provider: activeProviderName(),
      model: activeModel(),
      ready: activeProvider().isReady(),
      reason: activeProvider().notReadyReason(),
    });
  });

  // ---- Live instructions (editable persona knowledge) ----
  api.get('/instructions', (_req, res) => {
    res.json({ text: store.getSetting('extra_instructions') || '' });
  });
  api.post('/instructions', (req, res) => {
    store.setSetting('extra_instructions', String(req.body?.text ?? ''));
    logger.warn('[DASHBOARD] extra instructions updated');
    res.json({ ok: true });
  });

  app.use('/api', api);

  // Optional brand logo: serve /logo from public/logo.png if present.
  app.get('/logo', (_req, res) => {
    const p = path.join(config.root, 'public', 'logo.png');
    if (fs.existsSync(p)) res.type('png').send(fs.readFileSync(p));
    else res.status(404).end();
  });

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
    aiProvider: activeProviderName(),
    aiModel: activeModel(),
    aiReady: activeProvider().isReady(),
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
