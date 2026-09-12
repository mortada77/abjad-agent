export type WhatsAppStatus =
  | 'starting'
  | 'connecting'
  | 'waiting_qr'
  | 'connected'
  | 'reconnecting'
  | 'logged_out';

interface Runtime {
  startedAt: number;
  whatsapp: WhatsAppStatus;
  aiReady: boolean;
  aiProviderName: string;
  /** Current pairing QR string (only set while waiting_qr). */
  currentQR: string | null;
  reconnectAttempts: number;
}

export const runtime: Runtime = {
  startedAt: Date.now(),
  whatsapp: 'starting',
  aiReady: false,
  aiProviderName: 'unknown',
  currentQR: null,
  reconnectAttempts: 0,
};
