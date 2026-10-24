import { DISCLAIMER } from '@core/explain/disclaimer.ts';

export function Disclaimer() {
  return (
    <p className="disclaimer" role="note">
      {DISCLAIMER}
    </p>
  );
}
