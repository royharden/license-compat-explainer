import { VERDICTS } from '../../supabase/functions/_shared/core/types.ts';
import type { ScoreRow } from './types.ts';
export const ratio = (n: number, d: number): number | null => d ? n / d : null;
export function verdictMetrics(rows: readonly ScoreRow[]) {
  return [...new Set(rows.map(r => `${r.method}|${r.case.origin}`))].sort().map(key => {
    const selected = rows.filter(r => `${r.method}|${r.case.origin}` === key);
    const predicted = selected.filter(r => r.prediction.status === 'ok');
    const single = predicted.filter(r => r.case.expected.length === 1);
    const confusion: Record<string, Record<string, number>> = {};
    // Multi-label OSADL Yes/Same is not silently collapsed into one five-class gold verdict.
    for (const expected of VERDICTS) confusion[expected] = Object.fromEntries([...VERDICTS, 'abstain', 'not_run'].map(v => [v, 0]));
    const labelSetConfusion: Record<string, Record<string, number>> = {};
    for (const r of selected) {
      const truth = r.case.expected.join('|'); const actual = r.prediction.verdict ?? r.prediction.status;
      labelSetConfusion[truth] ??= {};
      labelSetConfusion[truth][actual] = (labelSetConfusion[truth][actual] ?? 0) + 1;
      if (r.case.expected.length === 1) confusion[r.case.expected[0]][actual]++;
    }
    const tp = predicted.filter(r => r.prediction.verdict === 'conflict' && r.case.expected.includes('conflict')).length;
    const fp = predicted.filter(r => r.prediction.verdict === 'conflict' && !r.case.expected.includes('conflict')).length;
    const fn = selected.filter(r => r.case.expected.includes('conflict') && r.prediction.verdict !== 'conflict').length;
    const ruled = selected.filter(r => r.ruleAgreement !== null); const chosen = selected.filter(r => r.chosenSideAgreement !== null);
    return { method: selected[0].method, origin: selected[0].case.origin,
      status: predicted.length ? 'predicted' : selected.some(r => r.prediction.status === 'not_run') ? 'not_run' : 'abstained',
      total: selected.length, predicted: predicted.length,
      abstentions: selected.filter(r => r.prediction.status === 'abstain').length, not_run: selected.filter(r => r.prediction.status === 'not_run').length,
      coverage: ratio(predicted.length, selected.length), agreementAllCases: predicted.length ? ratio(selected.filter(r => r.agreement).length, selected.length) : null,
      agreementWhenPredicted: ratio(predicted.filter(r => r.agreement).length, predicted.length), singleGoldCasesPredicted: single.length,
      conflict: { tp, fp, fn, precision: ratio(tp, tp + fp), recallIncludingAbstentions: predicted.length ? ratio(tp, tp + fn) : null },
      rulesAgreement: ratio(ruled.filter(r => r.ruleAgreement).length, ruled.length), chosenSideAgreement: ratio(chosen.filter(r => r.chosenSideAgreement).length, chosen.length),
      unknownPredictions: predicted.filter(r => r.prediction.verdict === 'unknown').length,
      fallbackPredictions: predicted.filter(r => r.prediction.status === 'ok' && r.prediction.ruleIds?.includes('R-FALLBACK')).length,
      confusionSingleGold: confusion, labelSetConfusion,
      abstentionReasons: Object.fromEntries([...new Set(selected.filter(r => r.prediction.status !== 'ok').map(r => r.prediction.reason))].map(reason => [reason, selected.filter(r => r.prediction.status !== 'ok' && r.prediction.reason === reason).length])),
    };
  });
}
