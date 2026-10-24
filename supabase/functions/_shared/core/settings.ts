// Settings validation and hashing (PLAN §1.4-§1.5, §7.1). Settings are required and have no
// defaults; acknowledgements default to false. The same validator will guard the server request (M4).

import type { Acknowledgements, Mode, ProjectLicence, Settings } from './types.ts';
import { MODES, PROJECT_LICENCES } from './types.ts';
import { canonicalJson } from './util/canonicalJson.ts';
import { sha256Hex } from './util/sha256.ts';

export const DEFAULT_ACKNOWLEDGEMENTS: Readonly<Acknowledgements> = { unmodified_use: false, mpl_secondary_eligible: false };

export function isProjectLicence(value: unknown): value is ProjectLicence {
  return typeof value === 'string' && (PROJECT_LICENCES as readonly string[]).includes(value);
}

export function isMode(value: unknown): value is Mode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

/** Validate an untrusted settings value; returns a fresh Settings object or null. */
export function validateSettings(value: unknown): Settings | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const projectLicense = v['projectLicense'];
  const mode = v['mode'];
  const bundled = v['bundled'];
  const ack = v['acknowledgements'];
  if (!isProjectLicence(projectLicense) || !isMode(mode) || typeof bundled !== 'boolean') return null;
  if (typeof ack !== 'object' || ack === null) return null;
  const a = ack as Record<string, unknown>;
  const unmodifiedUse = a['unmodified_use'];
  const mplSecondaryEligible = a['mpl_secondary_eligible'];
  if (typeof unmodifiedUse !== 'boolean' || typeof mplSecondaryEligible !== 'boolean') return null;
  return {
    projectLicense,
    mode,
    bundled,
    acknowledgements: { unmodified_use: unmodifiedUse, mpl_secondary_eligible: mplSecondaryEligible },
  };
}

/** sha256 of the canonical JSON of the settings (project licence, mode, bundled, acknowledgements). */
export function settingsHash(settings: Settings): string {
  return sha256Hex(
    canonicalJson({
      projectLicense: settings.projectLicense,
      mode: settings.mode,
      bundled: settings.bundled,
      acknowledgements: {
        unmodified_use: settings.acknowledgements.unmodified_use,
        mpl_secondary_eligible: settings.acknowledgements.mpl_secondary_eligible,
      },
    }),
  );
}
