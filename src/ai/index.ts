import fs from 'node:fs';
import { config } from '../config.js';
import { logger } from '../logger.js';
import type { AIProvider } from './provider.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { ESCALATION_PROTOCOL } from '../escalation.js';
import { store } from '../db/index.js';

export * from './provider.js';

let cachedBase: string | null = null;

function basePrompt(): string {
  if (cachedBase !== null) return cachedBase;
  if (config.ai.systemPromptOverride) {
    cachedBase = config.ai.systemPromptOverride.trim();
    logger.info('[AI] Using SYSTEM_PROMPT from environment');
  } else {
    try {
      cachedBase = fs.readFileSync(config.paths.systemPrompt, 'utf8').trim();
    } catch (err) {
      logger.error('[AI] Failed to read system prompt file: %s', (err as Error).message);
      cachedBase = 'You are Abjad Agi, the AI assistant for the Abjad team.';
    }
  }
  return cachedBase;
}

/**
 * Full persona = base persona + live "extra instructions" (editable from the
 * dashboard, stored in DB, no rebuild needed) + the fixed escalation protocol
 * (always last so its contract can't be broken by edited instructions).
 */
export function getSystemPrompt(): string {
  const extra = store.getSetting('extra_instructions');
  const extraBlock = extra && extra.trim() ? `\n\n## تعليمات إضافية من الإدارة\n${extra.trim()}` : '';
  return basePrompt() + extraBlock + ESCALATION_PROTOCOL;
}

let _anthropic: AnthropicProvider | null = null;
let _openai: OpenAIProvider | null = null;

/** Provider name active right now (dashboard setting overrides env). */
export function activeProviderName(): string {
  return (store.getSetting('ai_provider') || config.ai.provider || 'openai').toLowerCase();
}

/** The provider instance to use for the current request (resolved live). */
export function activeProvider(): AIProvider {
  if (activeProviderName() === 'anthropic') {
    _anthropic ??= new AnthropicProvider();
    return _anthropic;
  }
  _openai ??= new OpenAIProvider();
  return _openai;
}

/** Model string active right now. */
export function activeModel(): string {
  const p = activeProviderName();
  return (
    store.getSetting('ai_model') ||
    (p === 'anthropic' ? config.ai.anthropicModel : config.ai.openaiModel)
  );
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
