import { factBlock } from './factBlock.ts';
import type { Facts } from './factBlock.ts';
import { canonicalJson } from '../util/canonicalJson.ts';
import { sha256Hex } from '../util/sha256.ts';
import { CORPUS_EDITION } from '../texts/index.ts';
import { OUTPUT_SCHEMA_VERSION } from './outputSchema.ts';
import { GUARD_VERSION } from './guard.ts';
export const PROMPT_VERSION = 'explain@1';
export function cacheKey(facts: Facts, provider: string, model: string, versions = { prompt: PROMPT_VERSION, output: OUTPUT_SCHEMA_VERSION, guard: GUARD_VERSION, corpus: CORPUS_EDITION }) {
  return sha256Hex(canonicalJson({ provider, model, versions, facts: factBlock(facts),
    passages: facts.passages.map(p => ({ id: p.id, hash: sha256Hex(p.text) })) }));
}
