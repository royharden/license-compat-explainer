import type { Facts } from './factBlock.ts';
import { parseOutput } from './outputSchema.ts';
import type { ModelOutput } from './outputSchema.ts';
import { checkQuote } from '../quotecheck/check.ts';
import type { VerifiedQuote } from '../quotecheck/check.ts';
import { DISCLAIMER } from './disclaimer.ts';
export const GUARD_VERSION = 'quote-guard@2';
export const MODEL_LABEL = 'supplementary model prose; quotes verified; summary not checked for legal meaning';
export type Explanation = { label: 'template'; fallbackReason: string; droppedQuotes: number; disclaimer: string }
  | { label: 'model'; fallbackReason: null; summary: string; quotes: VerifiedQuote[]; droppedQuotes: number; disclaimer: string; notice: typeof MODEL_LABEL };
export const fallback = (reason: string, droppedQuotes = 0): Explanation => ({ label: 'template', fallbackReason: reason, droppedQuotes, disclaimer: DISCLAIMER });
// Closed fallback, not an SPDX catalogue: unfamiliar words/names must use the template.
// Keep this vocabulary small; changing it requires a guard/cache version bump.
const SUMMARY_PROSE = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'before', 'by', 'can', 'cannot', 'check',
  'cited', 'compatible', 'conditions', 'conflict', 'counsel', 'dependency', 'distribution',
  'facts', 'fixed', 'for', 'from', 'in', 'incompatible', 'is', 'it', 'licence', 'license',
  'may', 'needs', 'no', 'not', 'obligations', 'of', 'on', 'only', 'or', 'passage', 'passages',
  'permitted', 'please', 'prohibited', 'project', 'quotes', 'requires', 'review', 'rule',
  'rules', 'safe', 'see', 'setting', 'settings', 'ship', 'should', 'source', 'text', 'the',
  'these', 'this', 'to', 'under', 'use', 'verified', 'with',
]);
const SUMMARY_OPERATORS = new Set(['AND', 'OR', 'WITH']);
function summaryVocabularyAllowed(summary: string, facts: Facts): boolean {
  // Consume every character. Dots/hyphens inside a name stay in that exact token;
  // the final alternative catches unsupported characters rather than skipping them.
  const tokens = summary.match(/[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*|[ \t\r\n.,;:!?()'"]+|[\s\S]/g) ?? [];
  let hasWord = false;
  for (const token of tokens) {
    if (/^[ \t\r\n.,;:!?()'"]+$/.test(token)) continue;
    hasWord = true;
    if (!facts.licenceIds.includes(token) && !SUMMARY_OPERATORS.has(token) && !SUMMARY_PROSE.has(token.toLowerCase())) return false;
  }
  return hasWord;
}
// Polarity checks are heuristic, not semantic/legal verification. Failures use the template.
export function summaryAllowed(summary: string, facts: Facts): boolean {
  if (!summaryVocabularyAllowed(summary, facts)) return false;
  if (/\b(guaranteed|legally safe|no obligations|ignore (?:the )?licen[cs]e|override|definitely lawful)\b/i.test(summary)) return false;
  const positive = /\b(compatible|permitted|safe to (?:use|ship)|no conflict)\b/i.test(summary);
  const negative = /\b(incompatible|conflict|prohibited|cannot (?:use|ship)|not compatible)\b/i.test(summary);
  if (facts.evaluation.verdict === 'conflict' && positive) return false;
  if (['ok','ok_with_conditions'].includes(facts.evaluation.verdict) && negative) return false;
  if (['needs_review','unknown'].includes(facts.evaluation.verdict) && (positive || /\bprohibited\b/i.test(summary))) return false;
  return true;
}
export function guardOutput(value: unknown, facts: Facts): Explanation {
  const output = parseOutput(value);
  if (!output) return fallback('invalid_output_schema');
  if (!summaryAllowed(output.summary, facts)) return fallback('summary_guard');
  const quotes = output.quotes.flatMap(q => { const v = checkQuote(q, facts.passages); return v ? [v] : []; });
  const droppedQuotes = output.quotes.length - quotes.length;
  if (!quotes.length) return fallback('no_verified_quotes', droppedQuotes);
  return { label: 'model', fallbackReason: null, summary: output.summary, quotes, droppedQuotes, disclaimer: DISCLAIMER, notice: MODEL_LABEL };
}
export function guardedOutput(result: Explanation): ModelOutput | null {
  return result.label === 'model' ? { summary: result.summary, quotes: result.quotes.map(q => ({ passage_id: q.passage_id, text: q.text })) } : null;
}
