import fs from 'node:fs';
import { config } from '../config.js';
import { logger } from '../logger.js';
import type { AIProvider } from './provider.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';

export * from './provider.js';

let cachedSystemPrompt: string | null = null;

/** Load the editable Abjad Agi persona from prompts/system-prompt.txt. */
export function getSystemPrompt(): string {
  if (cachedSystemPrompt !== null) return cachedSystemPrompt;
  try {
    cachedSystemPrompt = fs.readFileSync(config.paths.systemPrompt, 'utf8').trim();
  } catch (err) {
    logger.error('[AI] Failed to read system prompt file: %s', (err as Error).message);
    cachedSystemPrompt = 'You are Abjad Agi, the AI assistant for the Abjad team.';
  }
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
