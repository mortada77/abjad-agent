import express from 'express';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { runtime } from '../runtime.js';
import { store } from '../db/index.js';

export function startHealthServer(): void {
  const app = express();
  app.disable('x-powered-by');

  // GET /health — simple liveness (no secrets).
  app.get('/health', (_req, res) => {
    const ok = runtime.whatsapp === 'connected';
    res.status(ok ? 200 : 503).json({
      status: ok ? 'ok' : 'degraded',
      whatsapp: runtime.whatsapp,
      ai: runtime.aiReady ? 'ready' : 'not_ready',
      uptime: Math.floor((Date.now() - runtime.startedAt) / 1000),
    });
  });

  // GET /status — non-sensitive technical info.
  app.get('/status', (_req, res) => {
    let contacts = 0;
    let messages = 0;
    try {
      contacts = (store.raw.prepare('SELECT COUNT(*) AS c FROM contacts').get() as { c: number }).c;
      messages = (store.raw.prepare('SELECT COUNT(*) AS c FROM messages').get() as { c: number }).c;
    } catch {
      /* ignore */
    }
    res.json({
      app: 'abjad-agent',
      whatsapp: runtime.whatsapp,
      aiProvider: runtime.aiProviderName,
      aiReady: runtime.aiReady,
      reconnectAttempts: runtime.reconnectAttempts,
      contacts,
      messages,
      uptimeSeconds: Math.floor((Date.now() - runtime.startedAt) / 1000),
      startedAt: new Date(runtime.startedAt).toISOString(),
    });
  });

  // GET /qr?token=... — pairing page. Token-protected.
  app.get('/qr', async (req, res) => {
    if (req.query.token !== config.http.pairingToken) {
      res.status(403).send('Forbidden: invalid or missing token.');
      return;
    }
    if (runtime.whatsapp === 'connected') {
      res.send(page('✅ متصل', '<p>الوكيل مرتبط بواتساب بالفعل. لا حاجة لمسح QR.</p>'));
      return;
    }
    if (!runtime.currentQR) {
      res.send(
        page(
          '⏳ لا يوجد QR حالياً',
          '<p>الحالة: <b>' +
            runtime.whatsapp +
            '</b>. حدّث الصفحة بعد لحظات. إذا استمر، تحقق من اللوجات.</p>',
          true,
        ),
      );
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(runtime.currentQR, { width: 320, margin: 2 });
      res.send(
        page(
          'امسح لربط Abjad Agi',
          `<img src="${dataUrl}" alt="QR" />
           <p>افتح واتساب على هاتف الرقم المطلوب ← الأجهزة المرتبطة ← ربط جهاز، وامسح الكود.</p>`,
          true,
        ),
      );
    } catch (err) {
      res.status(500).send('QR render error: ' + (err as Error).message);
    }
  });

  app.listen(config.http.port, () => {
    logger.info('[HEALTH] HTTP server listening on port %d', config.http.port);
    logger.info('[HEALTH]   /health  /status  /qr?token=***');
  });
}

function page(title: string, body: string, autoRefresh = false): string {
  return `<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
${autoRefresh ? '<meta http-equiv="refresh" content="15"/>' : ''}
<title>${title} — Abjad Agi</title>
<style>
 body{font-family:system-ui,Segoe UI,Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;
      display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center}
 .card{background:#1e293b;padding:32px;border-radius:16px;max-width:420px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
 h1{font-size:20px;margin:0 0 16px} img{background:#fff;padding:12px;border-radius:12px} p{color:#94a3b8;font-size:14px;line-height:1.7}
</style></head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
}
