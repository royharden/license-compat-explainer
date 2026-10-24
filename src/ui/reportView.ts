// Pure view helpers for the flat M1 report (grouping by verdict arrives in M3).

import type { AnalysisResult, Finding, Settings, Verdict } from '@core/types.ts';
import { ACKNOWLEDGEMENTS_LABEL } from '@core/types.ts';

export const VERDICT_LABELS: Readonly<Record<Verdict, string>> = {
  conflict: 'conflict',
  needs_review: 'needs review',
  unknown: 'unknown',
  ok_with_conditions: 'ok with conditions',
  ok: 'ok',
};

/** Display order: the findings that need attention first. */
export const VERDICT_DISPLAY_ORDER: readonly Verdict[] = ['conflict', 'needs_review', 'unknown', 'ok_with_conditions', 'ok'];

export function sortFindings(findings: readonly Finding[]): Finding[] {
  const rank = (v: Verdict): number => VERDICT_DISPLAY_ORDER.indexOf(v);
  return [...findings].sort((a, b) => {
    const r = rank(a.verdict) - rank(b.verdict);
    if (r !== 0) return r;
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    return (a.location ?? '').localeCompare(b.location ?? '') || (a.sourceRow ?? 0) - (b.sourceRow ?? 0);
  });
}

export function formatPath(finding: Finding): string {
  if (finding.path) {
    const base = finding.path.join(' > ');
    return finding.alternatePathCount > 0
      ? `${base} (+${finding.alternatePathCount} other dependent${finding.alternatePathCount === 1 ? '' : 's'})`
      : base;
  }
  return finding.pathNote ?? 'path unavailable';
}

export function formatWhere(finding: Finding): string {
  if (finding.source === 'csv') return `row ${finding.sourceRow ?? '?'}`;
  return finding.location ?? '';
}

export function formatSettings(settings: Settings): string {
  return `project ${settings.projectLicense} · mode ${settings.mode} · bundled ${settings.bundled ? 'yes' : 'no'}`;
}

export function formatAcknowledgements(settings: Settings): string {
  const a = settings.acknowledgements;
  return `unmodified_use: ${a.unmodified_use ? 'acknowledged' : 'not acknowledged'} · mpl_secondary_eligible: ${
    a.mpl_secondary_eligible ? 'acknowledged' : 'not acknowledged'
  } (${ACKNOWLEDGEMENTS_LABEL})`;
}

export function summaryLine(result: AnalysisResult): string {
  const parts = VERDICT_DISPLAY_ORDER.map((v) => `${result.counts[v]} ${VERDICT_LABELS[v]}`);
  return `${result.findings.length} findings: ${parts.join(', ')}`;
}

export function exportFileName(result: AnalysisResult, extension: 'json'): string {
  const base = (result.input.rootName ?? 'inventory').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60) || 'inventory';
  return `${base}.licence-report.${extension}`;
}
