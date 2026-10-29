import { describe, it, expect } from 'vitest';
import { anthropic } from '../supabase/functions/_shared/core/providers/anthropic.ts';
import { openaiCompatible } from '../supabase/functions/_shared/core/providers/openaiCompatible.ts';
import { mockProvider } from '../supabase/functions/_shared/core/providers/mock.ts';
import { ProviderFailure, responseBody } from '../supabase/functions/_shared/core/providers/types.ts';
import { factsFor, mockFixtures } from './explain.helpers.ts';
describe('M4 providers (injected transports only)', () => {
  it('anthropic serialized body contains full system, facts, passages, schema and hard output parameter', async () => {
    const p = anthropic('owner-selected', async () => ({ status: 200, body: { model: 'owner-selected', content: [{ type: 'text', text: '{}' }], usage: { input_tokens: 4, output_tokens: 2 } } }));
    const req = p.prepare(factsFor(), 200); const body = JSON.parse(req.body) as { max_tokens: number; system: string; messages: { content: string }[] };
    expect(body.max_tokens).toBe(200); expect(body.system).toContain('Return only'); expect(body.messages[0].content).toContain('output_schema');
    expect(body.messages[0].content).toContain('GPL-3.0-only#s5'); expect(body.messages[0].content).not.toContain('private-package');
    expect((await p.complete(req)).usage).toEqual({ input_tokens: 4, output_tokens: 2 });
  });
  it('OpenAI-compatible serialized body includes strict schema and maps usage', async () => {
    const p = openaiCompatible('owner-selected', async () => ({ status: 200, body: { model: 'owner-selected', choices: [{ message: { content: '{}' } }], usage: { prompt_tokens: 4, completion_tokens: 2 } } }));
    const req = p.prepare(factsFor(), 200); expect(req.body).toContain('json_schema'); expect(req.body).toContain('max_tokens');
    expect((await p.complete(req)).usage).toEqual({ input_tokens: 4, output_tokens: 2 });
  });
  it('429/503 status without explicit noncharge proof is unknown; proven failure permits one service retry', () => {
    for (const status of [429,503]) {
      try { responseBody({ status, body: { error: { message: 'retry later' } } }); throw new Error('expected rejection'); }
      catch (error) { expect(error).toBeInstanceOf(ProviderFailure); expect((error as ProviderFailure).charge).toBe('unknown'); }
    }
    try { responseBody({ status: 429, body: { error: { charged: false, generation_started: false } } }); }
    catch (error) { expect((error as ProviderFailure).charge).toBe('not_charged'); }
  });
  it('mock replays readable fixture keys without a provider transport', async () => {
    const p = mockProvider('demo', mockFixtures()); const req = p.prepare(factsFor(), 200);
    expect(JSON.parse(req.body).key).toBe('R-DIST-STRONG__demo');
    expect(JSON.parse((await p.complete(req)).text)).toEqual(mockFixtures()['R-DIST-STRONG__demo']);
  });
});
