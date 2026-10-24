// JSON export: engine output and independently classified review events. A ruling is an overlay.

import { OSADL_ATTRIBUTION } from '../data/osadlAttribution.ts';
import type { AnalysisResult, Finding } from '../types.ts';
import { ACKNOWLEDGEMENTS_LABEL } from '../types.ts';
import { DISCLAIMER, TEMPLATE_LABEL } from '../explain/disclaimer.ts';
import type { Ruling } from '../rulings/key.ts';
import { classifyRuling, compareRulings, replayRulings } from '../rulings/replay.ts';
import type { RulingStatus } from '../rulings/replay.ts';
import type { Explanation } from '../explain/guard.ts';

export const EXPORT_FORMAT = 'license-compat-explainer/report@1';

export interface JsonExportFinding extends Finding {
  explanation: Explanation;
}

export interface JsonExport {
  format: typeof EXPORT_FORMAT;
  generatedAt: string;
  osadlAttribution: string;
  disclaimer: string;
  rulesEdition: string;
  rulesStub: boolean;
  settings: AnalysisResult['settings'];
  acknowledgementsLabel: string;
  settingsHash: string;
  input: AnalysisResult['input'];
  counts: AnalysisResult['counts'];
  fallbackCount: number;
  coverageGaps: AnalysisResult['coverageGaps'];
  warnings: AnalysisResult['warnings'];
  findings: JsonExportFinding[];
  projectKey: string;
  rulings: ExportRuling[];
  notes: string[];
}

export interface ExportRuling {
  event: Ruling;
  status: RulingStatus | 'not_in_report';
  differences: string[];
  latest: boolean;
  applied: boolean;
}

export function buildJsonExport(result: AnalysisResult, generatedAt: string, projectKey = result.input.rootName ?? 'inventory', entries: readonly Ruling[] = [], explanations: Readonly<Record<string, Explanation>> = {}): JsonExport {
  const notes: string[] = [];
  if (result.rulesStub) {
    notes.push('Rules are the M1 stub table: combinations outside the implemented rules are reported as needs_review (R-FALLBACK).');
  }
  notes.push('Explanations are labelled per finding. Supplementary model summaries are not checked for legal meaning; quotations are checked against offered vendored passages.');
  notes.push('Rulings are review overlays and never change engine verdicts. Only the latest matching event may apply.');
  const latest = replayRulings(entries, projectKey, result);
  const rulings: ExportRuling[] = entries.filter((entry) => entry.project_key === projectKey.trim()).sort(compareRulings).map((event) => {
    const finding = result.findings.find((item) => item.occurrence === event.occurrence);
    const overlay = finding ? classifyRuling(event, finding, result) : null;
    const isLatest = latest.some((item) => item.ruling.id === event.id);
    return { event, status: overlay?.status ?? 'not_in_report', differences: overlay?.differences ?? ['Occurrence is absent from this report.'],
      latest: isLatest, applied: isLatest && overlay?.status === 'applicable' };
  });
  return {
    format: EXPORT_FORMAT,
    generatedAt,
    osadlAttribution: OSADL_ATTRIBUTION,
    disclaimer: DISCLAIMER,
    rulesEdition: result.rulesEdition,
    rulesStub: result.rulesStub,
    settings: result.settings,
    acknowledgementsLabel: ACKNOWLEDGEMENTS_LABEL,
    settingsHash: result.settingsHash,
    input: result.input,
    counts: result.counts,
    fallbackCount: result.fallbackCount,
    coverageGaps: result.coverageGaps,
    warnings: result.warnings,
    findings: result.findings.map((f): JsonExportFinding => ({
      ...f,
      explanation: explanations[f.findingId] ?? { label: TEMPLATE_LABEL, fallbackReason: 'not_requested', droppedQuotes: 0, disclaimer: DISCLAIMER },
    })),
    projectKey: projectKey.trim(),
    rulings,
    notes,
  };
}

export function serializeJsonExport(doc: JsonExport): string {
  return JSON.stringify(doc, null, 2) + '\n';
}
