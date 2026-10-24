import type { AnalysisResult, Finding, Settings } from '../types.ts';
import type { Ruling } from './key.ts';
import { rulingKey } from './key.ts';

export type RulingStatus = 'applicable' | 'stale' | 'different_settings';
export interface RulingOverlay {
  occurrence: string;
  ruling: Ruling;
  status: RulingStatus;
  differences: string[];
}
export function settingsDifferences(before: Settings, after: Settings): string[] {
  const differences: string[] = [];
  for (const key of ['projectLicense', 'mode', 'bundled'] as const) {
    if (before[key] !== after[key]) differences.push(`${key}: ${String(before[key])} → ${String(after[key])}`);
  }
  for (const key of ['unmodified_use', 'mpl_secondary_eligible'] as const) {
    if (before.acknowledgements[key] !== after.acknowledgements[key]) {
      differences.push(`${key}: ${String(before.acknowledgements[key])} → ${String(after.acknowledgements[key])}`);
    }
  }
  return differences;
}
export function compareRulings(a: Ruling, b: Ruling): number {
  return Date.parse(a.created_at) - Date.parse(b.created_at) || (a.id < b.id ? -1 : a.id === b.id ? 0 : 1);
}
export function classifyRuling(ruling: Ruling, finding: Finding, result: AnalysisResult): RulingOverlay {
  const differences = settingsDifferences(ruling.settings, result.settings);
  if (ruling.rules_edition !== result.rulesEdition) differences.push(`rules edition: ${ruling.rules_edition} → ${result.rulesEdition}`);
  if (ruling.settings_hash !== result.settingsHash && differences.length === 0) differences.push('settings hash changed');
  const status: RulingStatus = ruling.expr_hash !== finding.exprHash ? 'stale'
    : differences.length > 0 ? 'different_settings' : 'applicable';
  return { occurrence: finding.occurrence, ruling, status, differences };
}
/** Returns overlays only; neither a Finding nor its engine verdict is modified. */
export function replayRulings(entries: readonly Ruling[], projectKey: string, result: AnalysisResult): RulingOverlay[] {
  const latest = new Map<string, Ruling>();
  for (const ruling of entries) {
    if (ruling.project_key !== projectKey.trim()) continue;
    const key = rulingKey(ruling.project_key, ruling.occurrence);
    const previous = latest.get(key);
    if (!previous || compareRulings(previous, ruling) < 0) latest.set(key, ruling);
  }
  return result.findings.flatMap((finding) => {
    const ruling = latest.get(rulingKey(projectKey, finding.occurrence));
    return ruling ? [classifyRuling(ruling, finding, result)] : [];
  });
}
