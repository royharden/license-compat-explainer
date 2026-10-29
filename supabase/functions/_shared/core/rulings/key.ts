import type { AnalysisResult, Finding, Settings, Verdict } from '../types.ts';
import { settingsHash, validateSettings } from '../settings.ts';
import { canonicalJson } from '../util/canonicalJson.ts';

export type RulingAction = 'accept' | 'waive' | 'follow-up';
export type RulingKind = 'acceptance' | 'licence_waiver' | 'follow_up';
export interface Ruling {
  id: string;
  project_key: string;
  occurrence: string;
  ecosystem: 'npm' | 'csv';
  package: string;
  version: string;
  location: string | null;
  ordinal: number | null;
  source_row: number | null;
  expr_hash: string;
  settings_hash: string;
  rules_edition: string;
  kind: RulingKind;
  action: RulingAction;
  reason: string;
  engine_verdict: Verdict;
  rule_id: string;
  settings: Settings;
  created_at: string;
}

export const RULING_KINDS: Record<RulingAction, RulingKind> = {
  accept: 'acceptance', waive: 'licence_waiver', 'follow-up': 'follow_up',
};
export function rulingKey(projectKey: string, occurrence: string): string {
  return canonicalJson([projectKey.trim(), occurrence]);
}
export function validateReason(action: RulingAction, reason: string): string | null {
  if (Array.from(reason).length > 500) return 'Reason must be at most 500 characters.';
  if (action === 'waive' && reason.trim() === '') return 'A waiver requires a non-blank reason.';
  return null;
}
export function createRuling(input: {
  id: string; createdAt: string; projectKey: string; finding: Finding; result: AnalysisResult;
  action: RulingAction; reason: string;
}): Ruling {
  const { finding: f, result, action } = input;
  const error = validateReason(action, input.reason);
  if (error) throw new Error(error);
  const projectKey = input.projectKey.trim();
  if (!projectKey || projectKey.length > 200) throw new Error('Project key must contain 1–200 characters.');
  return {
    id: input.id, project_key: projectKey, occurrence: f.occurrence, ecosystem: f.source,
    package: f.name, version: f.version, location: f.location, ordinal: f.ordinal, source_row: f.sourceRow,
    expr_hash: f.exprHash, settings_hash: result.settingsHash, rules_edition: result.rulesEdition,
    kind: RULING_KINDS[action], action, reason: input.reason.trim(), engine_verdict: f.verdict,
    rule_id: f.ruleIds.join(' + '), settings: { ...result.settings, acknowledgements: { ...result.settings.acknowledgements } },
    created_at: input.createdAt,
  };
}

/** Boundary validator shared by browser storage and account rows. Never trust a saved overlay. */
export function parseRuling(value: unknown): Ruling | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const stringFields = ['id', 'project_key', 'occurrence', 'package', 'version', 'expr_hash', 'settings_hash',
    'rules_edition', 'kind', 'action', 'reason', 'engine_verdict', 'rule_id', 'created_at'] as const;
  if (stringFields.some((key) => typeof v[key] !== 'string')) return null;
  if (v.ecosystem !== 'npm' && v.ecosystem !== 'csv') return null;
  if (v.location !== null && typeof v.location !== 'string') return null;
  for (const key of ['ordinal', 'source_row']) {
    if (v[key] !== null && (typeof v[key] !== 'number' || !Number.isInteger(v[key]) || Number(v[key]) < 1)) return null;
  }
  const action = v.action as RulingAction;
  if (!['accept', 'waive', 'follow-up'].includes(action) || v.kind !== RULING_KINDS[action]) return null;
  if (validateReason(action, String(v.reason))) return null;
  if (!['ok', 'ok_with_conditions', 'conflict', 'needs_review', 'unknown'].includes(String(v.engine_verdict))) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v.id))) return null;
  if (!String(v.project_key).trim() || String(v.project_key).length > 200) return null;
  if (!/^[0-9a-f]{64}$/.test(String(v.expr_hash)) || !/^[0-9a-f]{64}$/.test(String(v.settings_hash))) return null;
  if (!Number.isFinite(Date.parse(String(v.created_at)))) return null;
  const settings = validateSettings(v.settings);
  if (!settings || settingsHash(settings) !== v.settings_hash) return null;
  const expectedOccurrence = v.ecosystem === 'npm'
    ? `npm:${String(v.package)}@${String(v.version)}|${String(v.location ?? '')}`
    : `csv:${String(v.package)}@${String(v.version)}#${String(v.ordinal)}`;
  if (v.occurrence !== expectedOccurrence || (v.ecosystem === 'csv' && v.ordinal === null)) return null;
  // Pick explicit fields; account metadata (user_id) never enters the local intent record.
  return {
    id: String(v.id), project_key: String(v.project_key), occurrence: expectedOccurrence, ecosystem: v.ecosystem,
    package: String(v.package), version: String(v.version), location: v.location as string | null,
    ordinal: v.ordinal as number | null, source_row: v.source_row as number | null,
    expr_hash: String(v.expr_hash), settings_hash: String(v.settings_hash), rules_edition: String(v.rules_edition),
    kind: RULING_KINDS[action], action, reason: String(v.reason), engine_verdict: v.engine_verdict as Verdict,
    rule_id: String(v.rule_id), settings, created_at: new Date(String(v.created_at)).toISOString(),
  };
}
