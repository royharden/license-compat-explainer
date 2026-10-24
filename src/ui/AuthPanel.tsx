import { useState } from 'react';
import type { useAuth } from '../lib/useAuth.ts';

export function AuthPanel({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const [email, setEmail] = useState('');
  if (!auth.configured) return <p className="hint">Account sign-in is unavailable until public backend configuration is supplied. Local rulings remain available.</p>;
  return <section className="auth-panel" aria-label="Account">
    {auth.session ? <p>Signed in as {auth.session.user.email ?? auth.session.user.id}.{' '}
      <button type="button" disabled={auth.busy} onClick={() => void auth.logout()}>Sign out</button></p>
      : <form onSubmit={(event) => { event.preventDefault(); void auth.login(email); }}>
        <label>Email for a magic link <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>{' '}
        <button disabled={auth.busy}>{auth.busy ? 'Signing in…' : 'Email sign-in link'}</button>
        <p className="hint">Sign-in is only needed to save rulings to your account. Analysis runs locally.</p>
      </form>}
    {auth.message && <p role="status">{auth.message}</p>}
    {auth.error && <p role="alert" className="error">{auth.error}</p>}
  </section>;
}
