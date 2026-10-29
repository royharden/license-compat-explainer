import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ScoreRow, Method } from './types.ts';
import type { TreeCheck } from './cases.ts';
import type { Split } from '../split.ts';
import type { verdictMetrics } from './metrics.ts';
type Metrics = ReturnType<typeof verdictMetrics>;
const display = (n: number | null): string => n === null ? 'not measured (zero denominator)' : String(n);
export function writeResults(root: string, split: Split, metadata: Record<string, unknown>, methods: readonly Method[], rows: readonly ScoreRow[], metrics: Metrics, treeChecks: TreeCheck[], other: unknown[]) {
  const markdown = [
    `# Evaluation results: ${split}`, '', `Generated from run ${String(metadata.run_id)}. Labels are metadata-based compatibility interpretations, not legal advice.`, '',
    'OSADL and author strata are reported separately. Author cases and synthetic trees are partly true by construction; they do not establish legal accuracy. OSADL Yes/Same accepts either ok or ok_with_conditions. No disagreements are excluded.', '',
    '| Method | Origin | Status | Cases | Predicted | Abstain | Not run | Coverage | Agreement (all cases) | Conflict precision | Conflict recall (including abstentions) |',
    '|---|---|---|---:|---:|---:|---:|---|---|---|---|',
    ...metrics.map(m => `| ${m.method} | ${m.origin} | ${m.status} | ${m.total} | ${m.predicted} | ${m.abstentions} | ${m.not_run} | ${display(m.coverage)} | ${display(m.agreementAllCases)} | ${display(m.conflict.precision)} | ${display(m.conflict.recallIncludingAbstentions)} |`), '',
    'Five-class confusion excludes set-valued gold labels; label-set confusion retains every row. Both are in results.jsonl. Unknown is an actual verdict, distinct from adapter abstention or not_run. Coverage counts any emitted verdict, including unknown; inspect unknown/fallback counts alongside it.', '',
    ...methods.map(m => `- ${m.name}: ${m.description}`), '',
    'Tree reader coverage/path/scope integrity, per-case rule/OR-side agreement, normaliser observations and explanation metrics are included below. No mock cost/latency implies live performance. No summary legal-meaning or helpfulness score is inferred.', '',
    '```json', JSON.stringify({ metadata, treeChecks, metrics, additional: other }, null, 2), '```', '',
  ].join('\n');
  const jsonl = [ { kind: 'metadata', ...metadata }, ...metrics.map(m => ({ kind: 'verdict_metrics', ...m })), ...treeChecks, ...rows, ...other ].map(row => JSON.stringify(row)).join('\n')+'\n';
  const results = join(root, 'results'); const directory = join(results, split); mkdirSync(directory, { recursive: true });
  // Per-split artefacts preserve the earlier dev evidence when final heldout is generated.
  for (const target of [results, directory]) { writeFileSync(join(target, 'results.md'), markdown); writeFileSync(join(target, 'results.jsonl'), jsonl); }
  const begin = '<!-- EVAL-RESULTS:BEGIN -->'; const end = '<!-- EVAL-RESULTS:END -->';
  const readmePath = join(root, 'README.md'); const readme = readFileSync(readmePath, 'utf8');
  if (readme.split(begin).length !== 2 || readme.split(end).length !== 2 || readme.indexOf(begin) > readme.indexOf(end)) throw new Error('README requires exactly one generated metrics block');
  const block = `${begin}\nGenerated ${split} run: ${String(metadata.run_id)}. See [results/${split}/results.md](results/${split}/results.md) and its per-case JSONL; ratios, coverage and abstentions are origin-separated. No legal-accuracy claim.\n\n${markdown.slice(markdown.indexOf('| Method'), markdown.indexOf('Five-class')).trim()}\n${end}`;
  writeFileSync(readmePath, readme.slice(0, readme.indexOf(begin))+block+readme.slice(readme.indexOf(end)+end.length));
  const failurePath = join(root, 'docs/LIMITATIONS.md'); const limitations = readFileSync(failurePath, 'utf8');
  const failureBegin = '<!-- EVAL-FAILURES:BEGIN -->'; const failureEnd = '<!-- EVAL-FAILURES:END -->';
  if (limitations.split(failureBegin).length !== 2 || limitations.split(failureEnd).length !== 2) throw new Error('LIMITATIONS requires generated failure block');
  const failures = rows.filter(r => r.prediction.status === 'ok' && !r.agreement).map(r => ({ method: r.method, id: r.case.id, origin: r.case.origin, basis: r.case.basis, expected: r.case.expected, predicted: r.prediction.verdict }));
  const failureBlock = `${failureBegin}\nGenerated ${split} disagreements (not excluded from metrics):\n\n\`\`\`json\n${JSON.stringify(failures, null, 2)}\n\`\`\`\n${failureEnd}`;
  writeFileSync(failurePath, limitations.slice(0, limitations.indexOf(failureBegin))+failureBlock+limitations.slice(limitations.indexOf(failureEnd)+failureEnd.length));
}
