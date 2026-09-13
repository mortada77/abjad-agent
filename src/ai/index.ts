import fs from 'node:fs';
import { config } from '../config.js';
import { logger } from '../logger.js';
import type { AIProvider } from './provider.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { ESCALATION_PROTOCOL } from '../escalation.js';

export * from './provider.js';

let cachedSystemPrompt: string | null = null;

/**
 * The Abjad Agi persona. Source order:
 *   1. SYSTEM_PROMPT env var (lets you tune wording in hPanel without a rebuild)
 *   2. prompts/system-prompt.txt (baked into the image)
 * The fixed escalation protocol is always appended so its contract never breaks.
 */
export function getSystemPrompt(): string {
  if (cachedSystemPrompt !== null) return cachedSystemPrompt;
  let base: string;
  if (config.ai.systemPromptOverride) {
    base = config.ai.systemPromptOverride.trim();
    logger.info('[AI] Using SYSTEM_PROMPT from environment');
  } else {
    try {
      base = fs.readFileSync(config.paths.systemPrompt, 'utf8').trim();
    } catch (err) {
      logger.error('[AI] Failed to read system prompt file: %s', (err as Error).message);
      base = 'You are Abjad Agi, the AI assistant for the Abjad team.';
    }
  }
  cachedSystemPrompt = base + ESCALATION_PROTOCOL;
  return cachedSystemPrompt;
}

export function createProvider(): AIProvider {
  const which = config.ai.provider;
  let provider: AIProvider;
  if (which === 'openai') {
    provider = new OpenAIProvider();
  } else {
    if (which !== 'anthropic') {
      logger.warn('[AI] Unknown AI_PROVIDER "%s", falling back to anthropic', which);
    }
    provider = new AnthropicProvider();
  }

  if (provider.isReady()) {
    logger.info('[AI] Provider ready: %s', provider.name);
  } else {
    // Do NOT crash — stay up and surface a clear error (per requirements).
    logger.error(
      '[AI] Provider "%s" is NOT ready: %s. The bot will run but cannot generate replies until this is fixed.',
      provider.name,
      provider.notReadyReason(),
    );
  }
  return provider;
}
