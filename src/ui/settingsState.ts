// Settings draft state for the form (PLAN §1.4): no defaults are pre-selected; Analyze stays
// disabled until project licence, mode and bundled are all chosen. Acknowledgements start unchecked.

import type { Acknowledgements, Mode, ProjectLicence, Settings } from '@core/types.ts';
import { ACKNOWLEDGEMENTS_LABEL, MODES, PROJECT_LICENCES } from '@core/types.ts';
import { isMode, isProjectLicence } from '@core/settings.ts';

export interface SettingsDraft {
  projectLicense: ProjectLicence | null;
  mode: Mode | null;
  bundled: boolean | null;
  acknowledgements: Acknowledgements;
}

export const EMPTY_DRAFT: SettingsDraft = {
  projectLicense: null,
  mode: null,
  bundled: null,
  acknowledgements: { unmodified_use: false, mpl_secondary_eligible: false },
};

export const PROJECT_LICENCE_OPTIONS: readonly { value: ProjectLicence; label: string }[] = PROJECT_LICENCES.map((value) => ({
  value,
  label: value === 'LicenseRef-Proprietary' ? 'Proprietary (LicenseRef-Proprietary)' : value,
}));

// modeHint is a hoisted function declaration, so it is safe to call while this constant initialises.
export const MODE_OPTIONS: readonly { value: Mode; label: string; hint: string }[] = MODES.map((value) => ({
  value,
  label: value,
  hint: modeHint(value),
}));

function modeHint(mode: Mode): string {
  switch (mode) {
    case 'distribute':
      return 'you ship binaries or source to others';
    case 'library':
      return 'others consume your package';
    case 'hosted':
      return 'you run it as a network service';
    case 'internal':
      return 'used only inside your organisation';
  }
}

export const ACKNOWLEDGEMENT_OPTIONS: readonly { key: keyof Acknowledgements; label: string }[] = [
  {
    key: 'unmodified_use',
    label:
      'Dependency used as published and linked unmodified (for GCC-exception: compiled by an eligible compilation process)',
  },
  {
    key: 'mpl_secondary_eligible',
    label: 'MPL files carry no Exhibit B "Incompatible With Secondary Licenses" notice',
  },
];

export const ACKNOWLEDGEMENTS_NOTE = ACKNOWLEDGEMENTS_LABEL;

export function missingSettings(draft: SettingsDraft): string[] {
  const missing: string[] = [];
  if (draft.projectLicense === null) missing.push('project licence');
  if (draft.mode === null) missing.push('mode');
  if (draft.bundled === null) missing.push('bundled');
  return missing;
}

export function isSettingsComplete(draft: SettingsDraft): boolean {
  return missingSettings(draft).length === 0;
}

export function draftToSettings(draft: SettingsDraft): Settings | null {
  if (draft.projectLicense === null || draft.mode === null || draft.bundled === null) return null;
  return {
    projectLicense: draft.projectLicense,
    mode: draft.mode,
    bundled: draft.bundled,
    acknowledgements: { ...draft.acknowledgements },
  };
}

/** Analyze is enabled only with an input loaded, all three settings chosen, and no run in progress. */
export function canAnalyze(draft: SettingsDraft, hasInput: boolean, running: boolean): boolean {
  return hasInput && !running && isSettingsComplete(draft);
}

export function parseProjectLicence(value: string): ProjectLicence | null {
  return isProjectLicence(value) ? value : null;
}

export function parseMode(value: string): Mode | null {
  return isMode(value) ? value : null;
}

export function parseBundled(value: string): boolean | null {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}

export function sameSettings(a: Settings, b: Settings): boolean {
  return (
    a.projectLicense === b.projectLicense &&
    a.mode === b.mode &&
    a.bundled === b.bundled &&
    a.acknowledgements.unmodified_use === b.acknowledgements.unmodified_use &&
    a.acknowledgements.mpl_secondary_eligible === b.acknowledgements.mpl_secondary_eligible
  );
}
