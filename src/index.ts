import { config } from './config.js';
import { logger } from './logger.js';
import { runtime } from './runtime.js';
import { store } from './db/index.js'; // initialise DB early
import { control } from './control.js';
import { createProvider } from './ai/index.js';
import { startHealthServer } from './health/server.js';
import { startWhatsApp } from './whatsapp/client.js';

async function main() {
  logger.info('==============================================');
  logger.info(' Abjad Agi — WhatsApp AI Agent starting');
  logger.info(' AI provider: %s | model cfg loaded', config.ai.provider);
  logger.info('==============================================');

  if (config.http.pairingToken === 'change-me-to-a-random-string') {
    logger.warn('[SECURITY] PAIRING_TOKEN is still the default. Set a random value in your env.');
  }

  // Restore the global auto-reply kill switch from DB.
  const saved = store.getSetting('ai_enabled');
  if (saved !== null) control.aiGloballyEnabled = saved === '1';
  logger.info('[AI] global auto-reply: %s', control.aiGloballyEnabled ? 'ON' : 'OFF');

  // AI provider (never crashes if key missing — logs a clear error instead).
  const provider = createProvider();
  runtime.aiProviderName = provider.name;
  runtime.aiReady = provider.isReady();

  // Health + QR server (always up, so you can check status even before pairing).
  startHealthServer();

  // WhatsApp.
  try {
    await startWhatsApp(provider);
  } catch (err) {
    logger.error('[WHATSAPP] failed to start: %s', (err as Error).message);
  }
}

// ---- Process resilience ----
process.on('uncaughtException', (err) => {
  logger.error('[FATAL] uncaughtException: %s\n%s', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  logger.error('[FATAL] unhandledRejection: %s', String(reason));
});

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('[SHUTDOWN] received %s — shutting down gracefully', signal);
  // Give logs/flush a moment, then exit. WhatsApp session is persisted on disk.
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

void main();
