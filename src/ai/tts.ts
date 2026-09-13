import OpenAI from 'openai';
import { config } from '../config.js';
import { store } from '../db/index.js';

/** Natural TTS via OpenAI (works over HTTP, drives the head amplitude). */
let client: OpenAI | null = null;
function get(): OpenAI | null {
  if (!config.ai.openaiApiKey) return null;
  if (!client) client = new OpenAI({ apiKey: config.ai.openaiApiKey });
  return client;
}

export function ttsAvailable(): boolean {
  return Boolean(config.ai.openaiApiKey);
}

// Voice can be changed live from settings ('exec_voice'): alloy, echo, fable,
// onyx, nova, shimmer. Default is a calm natural male.
export function currentVoice(): string {
  return store.getSetting('exec_voice') || 'onyx';
}

export async function textToSpeech(text: string): Promise<Buffer | null> {
  const c = get();
  if (!c) return null;
  const res = await c.audio.speech.create({
    model: 'tts-1',
    voice: currentVoice() as any,
    input: text.slice(0, 4000),
  });
  return Buffer.from(await res.arrayBuffer());
}
