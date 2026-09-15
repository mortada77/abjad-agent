import OpenAI from 'openai';
import { config } from '../config.js';
import { store } from '../db/index.js';
import { logger } from '../logger.js';

/** Natural TTS via OpenAI. Works over HTTP and drives the head amplitude. */
let client: OpenAI | null = null;
function get(): OpenAI | null {
  if (!config.ai.openaiApiKey) return null;
  if (!client) client = new OpenAI({ apiKey: config.ai.openaiApiKey });
  return client;
}

export function ttsAvailable(): boolean {
  return Boolean(config.ai.openaiApiKey);
}

// Voices: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse.
export const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse'];
const DEFAULT_INSTRUCTIONS =
  'صوت أبجد التنفيذي: تحدّث باللهجة العراقية الطبيعية بصوت رجولي عميق ودافئ وهادئ، واثق وذكي من دون تكلف. الإيقاع متوسط مع وقفات قصيرة طبيعية، والنبرة ودّية راقية وليست إذاعية أو روبوتية. لا تبالغ بالحماس ولا تقرأ علامات التنسيق بصوت مسموع.';

export function getVoice(): string {
  return store.getSetting('exec_voice') || 'onyx';
}
export function getVoiceInstructions(): string {
  return store.getSetting('exec_voice_instructions') || DEFAULT_INSTRUCTIONS;
}

export async function textToSpeech(text: string): Promise<Buffer | null> {
  const c = get();
  if (!c) return null;
  const voice = getVoice();
  const input = text.slice(0, 4000);
  // Prefer the newer expressive model that supports dialect instructions.
  try {
    const res = await c.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: voice as any,
      input,
      instructions: getVoiceInstructions(),
    } as any);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logger.warn('[TTS] gpt-4o-mini-tts failed (%s), falling back to tts-1', (err as Error).message);
    const res = await c.audio.speech.create({ model: 'tts-1', voice: voice as any, input });
    return Buffer.from(await res.arrayBuffer());
  }
}
