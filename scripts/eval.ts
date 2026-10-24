// Source-only construction: this script has NEVER been run. Later: npm run eval -- [flags].
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { loadCases } from './eval/cases.ts';
import { denylist } from './eval/baselines/denylist.ts';
import { ladder } from './eval/baselines/ladder.ts';
import { matrix } from './eval/baselines/matrix.ts';
import { fullEngine } from './eval/baselines/fullEngine.ts';
import { esdecode } from './eval/baselines/esdecode.ts';
import { verdictMetrics } from './eval/metrics.ts';
import { normaliserMetrics } from './eval/normaliser.ts';
import type { MessyCase } from './eval/normaliser.ts';
import { explanationMetrics, mockExplanations, readExplanationLedger } from './eval/explanations.ts';
import { writeResults } from './eval/writer.ts';
import type { ScoreRow, Method } from './eval/types.ts';
import { RULES_EDITION } from '../supabase/functions/_shared/core/rules/ruleTable.ts';
import { GUARD_VERSION } from '../supabase/functions/_shared/core/explain/guard.ts';
export async function main(args: string[]) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const options = { heldout: false, final: false, normaliser: 'alias-plus-fuzzy', explain: 'none', ledger: '', bridge: '' };
  for (let i=0; i<args.length; i++) {
    const arg = args[i];
    if (arg === '--heldout') options.heldout = true;
    else if (arg === '--final') options.final = true;
    else if (['--normaliser','--explain','--explanation-ledger','--esdecode-adapter'].includes(arg)) {
      const value = args[++i]; if (!value || value.startsWith('--')) throw new Error(`Missing value: ${arg}`);
      if (arg === '--normaliser') options.normaliser = value;
      if (arg === '--explain') options.explain = value;
      if (arg === '--explanation-ledger') options.ledger = resolve(value);
      if (arg === '--esdecode-adapter') options.bridge = resolve(value);
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (options.normaliser === 'jev') { console.error('not_run: --normaliser jev is not implemented (D15); no TypeSafe calls made'); process.exitCode = 2; return; }
  if (options.normaliser !== 'alias-plus-fuzzy' || !['none','mock','live'].includes(options.explain)) throw new Error('Unsupported normaliser/explanation mode');
  if (options.heldout !== options.final) throw new Error('Heldout requires BOTH --heldout --final; --final alone is invalid');
  if (options.ledger && options.explain !== 'none') throw new Error('Choose either a supplied explanation ledger or --explain, not both');
  const split = options.heldout ? 'heldout' : 'dev'; const results = join(root, 'results'); mkdirSync(results, { recursive: true });
  const lockPath = join(results, 'EVAL.lock'); const lock = openSync(lockPath, 'wx');
  const runId = randomUUID(); const marker = join(results, 'HELDOUT-USED.json');
  try {
    const revision = execFileSync('git', ['rev-parse','HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    if (options.heldout) {
      // Freeze after committing source + dev observations. No hidden second attempt after failure.
      const frozen = JSON.parse(readFileSync(join(results, 'FROZEN.json'), 'utf8')) as { source_revision: string; dev_run_id: string; frozen_at: string };
      if (frozen.source_revision !== revision || !frozen.dev_run_id || !frozen.frozen_at || !existsSync(join(results, 'dev/results.jsonl'))) throw new Error('Missing/mismatched source freeze and dev results (D2)');
      const dev = readFileSync(join(results, 'dev/results.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as { kind?: string; run_id?: string });
      if (!dev.some(row => row.kind === 'metadata' && row.run_id === frozen.dev_run_id)) throw new Error('Freeze does not identify recorded dev run');
      const dirty = execFileSync('git', ['status','--porcelain','--untracked-files=all','--','.',':(exclude)results'], { cwd: root, encoding: 'utf8' }).trim();
      if (dirty) throw new Error('Freeze requires clean committed source outside results/');
      const fd = openSync(marker, 'wx');
      try { writeFileSync(fd, JSON.stringify({ status: 'started', consumed: true, run_id: runId, source_revision: revision, frozen, at: new Date().toISOString() }, null, 2)+'\n'); fsyncSync(fd); }
      finally { closeSync(fd); }
    }
    // The heldout marker is durable before any heldout tree is analyzed or prediction scored.
    const loaded = loadCases(root, split);
    const methods: Method[] = [fullEngine, denylist, ladder, matrix, await esdecode(options.bridge || undefined)];
    const rows: ScoreRow[] = [];
    for (const c of loaded.cases) for (const method of methods) {
      const prediction = c.missing ? { status: 'abstain' as const, verdict: null, reason: 'missing_tree_inventory_item' } : await method.predict(c);
      rows.push({ kind: 'verdict', method: method.name, case: c, prediction,
        agreement: prediction.status === 'ok' && c.expected.includes(prediction.verdict),
        ruleAgreement: c.expectedRuleIds && prediction.status === 'ok' && prediction.ruleIds ? JSON.stringify(c.expectedRuleIds) === JSON.stringify(prediction.ruleIds) : null,
        chosenSideAgreement: c.expectedChosenSide !== undefined && prediction.status === 'ok' && prediction.chosenSide !== undefined ? c.expectedChosenSide === prediction.chosenSide : null });
    }
    const additional: unknown[] = [];
    if (!options.heldout) {
      const messyPath = join(root, 'fixtures/strings/messy-dev.jsonl'); const bytes = readFileSync(messyPath);
      loaded.inputs['fixtures/strings/messy-dev.jsonl'] = createHash('sha256').update(bytes).digest('hex');
      additional.push(normaliserMetrics(bytes.toString('utf8').trim().split(/\r?\n/).map(line => JSON.parse(line) as MessyCase)));
    } else additional.push({ kind: 'normaliser', status: 'not_run', reason: 'Synthetic messy strings are dev-only; no heldout normaliser set exists' });
    const observations = options.ledger ? readExplanationLedger(options.ledger) : options.explain === 'mock' ? await mockExplanations(root, loaded.cases, runId) : [];
    // A supplied ledger must belong to this selected case/split set. No accidental heldout leakage.
    const caseIds = new Set(loaded.cases.map(c => c.id));
    if (observations.some(r => !caseIds.has(r.case_id))) throw new Error('Explanation ledger contains cases outside selected split');
    additional.push(...observations, { kind: 'explanation_metrics', ...explanationMetrics(observations) });
    if (options.explain === 'live') additional.push({ kind: 'live_activation', status: 'not_run', reason: 'Live transport/owner price/key activation intentionally unbound. Use runLocalCampaign with a verified direct Provider adapter, persistent local ledger and EVAL_CAP_USD after D16 authorization; never call the public function.' });
    const metadata = { run_id: runId, at: new Date().toISOString(), split, source_revision: revision, rules_edition: RULES_EDITION, guard_version: GUARD_VERSION,
      inputs_sha256: loaded.inputs, methods: methods.map(m => ({ name: m.name, description: m.description })), options,
      warning: 'Author/tree labels are interpretations, partly true by construction; OSADL agreement is not legal accuracy. No excluded disagreements.' };
    writeResults(root, split, metadata, methods, rows, verdictMetrics(rows), loaded.treeChecks, additional);
    if (options.heldout) { const initial = JSON.parse(readFileSync(marker, 'utf8')) as Record<string, unknown>; writeFileSync(marker, JSON.stringify({ ...initial, status: 'completed', results: 'heldout/results.jsonl' }, null, 2)+'\n'); }
    console.log(`Wrote results/${split}/results.md and results.jsonl; latest summary + README generated block updated.`);
  } finally { closeSync(lock); unlinkSync(lockPath); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(error => { console.error(error instanceof Error ? error.message : 'Evaluation failed'); process.exitCode = 1; });
