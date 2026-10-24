import { DISCLAIMER } from '@core/explain/disclaimer.ts';
import { OSADL_ATTRIBUTION } from '@core/data/osadlAttribution.ts';
export function Disclaimer() {
  return <div role="note"><p className="disclaimer">{DISCLAIMER}</p><p className="data-attribution">{OSADL_ATTRIBUTION} <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY-4.0 terms</a></p></div>;
}
