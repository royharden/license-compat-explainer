import type { RawLicence, Scope, Settings, Verdict } from '../../supabase/functions/_shared/core/types.ts';
import type { Split } from '../split.ts';
export interface Case {
  id: string; family: string; origin: 'author' | 'osadl'; basis: string; split: Split;
  source: 'case' | 'tree' | 'osadl'; raw: RawLicence; settings: Settings; scope: Scope;
  expected: readonly Verdict[]; expectedRuleIds?: readonly string[]; expectedChosenSide?: string | null;
  missing?: boolean;
}
export type Prediction = { status: 'ok'; verdict: Verdict; reason: string; ruleIds?: readonly string[]; chosenSide?: string | null }
  | { status: 'abstain' | 'not_run'; verdict: null; reason: string };
export interface Method { name: string; description: string; predict(c: Case): Prediction | Promise<Prediction> }
export interface ScoreRow { kind: 'verdict'; method: string; case: Case; prediction: Prediction; agreement: boolean; ruleAgreement: boolean | null; chosenSideAgreement: boolean | null }
