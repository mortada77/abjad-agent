import OpenAI from 'openai';
import { config } from '../config.js';
import type { AIProvider, GenerateParams } from './provider.js';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI | null = null;
  private model = config.ai.openaiModel;

  constructor() {
    if (config.ai.openaiApiKey) {
      this.client = new OpenAI({
        apiKey: config.ai.openaiApiKey,
        timeout: config.ai.timeoutMs,
        maxRetries: 0,
      });
    }
  }

  isReady(): boolean {
    return this.client !== null;
  }

  notReadyReason(): string | null {
    return this.client ? null : 'OPENAI_API_KEY is not set';
  }

  async generateReply({ system, history, user }: GenerateParams): Promise<string> {
    if (!this.client) throw new Error('OpenAI provider not configured');

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      ...history.map(
        (t) =>
          ({ role: t.role, content: t.content }) as OpenAI.Chat.ChatCompletionMessageParam,
      ),
      { role: 'user', content: user },
    ];

    const res = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: config.ai.maxTokens,
      messages,
    });

    return (res.choices[0]?.message?.content ?? '').trim();
  }

  async summarize(system: string, conversationText: string): Promise<string> {
    if (!this.client) throw new Error('OpenAI provider not configured');
    const res = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: conversationText },
      ],
    });
    return (res.choices[0]?.message?.content ?? '').trim();
  }
}
