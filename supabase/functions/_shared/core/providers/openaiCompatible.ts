import { SYSTEM_PROMPT, userPrompt, responseBody, usage } from './types.ts';
import type { Provider, Transport } from './types.ts';
import { OUTPUT_SCHEMA } from '../explain/outputSchema.ts';
export function openaiCompatible(model: string, transport: Transport): Provider {
  return { provider: 'openai_compatible', model,
    prepare(facts, maxOutputTokens) { return { provider: 'openai_compatible', model, maxOutputTokens,
      body: JSON.stringify({ model, max_tokens: maxOutputTokens, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt(facts) }],
        response_format: { type: 'json_schema', json_schema: { name: 'explanation', strict: true, schema: OUTPUT_SCHEMA } } }) }; },
    async complete(request) {
      const body = responseBody(await transport(request.body));
      const choice = Array.isArray(body.choices) ? body.choices[0] as { message?: { content?: unknown } } | undefined : undefined;
      return { provider: 'openai_compatible', model: typeof body.model === 'string' ? body.model : '', text: typeof choice?.message?.content === 'string' ? choice.message.content : '',
        usage: usage(body.usage, 'prompt_tokens', 'completion_tokens') };
    },
  };
}
