export function ConsentBanner({ mode, disabled, onConsent }: { mode: 'mock' | 'live'; disabled: boolean; onConsent: () => void }) {
  return <div className="notice" role="note">
    <p>{mode === 'mock' ? 'Mock explanation stays in this browser; no provider or database call.' : 'Explain sends one finding’s normalized facts to the public explain function. Its configured provider receives the fact block and server-selected licence passages.'}</p>
    <p>Request fields: request_id, run_id, dep_ref (opaque dep-N), expr (catalogue SPDX IDs/operators), project, mode, bundled, scope,
      acknowledgements (unmodified_use, mpl_secondary_eligible), claimed (rule_ids, verdict, chosen_side), rules_edition.</p>
    <p>Package names, versions, paths, lockfile content and raw licence strings stay in the browser. IDs identify this explanation request/run, not your account.</p>
    <button type="button" disabled={disabled} onClick={onConsent}>{mode === 'mock' ? 'Explain (mock)' : 'Consent and explain (live)'}</button>
  </div>;
}
