// Analyze gating (PLAN §1.4, M1 f): disabled until project licence, mode and bundled are all chosen.
import { describe, expect, it } from 'vitest';
import {
  EMPTY_DRAFT,
  canAnalyze,
  draftToSettings,
  isSettingsComplete,
  missingSettings,
  parseBundled,
} from '../src/ui/settingsState.ts';
import { validateSettings } from '../supabase/functions/_shared/core/settings.ts';

describe('settings gating', () => {
  it('starts with nothing selected and acknowledgements unchecked', () => {
    expect(EMPTY_DRAFT.projectLicense).toBeNull();
    expect(EMPTY_DRAFT.mode).toBeNull();
    expect(EMPTY_DRAFT.bundled).toBeNull();
    expect(EMPTY_DRAFT.acknowledgements).toEqual({ unmodified_use: false, mpl_secondary_eligible: false });
    expect(missingSettings(EMPTY_DRAFT)).toEqual(['project licence', 'mode', 'bundled']);
  });

  it('Analyze stays disabled until all three settings are set', () => {
    const one = { ...EMPTY_DRAFT, projectLicense: 'MIT' as const };
    const two = { ...one, mode: 'hosted' as const };
    const three = { ...two, bundled: false };
    expect(canAnalyze(EMPTY_DRAFT, true, false)).toBe(false);
    expect(canAnalyze(one, true, false)).toBe(false);
    expect(canAnalyze(two, true, false)).toBe(false);
    expect(isSettingsComplete(three)).toBe(true);
    expect(canAnalyze(three, true, false)).toBe(true);
    expect(canAnalyze(three, false, false)).toBe(false);
    expect(canAnalyze(three, true, true)).toBe(false);
  });

  it('bundled = no is a real choice, distinct from unset', () => {
    expect(parseBundled('no')).toBe(false);
    expect(parseBundled('')).toBeNull();
    expect(draftToSettings({ ...EMPTY_DRAFT, projectLicense: 'MIT', mode: 'internal', bundled: false })?.bundled).toBe(false);
  });

  it('the worker-side validator rejects incomplete or foreign settings', () => {
    expect(validateSettings({ projectLicense: 'MIT', mode: 'hosted' })).toBeNull();
    expect(validateSettings({ projectLicense: 'WTFPL', mode: 'hosted', bundled: false, acknowledgements: { unmodified_use: false, mpl_secondary_eligible: false } })).toBeNull();
    expect(
      validateSettings({ projectLicense: 'MIT', mode: 'hosted', bundled: false, acknowledgements: { unmodified_use: false, mpl_secondary_eligible: false } }),
    ).not.toBeNull();
  });
});
