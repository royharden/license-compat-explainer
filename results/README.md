# Results

Not yet run. No verdict, normaliser or explanation scores have been produced. No heldout-use
marker or freeze receipt exists by construction. Dataset counts in source are not results.

After authorized runtime validation, `npm run eval` writes `results.md` and `results.jsonl`
here and preserves split copies under `dev/` or `heldout/`. These files include source revision,
input SHA-256, method descriptions, predictions, confusion matrices, abstentions, tree reader
coverage and any observed explanation ledger metrics. README and LIMITATIONS generated blocks
are updated only by the runner. The raw rows, not a pasted number, support every generated score.

`HELDOUT-USED.json` is created exclusively before heldout analysis and is never removed by
the runner, even after failure. A crash is a consumed attempt, not permission to reset it.
`EVAL.lock` excludes concurrent evals. Investigate a crash lock before any manual removal.

See [deferred validation](../docs/DEFERRED-VALIDATION.md) D2 for the exact freeze/final steps.
Local live campaigns use a single persistent `ledger.jsonl` and its exclusive lock. An
unsettled/unknown attempt retains its reservation; changing ledgers to evade a cap is forbidden.
No live campaign has run, and `--explain live` reports `not_run` until a transport is explicitly
bound to `runLocalCampaign` in a separately authorized activation.
