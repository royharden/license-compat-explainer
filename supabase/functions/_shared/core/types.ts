// Shared types for the analysis core (PLAN §1-§4).
// Pure TypeScript, zero dependencies, erasable syntax only (no enum/namespace/parameter properties),
// so the same file runs in the browser worker, Node (vitest/tsx) and Deno.

import type { RuleId } from './rules/ruleIds.ts';

export type { RuleId };

// ---------------------------------------------------------------- verdicts and settings

export type Verdict = 'ok' | 'ok_with_conditions' | 'conflict' | 'needs_review' | 'unknown';

export const VERDICTS: readonly Verdict[] = ['ok', 'ok_with_conditions', 'conflict', 'needs_review', 'unknown'];

export type ProjectLicence =
  | 'MIT'
  | 'Apache-2.0'
  | 'BSD-3-Clause'
  | 'MPL-2.0'
  | 'GPL-2.0-only'
  | 'GPL-3.0-only'
  | 'AGPL-3.0-only'
  | 'LicenseRef-Proprietary';

export const PROJECT_LICENCES: readonly ProjectLicence[] = [
  'MIT',
  'Apache-2.0',
  'BSD-3-Clause',
  'MPL-2.0',
  'GPL-2.0-only',
  'GPL-3.0-only',
  'AGPL-3.0-only',
  'LicenseRef-Proprietary',
];

export type Mode = 'distribute' | 'library' | 'hosted' | 'internal';

export const MODES: readonly Mode[] = ['distribute', 'library', 'hosted', 'internal'];

/** PLAN §1.5: global, user-asserted context facts; both default to false. */
export interface Acknowledgements {
  /** Dependency used as published and linked unmodified (gates Classpath/GCC exception eligibility). */
  unmodified_use: boolean;
  /** MPL file carries no Exhibit B "Incompatible With Secondary Licenses" notice (gates MPL -> GPL). */
  mpl_secondary_eligible: boolean;
}

export interface Settings {
  projectLicense: ProjectLicence;
  mode: Mode;
  bundled: boolean;
  acknowledgements: Acknowledgements;
}

export const ACKNOWLEDGEMENTS_LABEL = 'user-asserted, not verified from source';

// ---------------------------------------------------------------- inventory (inputs)

export type Scope = 'runtime' | 'dev' | 'unknown';

export type InputSource = 'npm' | 'csv';

/** Licence metadata exactly as far as the input can tell us; never guessed. */
export type RawLicence =
  | { kind: 'string'; value: string }
  | { kind: 'legacy_object'; value: string }
  | { kind: 'legacy_array'; values: string[] }
  | { kind: 'missing' }
  | { kind: 'lockfile_v1' }
  | { kind: 'invalid' };

export interface InventoryItem {
  source: InputSource;
  name: string;
  version: string;
  /** npm install location (`node_modules/a/node_modules/b`); null for CSV. */
  location: string | null;
  /** CSV record number (header record = 1); null for npm. Provenance only. */
  sourceRow: number | null;
  /** CSV: 1-based ordinal among rows with the same name@version; null for npm. */
  ordinal: number | null;
  /** Occurrence identity (PLAN §7.1): `npm:<name>@<version>|<location>` or `csv:<name>@<version>#<ordinal>`. */
  occurrence: string;
  scope: Scope;
  licence: RawLicence;
  /** Deterministic shortest path from the root, first element is the literal `root`; null when unavailable. */
  path: string[] | null;
  /** Why the path is unavailable (CSV, lockfile v1, no path from root); null when a path exists. */
  pathNote: string | null;
  /** Other dependents (in-edges from reachable nodes) beyond the one on the shown path; capped. */
  alternatePathCount: number;
}

export type CoverageGapKind =
  | 'unresolved_edge'
  | 'unresolved_optional_edge'
  | 'link_target_missing'
  | 'no_path_from_root'
  | 'csv_row_error';

export interface CoverageGap {
  kind: CoverageGapKind;
  /** Location (npm) or `row N` (CSV) where the gap was found; `""` is the root context. */
  from: string | null;
  dependency: string | null;
  detail: string;
}

export interface InputWarning {
  code: string;
  message: string;
}

export interface CsvMapping {
  name: number | null;
  version: number | null;
  licence: number | null;
  scope: number | null;
}

export interface Inventory {
  kind: 'npm-lock' | 'csv';
  lockfileVersion: number | null;
  rootName: string | null;
  rootVersion: string | null;
  items: InventoryItem[];
  coverageGaps: CoverageGap[];
  warnings: InputWarning[];
  /** CSV only: header and the mapping that was applied. */
  csv: { header: string[]; mapping: CsvMapping } | null;
}

export interface InputError {
  code: string;
  message: string;
}

export type InputResult = { ok: true; inventory: Inventory } | { ok: false; error: InputError };

// ---------------------------------------------------------------- licence catalogue and expressions

export type LicenceClass =
  | 'public_domain'
  | 'permissive'
  | 'weak_copyleft'
  | 'strong_copyleft'
  | 'network_copyleft'
  | 'source_available'
  | 'non_commercial';

export type LeafStatus = 'supported' | 'unsupported_licence' | 'unsupported_exception' | 'unresolved' | 'ambiguous';

export type ExceptionPair = 'classpath' | 'gcc';

/** One evaluable leaf: a licence id, or a resolved `id WITH exception` pair (PLAN §3.1). */
export interface LeafRef {
  /** Canonical text (`GPL-2.0-only WITH Classpath-exception-2.0`) or the raw token when unresolved. */
  text: string;
  licenceId: string | null;
  exceptionId: string | null;
  status: LeafStatus;
  /** Class of the base licence; null unless the base licence is in the catalogue. */
  licenceClass: LicenceClass | null;
  /** Set only for a modelled (base, exception) pair. */
  exceptionPair: ExceptionPair | null;
  /** Machine reason for non-supported statuses (e.g. `unrecognised_identifier`, `ambiguous`, `missing`). */
  reason: string | null;
  /** Set when this leaf was produced by `-or-later` expansion: the original leaf text. */
  expandedFrom: string | null;
}

export type ExprNode =
  | { type: 'leaf'; leaf: LeafRef }
  | { type: 'and'; children: ExprNode[] }
  | { type: 'or'; children: ExprNode[]; expandedFrom?: string };

export interface NormaliseNote {
  code: string;
  detail: string;
}

export type UnresolvedReason =
  | 'missing'
  | 'unlicensed'
  | 'see_license_in'
  | 'too_long'
  | 'expression_too_long'
  | 'parse_error'
  | 'too_deep'
  | 'invalid_type'
  | 'ambiguous'
  | 'lockfile_v1_no_licence';

export interface NormalisedLicence {
  /** Parsed and resolved expression; null when the whole licence value is unresolved. */
  expr: ExprNode | null;
  /** Canonical rendering of `expr` (ids and operators only); null when unresolved. */
  text: string | null;
  unresolvedReason: UnresolvedReason | null;
  notes: NormaliseNote[];
  /** Raw licence value for display only (bounded); never sent to a server. */
  rawDisplay: string;
}

// ---------------------------------------------------------------- rules

export type OptionId =
  | 'review_with_counsel'
  | 'review_alternative_dependency'
  | 'review_commercial_terms'
  | 'review_project_licensing'
  | 'review_separate_process'
  | 'review_unbundled_distribution';

export interface RuleRow {
  id: RuleId;
  verdict: Verdict;
  title: string;
  rationale: string;
  obligations: readonly string[];
  assumptions: readonly string[];
  options: readonly OptionId[];
  /** Passage ids (`AGPL-3.0-only#s13`); empty means template-only. Filled in M2/M4. */
  passages: readonly string[];
  /** True when this row is a placeholder of the M1 stub table. */
  stub: boolean;
}

export interface EvalContext {
  settings: Settings;
  scope: Scope;
}

export interface RuleResult {
  ruleId: RuleId;
  verdict: Verdict;
  rationale: string;
  obligations: readonly string[];
  assumptions: readonly string[];
  options: readonly OptionId[];
  passages: readonly string[];
  stub: boolean;
}

export type LeafEvaluator = (leaf: LeafRef, ctx: EvalContext) => RuleResult;

export interface LeafEvaluation {
  leafText: string;
  licenceId: string | null;
  exceptionId: string | null;
  status: LeafStatus;
  expandedFrom: string | null;
  ruleId: RuleId;
  verdict: Verdict;
  /** True when this leaf contributes to the final verdict (false for OR alternatives not chosen). */
  counted: boolean;
  stub: boolean;
}

export interface OrChoice {
  alternatives: string[];
  chosen: string;
  chosenIndex: number;
}

export interface ExpressionEvaluation {
  verdict: Verdict;
  ruleIds: RuleId[];
  leaves: LeafEvaluation[];
  orChoices: OrChoice[];
  /** The outermost OR's chosen alternative, or null when the expression has no OR. */
  chosenSide: string | null;
  obligations: string[];
  assumptions: string[];
  options: OptionId[];
}

// ---------------------------------------------------------------- findings and results

export interface Finding {
  findingId: string;
  /** Opaque reference used in explanation requests instead of the package name (PLAN §1.1). */
  depRef: string;
  occurrence: string;
  source: InputSource;
  name: string;
  version: string;
  location: string | null;
  sourceRow: number | null;
  ordinal: number | null;
  path: string[] | null;
  pathNote: string | null;
  alternatePathCount: number;
  scope: Scope;
  rawLicence: string;
  exprNormalised: string | null;
  /** sha256 of the canonical expression (or of the unresolved reason + raw value). */
  exprHash: string;
  verdict: Verdict;
  ruleIds: RuleId[];
  chosenSide: string | null;
  orChoices: OrChoice[];
  leaves: LeafEvaluation[];
  obligations: string[];
  assumptions: string[];
  options: OptionId[];
  /** Unresolved reason code when the licence value could not be resolved; otherwise null. */
  reason: string | null;
  notes: NormaliseNote[];
  /** True when any counted leaf was decided by a stub rule row. */
  stubRule: boolean;
}

export type VerdictCounts = Record<Verdict, number>;

export interface AnalysisResult {
  settings: Settings;
  settingsHash: string;
  rulesEdition: string;
  rulesStub: boolean;
  input: {
    kind: 'npm-lock' | 'csv';
    lockfileVersion: number | null;
    rootName: string | null;
    rootVersion: string | null;
    itemCount: number;
  };
  findings: Finding[];
  counts: VerdictCounts;
  /** Findings whose verdict came only from R-FALLBACK (counted separately, PLAN C§2.6 step 10). */
  fallbackCount: number;
  coverageGaps: CoverageGap[];
  warnings: InputWarning[];
}
