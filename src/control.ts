/**
 * Control bridge between the dashboard (HTTP) and the WhatsApp client.
 * The WhatsApp client registers its live capabilities here on connect;
 * the dashboard API calls them. Kept in one place to avoid import cycles.
 */
export interface Control {
  /** Send a WhatsApp message as the bot. Null until the socket is up. */
  sendMessage: ((jid: string, text: string) => Promise<void>) | null;
  /** Log out of WhatsApp and reset the session so a new QR is shown. */
  resetSession: (() => Promise<void>) | null;
  /** Whether the AI auto-reply is globally enabled (kill switch). */
  aiGloballyEnabled: boolean;
}

export const control: Control = {
  sendMessage: null,
  resetSession: null,
  aiGloballyEnabled: true,
};

/** Normalise a phone number (digits, country code, no +) into a WhatsApp JID. */
export function toJid(numberOrJid: string): string {
  const s = numberOrJid.trim();
  if (s.includes('@')) return s;
  const digits = s.replace(/[^0-9]/g, '');
  return `${digits}@s.whatsapp.net`;
}
