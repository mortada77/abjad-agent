import fs from 'node:fs';
import path from 'node:path';
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
import { control } from '../control.js';
import { MessageProcessor } from './processor.js';
import { handleOperatorCommand, onOperatorManualMessage, isAiActive } from '../takeover/takeover.js';
import { sleep } from '../util.js';

// Note: some DisconnectReason values share the same numeric code
// (connectionLost and timedOut are both 408), so build without duplicate keys.
/** Delete the CONTENTS of the auth dir (never the dir itself — it's a volume mount). */
function clearAuthDir(): boolean {
  try {
    for (const f of fs.readdirSync(config.paths.auth)) {
      fs.rmSync(path.join(config.paths.auth, f), { recursive: true, force: true });
    }
    return true;
  } catch (err) {
    logger.error('[WHATSAPP] failed to clear auth contents: %s', (err as Error).message);
    return false;
  }
}

const disconnectName: Record<number, string> = {
  [DisconnectReason.badSession]: 'badSession',
  [DisconnectReason.connectionClosed]: 'connectionClosed',
  [DisconnectReason.connectionLost]: 'connectionLost/timedOut',
  [DisconnectReason.connectionReplaced]: 'connectionReplaced',
  [DisconnectReason.loggedOut]: 'loggedOut',
  [DisconnectReason.restartRequired]: 'restartRequired',
};

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

export async function startWhatsApp(): Promise<void> {
  fs.mkdirSync(config.paths.auth, { recursive: true });

  // Learned mapping from privacy @lid -> real phone JID (@s.whatsapp.net),
  // built from incoming message keys (senderPn/participantPn). Used to deliver.
  const lidToPn = new Map<string, string>();

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
  let resetting = false;
  let logoutRecoveries = 0;

  const send = async (jid: string, text: string) => {
    if (!sock) throw new Error('WhatsApp socket not connected');
    let target = jid;
    // WhatsApp @lid delivery needs the phone-number JID. Resolve it.
    if (target.endsWith('@lid')) {
      const learned = lidToPn.get(target);
      if (learned) target = learned;
      else {
        try {
          const pn = await (sock as any).signalRepository?.lidMapping?.getPNForLID?.(target);
          if (pn && typeof pn === 'string') target = pn;
        } catch {
          /* fall back to @lid */
        }
      }
    }
    const res = await sock.sendMessage(target, { text });
    rememberSent(res?.key?.id ?? undefined);
  };

  const processor = new MessageProcessor(send);

  // Expose live capabilities to the dashboard.
  control.sendMessage = send;
  control.resetSession = async () => {
    logger.warn('[WHATSAPP] resetSession requested from dashboard');
    resetting = true;
    // Detach the old socket so its close event does not stomp our new state,
    // and never `await logout()` (it hangs on an already-dead session).
    try {
      sock?.ev.removeAllListeners('connection.update');
    } catch {
      /* ignore */
    }
    try {
      sock?.end(new Error('reset'));
    } catch {
      /* ignore */
    }
    sock = null;
    clearAuthDir();
    runtime.whatsapp = 'connecting';
    runtime.currentQR = null;
    runtime.lastDisconnect = null;
    runtime.reconnectAttempts = 0;
    logoutRecoveries = 0;
    resetting = false;
    await connect().catch((e) =>
      logger.error('[WHATSAPP] reconnect after reset failed: %s', (e as Error).message),
    );
  };

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
        logoutRecoveries = 0;
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
        logoutRecoveries = 0;
        logger.info('[WHATSAPP] connected');
      }

      if (connection === 'close') {
        if (resetting) return; // a manual reset is swapping the socket; ignore this close
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const reasonName = statusCode ? disconnectName[statusCode] ?? String(statusCode) : 'unknown';
        runtime.currentQR = null;
        runtime.lastDisconnect = reasonName;
        logger.warn('[WHATSAPP] connection closed. reason=%s (code=%s)', reasonName, statusCode);

        if (statusCode === DisconnectReason.loggedOut) {
          // Session ended: clear it and come back with a fresh QR automatically.
          runtime.whatsapp = 'logged_out';
          logoutRecoveries += 1;
          if (logoutRecoveries > 5) {
            logger.error('[WHATSAPP] too many logout recoveries — stopping. Use إعادة الربط.');
            return;
          }
          logger.error('[WHATSAPP] Logged out — clearing session and generating a new QR.');
          try {
            sock?.ev.removeAllListeners('connection.update');
          } catch {
            /* ignore */
          }
          clearAuthDir();
          await sleep(2000);
          runtime.whatsapp = 'connecting';
          runtime.currentQR = null;
          await connect().catch((e) =>
            logger.error('[WHATSAPP] re-auth reconnect failed: %s', (e as Error).message),
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
    const key = msg.key;
    if (!key) return;
    const rawJid = key.remoteJid;
    const msgId = key.id;
    if (!rawJid || !msgId) return;

    // Ignore status broadcasts and (optionally) groups.
    if (rawJid === 'status@broadcast') return;
    if (config.whatsapp.ignoreGroups && rawJid.endsWith('@g.us')) return;
    if (rawJid.endsWith('@broadcast')) return;

    // Prefer the real phone-number JID over the privacy @lid, so replies deliver.
    // WhatsApp carries it in senderPn / participantPn / remoteJidAlt.
    const k = key as any;
    const altPn: string | undefined = k.senderPn || k.participantPn || k.remoteJidAlt;
    const senderLid: string | undefined = k.senderLid || k.participantLid;
    if (altPn && altPn.endsWith('@s.whatsapp.net')) {
      if (rawJid.endsWith('@lid')) lidToPn.set(rawJid, altPn);
      if (senderLid) lidToPn.set(senderLid, altPn);
    }
    const jid =
      rawJid.endsWith('@lid') && altPn && altPn.endsWith('@s.whatsapp.net') ? altPn : rawJid;
    if (rawJid.endsWith('@lid') && jid === rawJid) {
      logger.warn('[WHATSAPP] @lid chat, no PN resolved (key: %s)', Object.keys(k).join(','));
    }

    const text = extractText(msg);

    // Messages sent from this account (fromMe):
    if (key.fromMe) {
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

    // WhatsApp is marketing/sales only: EVERY sender (including the owner's own
    // number) is treated as a customer. Owner control lives in the dashboard
    // Executive AI, never over WhatsApp.
    const pushName = msg.pushName ?? null;
    store.upsertContact(jid, phoneFromJid(jid), pushName);
    store.addMessage(jid, 'user', text, msgId);
    logger.info('[WHATSAPP] message received from %s', phoneFromJid(jid));

    if (!control.aiGloballyEnabled) {
      logger.info('[AI] global auto-reply is OFF — not replying to %s', jid);
      return;
    }

    if (!isAiActive(jid)) {
      logger.info('[AI] contact %s in human mode — not replying', jid);
      return;
    }

    processor.enqueue(jid, text);
  }

  await connect();
}
