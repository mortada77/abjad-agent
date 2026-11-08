/**
 * Reply hooks — let another app (e.g. أبجد متاجر order confirmation) own a contact's
 * next replies for a while.
 *
 * POST /api/send { jid, text, replyHook: { url, ttlMinutes } } registers a hook for that
 * phone. While it is active, every text the contact sends is POSTed to `url` as
 * { phone, jid, text } BEFORE the AI sees it. The app answers:
 *   { handled: true, reply?: string, done?: boolean }  -> agent sends `reply`, skips the AI;
 *                                                         done=true removes the hook.
 *   { handled: false }                                 -> message continues to the AI as usual.
 * Hooks persist in data/reply-hooks.json so a restart doesn't drop pending confirmations.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger.js';

type Hook = { url: string; expires: number };
const FILE = path.join(config.paths.data, 'reply-hooks.json');
const hooks = new Map<string, Hook>();

const phoneOf = (jid: string) => jid.split('@')[0].split(':')[0].replace(/\D/g, '');

function load(): void {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Record<string, Hook>;
    const now = Date.now();
    for (const [k, v] of Object.entries(raw)) if (v.expires > now) hooks.set(k, v);
  } catch { /* no file yet */ }
}
function save(): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(hooks)));
  } catch (e) {
    logger.warn('[HOOKS] could not persist: %s', (e as Error).message);
  }
}
load();

export function registerReplyHook(jid: string, url: string, ttlMinutes = 2880): void {
  if (!/^https?:\/\//i.test(url)) throw new Error('replyHook.url must be http(s)');
  const ttl = Math.min(Math.max(Number(ttlMinutes) || 2880, 5), 7 * 24 * 60);
  hooks.set(phoneOf(jid), { url, expires: Date.now() + ttl * 60_000 });
  save();
}

/** Returns true when the hook consumed the message (the AI must not reply). */
export async function tryReplyHook(
  jid: string,
  text: string,
  send: (jid: string, text: string) => Promise<unknown>,
): Promise<boolean> {
  const phone = phoneOf(jid);
  const h = hooks.get(phone);
  if (!h) return false;
  if (h.expires < Date.now()) {
    hooks.delete(phone);
    save();
    return false;
  }
  try {
    const r = await fetch(h.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone, jid, text }),
      signal: AbortSignal.timeout(10_000),
    });
    const j = (await r.json().catch(() => ({}))) as { handled?: boolean; reply?: string; done?: boolean };
    if (j.done) {
      hooks.delete(phone);
      save();
    }
    if (!j.handled) return false;
    if (j.reply) await send(jid, String(j.reply).slice(0, 4000));
    logger.info('[HOOKS] reply from %s handled by hook', phone);
    return true;
  } catch (e) {
    // The app is down — don't swallow the customer's message; let the normal flow run.
    logger.warn('[HOOKS] hook call failed for %s: %s', phone, (e as Error).message);
    return false;
  }
}
