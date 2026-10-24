import { exactKeys } from './factBlock.ts';
export const OUTPUT_SCHEMA_VERSION = 'summary-quotes@1';
export interface ModelOutput { summary: string; quotes: { passage_id: string; text: string }[] }
export const OUTPUT_SCHEMA = { type: 'object', additionalProperties: false, required: ['summary','quotes'], properties: {
  summary: { type: 'string', maxLength: 1600 }, quotes: { type: 'array', maxItems: 12, items: { type: 'object', additionalProperties: false,
    required: ['passage_id','text'], properties: { passage_id: { type: 'string', maxLength: 100 }, text: { type: 'string', maxLength: 400 } } } },
} };
export function parseOutput(value: unknown): ModelOutput | null {
  if (!exactKeys(value, ['summary','quotes']) || typeof value.summary !== 'string' || !value.summary.trim() || value.summary.length > 1600
    || !Array.isArray(value.quotes) || value.quotes.length > 12) return null;
  if (!value.quotes.every(q => exactKeys(q, ['passage_id','text']) && typeof q.passage_id === 'string' && q.passage_id.length <= 100
    && typeof q.text === 'string' && q.text.length <= 400)) return null;
  return value as unknown as ModelOutput;
}
