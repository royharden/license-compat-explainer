// Leaf construction (PLAN §3.1): a licence id, or a resolved `id WITH exception` pair, becomes one
// LeafRef carrying its own status and class, so a modelled exception is evaluated as its own leaf and
// can never be shadowed by the base licence's class rule.

import type { LeafRef, LeafStatus } from '../types.ts';
import { getLicence } from '../rules/licences.ts';
import { KNOWN_OTHER_EXCEPTIONS, findException } from '../rules/exceptions.ts';

export function leafText(licenceId: string, exceptionId: string | null): string {
  return exceptionId === null ? licenceId : `${licenceId} WITH ${exceptionId}`;
}

/** Canonical exception id when recognised (modelled, LLVM, or a known other id); else the token as written. */
export function canonicalExceptionId(token: string): { id: string; recognised: boolean } {
  const known = findException(token);
  if (known) return { id: known.id, recognised: true };
  return { id: token, recognised: KNOWN_OTHER_EXCEPTIONS.has(token.toLowerCase()) };
}

/**
 * Build a leaf for a catalogue licence id (canonical case) with an optional exception id.
 * Status: `supported` when there is no exception or the (base, exception) pair is modelled;
 * otherwise `unsupported_exception`.
 */
export function catalogueLeaf(licenceId: string, exceptionId: string | null, expandedFrom: string | null = null): LeafRef {
  const licence = getLicence(licenceId);
  if (!licence) {
    return otherLeaf(leafText(licenceId, exceptionId), 'unresolved', 'not_in_catalogue', expandedFrom);
  }
  if (exceptionId === null) {
    return {
      text: licence.id,
      licenceId: licence.id,
      exceptionId: null,
      status: 'supported',
      licenceClass: licence.licenceClass,
      exceptionPair: null,
      reason: null,
      expandedFrom,
    };
  }
  const exc = findException(exceptionId);
  const canonicalEx = exc ? exc.id : exceptionId;
  const base = {
    text: leafText(licence.id, canonicalEx),
    licenceId: licence.id,
    exceptionId: canonicalEx,
    licenceClass: licence.licenceClass,
    expandedFrom,
  };
  if (exc && exc.modelled && exc.pair !== null && exc.appliesTo.includes(licence.id)) {
    return { ...base, status: 'supported', exceptionPair: exc.pair, reason: null };
  }
  let reason: string;
  if (exc && exc.modelled) reason = 'exception_not_modelled_for_base';
  else if (exc) reason = 'exception_recognised_not_modelled';
  else if (KNOWN_OTHER_EXCEPTIONS.has(exceptionId.toLowerCase())) reason = 'exception_not_modelled';
  else reason = 'unrecognised_exception';
  return { ...base, status: 'unsupported_exception', exceptionPair: null, reason };
}

/** A leaf that is not a supported catalogue licence (unsupported, unresolved or ambiguous). */
export function otherLeaf(
  text: string,
  status: Exclude<LeafStatus, 'supported' | 'unsupported_exception'>,
  reason: string,
  expandedFrom: string | null = null,
  licenceId: string | null = null,
  exceptionId: string | null = null,
): LeafRef {
  return {
    text,
    licenceId,
    exceptionId,
    status,
    licenceClass: null,
    exceptionPair: null,
    reason,
    expandedFrom,
  };
}
