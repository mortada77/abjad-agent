import type { ChatTurn } from '../db/index.js';

export interface GenerateParams {
  system: string;
  history: ChatTurn[];
  user: string;
}

/** A tool the model may call (JSON-schema parameters). */
export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface RunToolsParams {
  system: string;
  history: ChatTurn[];
  user: string;
  tools: ToolDef[];
  /** Execute a tool call and return a JSON-serialisable result. */
  execute: (name: string, args: any) => Promise<any>;
  /** Called when a tool starts (for a friendly "reading data…" UI hint). */
  onToolStart?: (name: string, args: any) => void;
  maxRounds?: number;
}

export interface RunToolsResult {
  text: string;
  toolsUsed: string[];
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
  /** Agentic tool-calling loop (Executive AI). Optional per provider. */
  runWithTools?(params: RunToolsParams): Promise<RunToolsResult>;
}
