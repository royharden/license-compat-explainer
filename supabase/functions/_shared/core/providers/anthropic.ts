import { SYSTEM_PROMPT, userPrompt, responseBody, usage } from './types.ts';
import type { Provider, Transport } from './types.ts';
export function anthropic(model: string, transport: Transport): Provider {
  return { provider: 'anthropic', model,
    prepare(facts, maxOutputTokens) { return { provider: 'anthropic', model, maxOutputTokens,
      body: JSON.stringify({ model, max_tokens: maxOutputTokens, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: userPrompt(facts) }] }) }; },
    async complete(request) {
      const body = responseBody(await transport(request.body));
      const blocks = Array.isArray(body.content) ? body.content : [];
      const text = blocks.flatMap((b: unknown) => typeof b === 'object' && b !== null && 'type' in b && b.type === 'text' && 'text' in b && typeof b.text === 'string' ? [b.text] : []).join('');
      return { provider: 'anthropic', model: typeof body.model === 'string' ? body.model : '', text, usage: usage(body.usage, 'input_tokens', 'output_tokens') };
    },
  };
}
