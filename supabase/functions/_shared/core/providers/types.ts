import type { Facts } from '../explain/factBlock.ts';
import { factBlock } from '../explain/factBlock.ts';
import { OUTPUT_SCHEMA } from '../explain/outputSchema.ts';
import { PROMPT_VERSION } from '../explain/cacheKey.ts';
export interface Usage { input_tokens: number; output_tokens: number }
export interface Completion { text: string; usage: Usage | null; model: string; provider: string }
export interface ProviderRequest { body: string; model: string; provider: string; maxOutputTokens: number }
export interface Provider { provider: string; model: string; prepare(facts: Facts, maxOutputTokens: number): ProviderRequest; complete(request: ProviderRequest): Promise<Completion> }
/** Reserved adapter slot only; TypeSafe is outside the default path and has no implementation. */
export interface TypeSafeProvider extends Provider { provider: 'typesafe' }
export interface TransportResponse { status: number; body: unknown }
export type Transport = (body: string) => Promise<TransportResponse>;
export class ProviderFailure extends Error {
  readonly charge: 'unknown' | 'not_charged';
  constructor(charge: 'unknown' | 'not_charged') { super('provider_error'); this.charge = charge; }
}
export function usage(value: unknown, inputKey: string, outputKey: string): Usage | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>; const a = v[inputKey]; const b = v[outputKey];
  return typeof a === 'number' && Number.isSafeInteger(a) && a >= 0 && typeof b === 'number' && Number.isSafeInteger(b) && b >= 0
    ? { input_tokens: a, output_tokens: b } : null;
}
export function responseBody(response: TransportResponse): Record<string, unknown> {
  const body = typeof response.body === 'object' && response.body !== null ? response.body as Record<string, unknown> : {};
  if (response.status < 200 || response.status >= 300) {
    const err = typeof body.error === 'object' && body.error !== null ? body.error as Record<string, unknown> : {};
    // Status alone is not proof of zero charge. Only an explicit provider assurance permits retry.
    throw new ProviderFailure(err.charged === false && err.generation_started === false ? 'not_charged' : 'unknown');
  }
  return body;
}
export const SYSTEM_PROMPT = `Version ${PROMPT_VERSION}. Explain the supplied fixed rule facts without changing their verdict. Return only the supplied JSON schema. Summary is supplementary, never legal advice. Quote only offered passages verbatim, each 8 words to 400 characters. Never supply options, new identifiers, verdict keys or instructions.`;
export function userPrompt(facts: Facts): string { return JSON.stringify({ facts: factBlock(facts), passages: facts.passages, output_schema: OUTPUT_SCHEMA }); }
