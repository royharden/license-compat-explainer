// JSON export (PLAN §7.3; M1 subset). Contains settings incl. acknowledgements (labelled
// user-asserted), rules edition and stub flag, verdicts with rule ids, paths/rows, the template
// explanation label and the disclaimer. Rulings arrive in M3, OSADL attribution once the matrix is
// vendored (M2/M3); neither is claimed here before it exists.

import type { AnalysisResult, Finding } from '../types.ts';
import { ACKNOWLEDGEMENTS_LABEL } from '../types.ts';
import { DISCLAIMER, TEMPLATE_LABEL } from '../explain/disclaimer.ts';

export const EXPORT_FORMAT = 'license-compat-explainer/report@1';

export interface JsonExportFinding extends Finding {
  explanation: { label: typeof TEMPLATE_LABEL; fallbackReason: 'explanations_not_built' };
}

export interface JsonExport {
  format: typeof EXPORT_FORMAT;
  generatedAt: string;
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
  rulings: [];
  notes: string[];
}

export function buildJsonExport(result: AnalysisResult, generatedAt: string): JsonExport {
  const notes: string[] = [];
  if (result.rulesStub) {
    notes.push('Rules are the M1 stub table: combinations outside the implemented rules are reported as needs_review (R-FALLBACK).');
  }
  notes.push('Explanations are rule-table templates; no model was called.');
  return {
    format: EXPORT_FORMAT,
    generatedAt,
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
      explanation: { label: TEMPLATE_LABEL, fallbackReason: 'explanations_not_built' },
    })),
    rulings: [],
    notes,
  };
}

export function serializeJsonExport(doc: JsonExport): string {
  return JSON.stringify(doc, null, 2) + '\n';
}
