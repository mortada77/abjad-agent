import fs from 'node:fs';
import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  type WASocket,
  type proto,
} from '@whiskeysockets/baileys';
import qrcodeTerminal from 'qrcode-terminal';
import pino from 'pino';

import { config } from '../config.js';
import { logger } from '../logger.js';
import { runtime } from '../runtime.js';
import { store } from '../db/index.js';
import type { AIProvider } from '../ai/index.js';
import { MessageProcessor } from './processor.js';
import {
  handleOperatorCommand,
  onOperatorManualMessage,
  isAiActive,
} from '../takeover/takeover.js';
import { sleep } from '../util.js';

// Baileys is chatty; give it its own silent-ish logger.
const waLogger = pino({ level: 'warn' });

/** Extract plain text from a Baileys message, if any. */
function extractText(msg: proto.IWebMessageInfo): string | null {
  const m = msg.message;
  if (!m) return null;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.listResponseMessage?.title ||
    null
  );
}

function phoneFromJid(jid: string): string {
  return jid.split('@')[0]?.split(':')[0] ?? jid;
}

export async function startWhatsApp(provider: AIProvider): Promise<void> {
  fs.mkdirSync(config.paths.auth, { recursive: true });

  // Track message IDs the bot itself sent, so echoes (fromMe) are not treated
  // as operator manual messages (prevents loops + false human-takeover).
  const sentByBot = new Set<string>();
  const rememberSent = (id?: string | null) => {
    if (!id) return;
    sentByBot.add(id);
    if (sentByBot.size > 2000) {
      // bound memory
      const first = sentByBot.values().next().value;
      if (first) sentByBot.delete(first);
    }
  };

  let sock: WASocket | null = null;

  const send = async (jid: string, text: string) => {
    if (!sock) throw new Error('WhatsApp socket not connected');
    const res = await sock.sendMessage(jid, { text });
    rememberSent(res?.key?.id ?? undefined);
  };

  const processor = new MessageProcessor(provider, send);

  const connect = async (): Promise<void> => {
    const { state, saveCreds } = await useMultiFileAuthState(config.paths.auth);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger: waLogger,
      printQRInTerminal: false, // we render QR ourselves (terminal + web)
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, waLogger),
      },
      browser: Browsers.appropriate('Abjad Agi'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        runtime.whatsapp = 'waiting_qr';
        runtime.currentQR = qr;
        logger.warn('[WHATSAPP] Scan the QR to pair. Web: http://<server-ip>:%d/qr?token=%s', config.http.port, config.http.pairingToken);
        qrcodeTerminal.generate(qr, { small: true });
      }

      if (connection === 'connecting') {
        runtime.whatsapp = 'connecting';
        logger.info('[WHATSAPP] connecting...');
      }

      if (connection === 'open') {
        runtime.whatsapp = 'connected';
        runtime.currentQR = null;
        runtime.reconnectAttempts = 0;
        logger.info('[WHATSAPP] connected');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        runtime.currentQR = null;

        if (statusCode === DisconnectReason.loggedOut) {
          // Session ended permanently — DO NOT loop. Require manual re-pairing.
          runtime.whatsapp = 'logged_out';
          logger.error(
            '[WHATSAPP] Logged out. The session is no longer valid. ' +
              'To re-pair: stop the container, clear the whatsapp-auth volume, start again, and scan the QR at /qr.',
          );
          return;
        }

        // Transient disconnect — reconnect with a throttled backoff.
        runtime.whatsapp = 'reconnecting';
        runtime.reconnectAttempts += 1;
        const delay = Math.min(3000 * runtime.reconnectAttempts, 30_000);
        logger.warn(
          '[WHATSAPP] connection closed (code=%s). Reconnecting in %dms (attempt %d)',
          statusCode,
          delay,
          runtime.reconnectAttempts,
        );
        await sleep(delay);
        await connect().catch((e) =>
          logger.error('[WHATSAPP] reconnect failed: %s', (e as Error).message),
        );
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return; // ignore history/append syncs
      for (const msg of messages) {
        try {
          await handleIncoming(msg);
        } catch (err) {
          logger.error('[WHATSAPP] error handling message: %s', (err as Error).message);
        }
      }
    });
  };

  async function handleIncoming(msg: proto.IWebMessageInfo): Promise<void> {
    const jid = msg.key.remoteJid;
    const msgId = msg.key.id;
    if (!jid || !msgId) return;

    // Ignore status broadcasts and (optionally) groups.
    if (jid === 'status@broadcast') return;
    if (config.whatsapp.ignoreGroups && jid.endsWith('@g.us')) return;
    if (jid.endsWith('@broadcast')) return;

    const text = extractText(msg);

    // Messages sent from this account (fromMe):
    if (msg.key.fromMe) {
      // Echo of the bot's own reply -> ignore completely.
      if (sentByBot.has(msgId)) return;
      // A manual message typed by the operator from the phone/app.
      if (!text) return;
      const cmd = handleOperatorCommand(jid, text);
      if (cmd) {
        // Reply to the operator's command in the same chat.
        await send(jid, cmd);
      } else {
        // Normal manual message -> pause AI for this contact.
        onOperatorManualMessage(jid);
        logger.info('[TAKEOVER] operator manual message -> AI paused for %s', jid);
      }
      return;
    }

    // Incoming customer message. Dedup by WhatsApp message id.
    if (store.isProcessed(msgId)) return;
    store.markProcessed(msgId);

    if (!text || !text.trim()) return; // no supported text content (image/doc handled later)

    const pushName = msg.pushName ?? null;
    store.upsertContact(jid, phoneFromJid(jid), pushName);
    store.addMessage(jid, 'user', text, msgId);
    logger.info('[WHATSAPP] message received from %s', phoneFromJid(jid));

    if (!isAiActive(jid)) {
      logger.info('[AI] contact %s in human mode — not replying', jid);
      return;
    }

    processor.enqueue(jid, text);
  }

  await connect();
}
