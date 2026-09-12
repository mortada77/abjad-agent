import type { ChatTurn } from '../db/index.js';

export interface GenerateParams {
  system: string;
  history: ChatTurn[];
  user: string;
}

/**
 * AIProvider decouples the WhatsApp layer from the LLM vendor.
 * Swap providers via the AI_PROVIDER env var without touching WhatsApp logic.
 */
export interface AIProvider {
  readonly name: string;
  /** True when a usable API key is configured. */
  isReady(): boolean;
  /** Reason why it is not ready (for logs / status). */
  notReadyReason(): string | null;
  /** Generate a reply given the system prompt, prior turns, and the new message. */
  generateReply(params: GenerateParams): Promise<string>;
  /** Condense a block of conversation text into a short running summary. */
  summarize(system: string, conversationText: string): Promise<string>;
}
