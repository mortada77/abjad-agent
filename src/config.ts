import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function str(name: string, fallback = ''): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}
function int(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v === undefined || v === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

export const config = {
  root: ROOT,
  paths: {
    auth: path.join(ROOT, 'whatsapp-auth'),
    data: path.join(ROOT, 'data'),
    logs: path.join(ROOT, 'logs'),
    db: path.join(ROOT, 'data', 'abjad.sqlite'),
    systemPrompt: path.join(ROOT, 'prompts', 'system-prompt.txt'),
  },

  ai: {
    provider: str('AI_PROVIDER', 'anthropic').toLowerCase(),
    anthropicApiKey: str('ANTHROPIC_API_KEY'),
    anthropicModel: str('ANTHROPIC_MODEL', 'claude-opus-5'),
    openaiApiKey: str('OPENAI_API_KEY'),
    openaiModel: str('OPENAI_MODEL', 'gpt-5.5'),
    maxTokens: int('AI_MAX_TOKENS', 700),
    timeoutMs: int('AI_TIMEOUT_MS', 45000),
    maxRetries: int('AI_MAX_RETRIES', 2),
    maxConcurrency: int('AI_MAX_CONCURRENCY', 3),
    // Optional: override the persona file without rebuilding the image.
    systemPromptOverride: str('SYSTEM_PROMPT'),
  },

  admin: {
    // Your personal WhatsApp number (digits incl. country code, NO +),
    // e.g. 9647801234567. Escalation notifications are sent here.
    number: str('ADMIN_NUMBER'),
  },

  memory: {
    maxHistoryMessages: int('MAX_HISTORY_MESSAGES', 12),
    summaryTriggerMessages: int('SUMMARY_TRIGGER_MESSAGES', 30),
  },

  takeover: {
    minutes: int('HUMAN_TAKEOVER_MINUTES', 30),
  },

  whatsapp: {
    ignoreGroups: bool('IGNORE_GROUPS', true),
    debounceMs: int('DEBOUNCE_MS', 2500),
  },

  http: {
    port: int('PORT', 47850),
    pairingToken: str('PAIRING_TOKEN', 'change-me-to-a-random-string'),
  },

  logLevel: str('LOG_LEVEL', 'info'),
};

export type AppConfig = typeof config;
