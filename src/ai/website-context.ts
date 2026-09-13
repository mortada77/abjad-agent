import { logger } from '../logger.js';

const WEBSITE_URL = 'https://abjadkitchen.online';
const CACHE_MS = 15 * 60_000;
const MAX_CHARS = 12_000;

let cached = '';
let cachedAt = 0;

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(?:x27|39);/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS);
}

/** Fresh, bounded product knowledge from Abjad's official website. */
export async function getWebsiteContext(): Promise<string> {
  if (cached && Date.now() - cachedAt < CACHE_MS) return cached;
  try {
    const response = await fetch(WEBSITE_URL, {
      headers: { 'user-agent': 'Abjad-Agi/1.0 (+product-knowledge)' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = cleanHtml(await response.text());
    if (text.length < 200) throw new Error('website content was unexpectedly short');
    cached = text;
    cachedAt = Date.now();
  } catch (err) {
    logger.warn('[WEBSITE] Failed to refresh product knowledge: %s', (err as Error).message);
  }

  return cached
    ? `\n\n## معلومات محدثة من الموقع الرسمي (${WEBSITE_URL})\n${cached}`
    : '\n\n## حالة الموقع الرسمي\nتعذر جلب الموقع حالياً. لا تخمّن سعراً أو ميزة؛ صعّد فقط السؤال الذي لا تملك له جواباً.';
}
