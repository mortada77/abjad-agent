import OpenAI from 'openai';
import { config } from '../config.js';
import { store } from '../db/index.js';
import type { AIProvider, GenerateParams, RunToolsParams, RunToolsResult } from './provider.js';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI | null = null;

  /** Model resolved live from the dashboard setting, else the env default. */
  private get model(): string {
    return store.getSetting('ai_model') || config.ai.openaiModel;
  }

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
      // Reasoning models can consume part of this budget before emitting text.
      max_completion_tokens: Math.max(config.ai.maxTokens, 1200),
      ...(/^(gpt-5|o[134])/.test(this.model) ? { reasoning_effort: 'low' } : {}),
      messages,
    } as any);

    return (res.choices[0]?.message?.content ?? '').trim();
  }

  async summarize(system: string, conversationText: string): Promise<string> {
    if (!this.client) throw new Error('OpenAI provider not configured');
    const res = await this.client.chat.completions.create({
      model: this.model,
      max_completion_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: conversationText },
      ],
    } as any);
    return (res.choices[0]?.message?.content ?? '').trim();
  }

  async runWithTools(p: RunToolsParams): Promise<RunToolsResult> {
    if (!this.client) throw new Error('OpenAI provider not configured');
    const tools: OpenAI.Chat.ChatCompletionTool[] = p.tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters as any },
    }));
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: p.system },
      ...p.history.map((h) => ({ role: h.role, content: h.content }) as OpenAI.Chat.ChatCompletionMessageParam),
      { role: 'user', content: p.user },
    ];
    const toolsUsed: string[] = [];
    const maxRounds = p.maxRounds ?? 5;

    for (let round = 0; round < maxRounds; round++) {
      const res = await this.client.chat.completions.create({
        model: this.model,
        max_completion_tokens: Math.max(config.ai.maxTokens, 1400),
        ...(/^(gpt-5|o[134])/.test(this.model) ? { reasoning_effort: 'low' } : {}),
        messages,
        tools,
        tool_choice: 'auto',
      } as any);
      const msg = res.choices[0]?.message;
      if (!msg) break;
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push(msg);
        for (const call of msg.tool_calls) {
          const fn = (call as any).function;
          if (!fn) continue;
          let args: any = {};
          try {
            args = fn.arguments ? JSON.parse(fn.arguments) : {};
          } catch {
            args = {};
          }
          toolsUsed.push(fn.name);
          p.onToolStart?.(fn.name, args);
          let result: any;
          try {
            result = await p.execute(fn.name, args);
          } catch (err) {
            result = { error: (err as Error).message };
          }
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result ?? {}),
          });
        }
        continue; // let the model read tool results
      }
      return { text: (msg.content ?? '').trim(), toolsUsed };
    }
    return { text: 'وصلت للحد الأقصى من الخطوات بدون نتيجة نهائية.', toolsUsed };
  }
}
