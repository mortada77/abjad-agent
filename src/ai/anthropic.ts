import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import type { AIProvider, GenerateParams } from './provider.js';

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private client: Anthropic | null = null;
  private model = config.ai.anthropicModel;

  constructor() {
    if (config.ai.anthropicApiKey) {
      this.client = new Anthropic({
        apiKey: config.ai.anthropicApiKey,
        timeout: config.ai.timeoutMs,
        maxRetries: 0, // we handle retries ourselves in the processor
      });
    }
  }

  isReady(): boolean {
    return this.client !== null;
  }

  notReadyReason(): string | null {
    return this.client ? null : 'ANTHROPIC_API_KEY is not set';
  }

  async generateReply({ system, history, user }: GenerateParams): Promise<string> {
    if (!this.client) throw new Error('Anthropic provider not configured');

    const messages: Anthropic.MessageParam[] = [
      ...history.map((t) => ({ role: t.role, content: t.content }) as Anthropic.MessageParam),
      { role: 'user', content: user },
    ];

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: config.ai.maxTokens,
      system,
      messages,
    });

    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  }

  async summarize(system: string, conversationText: string): Promise<string> {
    if (!this.client) throw new Error('Anthropic provider not configured');
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: conversationText }],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  }
}
