import { config } from '../config.js';
import { logger } from '../logger.js';
import { store } from '../db/index.js';

/**
 * Human takeover:
 *  - When YOU (the operator) send a manual message to a customer from the same
 *    WhatsApp account, AI is paused for that contact for HUMAN_TAKEOVER_MINUTES.
 *  - Commands (sent by the operator to a chat) give explicit control:
 *      /pause  [minutes]  -> pause AI for this contact (default configured minutes)
 *      /resume            -> resume AI immediately
 *      /status            -> report current mode for this contact
 *  - HUMAN_MODE expires automatically after the timeout, returning to AI_ACTIVE.
 */

export function isAiActive(jid: string): boolean {
  const c = store.getContact(jid);
  if (!c) return true; // brand-new contact -> AI on
  if (c.ai_enabled === 0) return false;
  if (c.state === 'HUMAN_MODE') {
    if (c.human_until && Date.now() >= c.human_until) {
      // expired -> auto resume
      store.setState(jid, 'AI_ACTIVE', null);
      logger.info('[TAKEOVER] Auto-resumed AI for %s (timeout elapsed)', jid);
      return true;
    }
    return false;
  }
  return true;
}

export function pause(jid: string, minutes = config.takeover.minutes): number {
  const until = Date.now() + minutes * 60_000;
  store.setState(jid, 'HUMAN_MODE', until);
  logger.info('[TAKEOVER] AI paused for %s for %d min', jid, minutes);
  return until;
}

export function resume(jid: string): void {
  store.setState(jid, 'AI_ACTIVE', null);
  logger.info('[TAKEOVER] AI resumed for %s', jid);
}

/**
 * Handle an operator command typed into a chat (message sent BY us).
 * Returns a short reply to post back into the chat, or null if not a command.
 */
export function handleOperatorCommand(jid: string, text: string): string | null {
  const t = text.trim().toLowerCase();
  if (t === '/resume') {
    resume(jid);
    return '✅ تم تفعيل رد Abjad Agi التلقائي لهذا العميل.';
  }
  if (t.startsWith('/pause')) {
    const parts = t.split(/\s+/);
    const mins = parts[1] ? Number(parts[1]) : config.takeover.minutes;
    const until = pause(jid, Number.isFinite(mins) && mins > 0 ? mins : config.takeover.minutes);
    const minsLeft = Math.round((until - Date.now()) / 60000);
    return `⏸️ تم إيقاف الرد التلقائي لهذا العميل لمدة ${minsLeft} دقيقة. اكتب /resume للتفعيل.`;
  }
  if (t === '/status') {
    const active = isAiActive(jid);
    return active ? 'الوضع الحالي: AI_ACTIVE ✅' : 'الوضع الحالي: HUMAN_MODE ⏸️';
  }
  return null;
}

/** Called when the operator sends a normal (non-command) manual message. */
export function onOperatorManualMessage(jid: string): void {
  // Only auto-pause if not already explicitly controlled.
  const c = store.getContact(jid);
  if (c && c.state === 'HUMAN_MODE') return;
  pause(jid);
}
