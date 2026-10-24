import { describe, expect, it } from 'vitest';
import { normaliseLicence, normaliseString, renderExpr } from '../supabase/functions/_shared/core/spdxexpr/normalise.ts';
import { lex } from '../supabase/functions/_shared/core/spdxexpr/lexer.ts';
import { parse } from '../supabase/functions/_shared/core/spdxexpr/parser.ts';
import { expandOrLater } from '../supabase/functions/_shared/core/spdxexpr/expand.ts';
import { evaluateExpression } from '../supabase/functions/_shared/core/spdxexpr/evaluate.ts';
import { TOKEN_ALIASES, WHOLE_STRING_ALIASES } from '../supabase/functions/_shared/core/spdxexpr/aliases.ts';
import { LICENCES, getLicence, isRestrictedClass } from '../supabase/functions/_shared/core/rules/licences.ts';
import { EXCEPTIONS } from '../supabase/functions/_shared/core/rules/exceptions.ts';
import type { ExprNode, LeafRef } from '../supabase/functions/_shared/core/types.ts';
import { fakeEvaluator, settings } from './helpers.ts';

function leaves(node: ExprNode | null): LeafRef[] {
  if (!node) return [];
  if (node.type === 'leaf') return [node.leaf];
  return node.children.flatMap((c) => leaves(c));
}

function norm(s: string) {
  return normaliseString(s);
}

const ctx = { settings: settings(), scope: 'runtime' as const };

describe('parser', () => {
  it('precedence: AND binds tighter than OR', () => {
    const n = norm('MIT OR Apache-2.0 AND GPL-3.0-only');
    expect(n.expr?.type).toBe('or');
    if (n.expr?.type !== 'or') throw new Error('expected OR');
    expect(n.expr.children[0]).toMatchObject({ type: 'leaf', leaf: { text: 'MIT' } });
    expect(n.expr.children[1].type).toBe('and');
    expect(n.text).toBe('MIT OR Apache-2.0 AND GPL-3.0-only');
  });

  it('parentheses override precedence and render canonically', () => {
    const n = norm('(MIT OR Apache-2.0) AND GPL-3.0-only');
    expect(n.expr?.type).toBe('and');
    expect(n.text).toBe('(MIT OR Apache-2.0) AND GPL-3.0-only');
  });

  it('chains of the same operator are flattened', () => {
    const n = norm('MIT OR ISC OR 0BSD');
    expect(n.expr?.type === 'or' && n.expr.children.length).toBe(3);
  });

  it('WITH produces a single leaf carrying the exception', () => {
    const n = norm('GPL-2.0-only WITH Classpath-exception-2.0');
    expect(n.expr?.type).toBe('leaf');
    const [leaf] = leaves(n.expr);
    expect(leaf).toMatchObject({
      licenceId: 'GPL-2.0-only',
      exceptionId: 'Classpath-exception-2.0',
      status: 'supported',
      exceptionPair: 'classpath',
      licenceClass: 'strong_copyleft',
    });
  });

  it('WITH after a parenthesised group is a parse error', () => {
    expect(norm('(MIT OR ISC) WITH Classpath-exception-2.0').unresolvedReason).toBe('parse_error');
  });

  it('malformed expressions are unresolved parse errors', () => {
    for (const s of ['MIT OR', '(MIT', 'MIT AND AND ISC', 'MIT)', 'MIT WITH', 'MIT; ISC']) {
      expect(norm(s).unresolvedReason).toBe('parse_error');
    }
  });

  it('nesting deeper than 32 is rejected (too_deep)', () => {
    const s = '('.repeat(33) + 'MIT' + ')'.repeat(33);
    expect(norm(s).unresolvedReason).toBe('too_deep');
    const ok = '('.repeat(32) + 'MIT' + ')'.repeat(32);
    expect(norm(ok).text).toBe('MIT');
  });

  it('the lexer reports non-upper-case operators and the normaliser notes them', () => {
    const lexed = lex('MIT or ISC');
    expect(lexed.ok && lexed.nonUpperOperators).toBe(true);
    expect(norm('MIT or ISC').notes.map((x) => x.code)).toContain('non_upper_operator');
  });

  it('parse() of an empty token list fails', () => {
    expect(parse([]).ok).toBe(false);
  });
});

describe('normaliser', () => {
  it('+ maps an -only id to -or-later', () => {
    const n = norm('GPL-2.0-only+');
    expect(n.text).toBe('GPL-2.0-or-later');
    expect(n.notes.map((x) => x.code)).toContain('plus_operator');
  });

  it('+ on a licence with no recognised later version keeps the id and notes it', () => {
    const n = norm('Apache-2.0+');
    expect(n.text).toBe('Apache-2.0');
    expect(n.notes.map((x) => x.code)).toContain('plus_no_later_version');
  });

  it('legacy {type,url} object uses its type', () => {
    const n = normaliseLicence({ kind: 'legacy_object', value: 'MIT' });
    expect(n.text).toBe('MIT');
    expect(n.notes[0].code).toBe('legacy_object');
  });

  it('legacy array is read as OR, each entry normalised on its own', () => {
    const n = normaliseLicence({ kind: 'legacy_array', values: ['MIT', 'Apache License, Version 2.0'] });
    expect(n.text).toBe('MIT OR Apache-2.0');
    expect(n.notes[0].code).toBe('legacy_array');
  });

  it('"/" is the legacy form of OR', () => {
    const n = norm('MIT/Apache-2.0');
    expect(n.text).toBe('MIT OR Apache-2.0');
    expect(n.notes.map((x) => x.code)).toContain('legacy_slash');
  });

  it('SEE LICENSE IN is unresolved with a reason', () => {
    expect(norm('SEE LICENSE IN LICENSE.md').unresolvedReason).toBe('see_license_in');
    expect(norm('see licence in COPYING').unresolvedReason).toBe('see_license_in');
  });

  it('UNLICENSED is unresolved with a reason', () => {
    expect(norm('UNLICENSED').unresolvedReason).toBe('unlicensed');
    expect(norm('unlicensed').unresolvedReason).toBe('unlicensed');
  });

  it('missing and blank licences are unresolved "missing"', () => {
    expect(normaliseLicence({ kind: 'missing' }).unresolvedReason).toBe('missing');
    expect(norm('   ').unresolvedReason).toBe('missing');
  });

  it('deprecated ids map to the stricter -only form with a deprecated_id note', () => {
    const n = norm('GPL-2.0');
    expect(n.text).toBe('GPL-2.0-only');
    expect(n.notes.map((x) => x.code)).toContain('deprecated_id');
    expect(norm('LGPL-3.0').text).toBe('LGPL-3.0-only');
    expect(norm('AGPL-3.0').text).toBe('AGPL-3.0-only');
  });

  it('deprecated GPL-2.0+ becomes GPL-2.0-or-later', () => {
    expect(norm('GPL-2.0+').text).toBe('GPL-2.0-or-later');
  });

  it('deprecated GPL-2.0-with-classpath-exception becomes a WITH leaf', () => {
    const n = norm('GPL-2.0-with-classpath-exception');
    expect(n.text).toBe('GPL-2.0-only WITH Classpath-exception-2.0');
    expect(leaves(n.expr)[0].exceptionPair).toBe('classpath');
  });

  it('ids match case-insensitively and render in canonical case', () => {
    expect(norm('mit OR apache-2.0').text).toBe('MIT OR Apache-2.0');
  });

  it('licence strings over 1,000 characters are unresolved too_long', () => {
    expect(norm('M'.repeat(1001)).unresolvedReason).toBe('too_long');
  });

  it('expressions over 200 characters are unresolved expression_too_long', () => {
    const long = Array.from({ length: 40 }, () => 'MIT').join(' OR ');
    expect(long.length).toBeGreaterThan(200);
    expect(norm(long).unresolvedReason).toBe('expression_too_long');
  });

  it('a valid SPDX id outside the catalogue is unsupported_licence', () => {
    const [leaf] = leaves(norm('WTFPL').expr);
    expect(leaf.status).toBe('unsupported_licence');
    const [ref] = leaves(norm('LicenseRef-Acme-Internal').expr);
    expect(ref.status).toBe('unsupported_licence');
  });

  it('an unrecognised token is unresolved (unrecognised_identifier)', () => {
    const [leaf] = leaves(norm('Frobnicate-9').expr);
    expect(leaf).toMatchObject({ status: 'unresolved', reason: 'unrecognised_identifier' });
  });

  it('an exception on an unsupported base, an unmodelled exception, and LLVM-exception are unsupported_exception', () => {
    expect(leaves(norm('MIT WITH Classpath-exception-2.0').expr)[0]).toMatchObject({
      status: 'unsupported_exception',
      reason: 'exception_not_modelled_for_base',
    });
    expect(leaves(norm('Apache-2.0 WITH LLVM-exception').expr)[0]).toMatchObject({
      status: 'unsupported_exception',
      reason: 'exception_recognised_not_modelled',
    });
    expect(leaves(norm('GPL-2.0-only WITH Bison-exception-2.2').expr)[0].status).toBe('unsupported_exception');
    expect(leaves(norm('GPL-2.0-only WITH Made-Up-exception').expr)[0].reason).toBe('unrecognised_exception');
  });

  it('GCC-exception-3.1 is modelled on GPL-3.0 bases', () => {
    expect(leaves(norm('GPL-3.0-or-later WITH GCC-exception-3.1').expr)[0]).toMatchObject({ status: 'supported', exceptionPair: 'gcc' });
  });
});

describe('alias guards (PLAN §3.5)', () => {
  it('bare BSD is ambiguous -> unresolved', () => {
    expect(norm('BSD').unresolvedReason).toBe('ambiguous');
  });

  it('bare BSL is ambiguous -> unresolved', () => {
    expect(norm('BSL').unresolvedReason).toBe('ambiguous');
  });

  it('BSL-1.1 is ambiguous -> unresolved (never permissive)', () => {
    expect(norm('BSL-1.1').unresolvedReason).toBe('ambiguous');
    expect(norm('bsl-1.1').unresolvedReason).toBe('ambiguous');
  });

  it('versionless GPL is ambiguous -> unresolved', () => {
    expect(norm('GPL').unresolvedReason).toBe('ambiguous');
  });

  it('ambiguous tokens inside an expression become ambiguous leaves', () => {
    const n = norm('BSD OR MIT');
    expect(leaves(n.expr).map((l) => l.status)).toEqual(['ambiguous', 'supported']);
  });

  it('exact BSL-1.0 is the Boost licence (permissive), not blocked', () => {
    expect(leaves(norm('BSL-1.0').expr)[0]).toMatchObject({ status: 'supported', licenceClass: 'permissive' });
  });

  it('Apache spellings map to Apache-2.0', () => {
    expect(norm('Apache 2').text).toBe('Apache-2.0');
    expect(norm('Apache License, Version 2.0').text).toBe('Apache-2.0');
  });

  it('Expat and MIT/X11 map to MIT', () => {
    expect(norm('Expat').text).toBe('MIT');
    expect(norm('MIT/X11').text).toBe('MIT');
    expect(norm('MIT/X11').notes.map((x) => x.code)).not.toContain('legacy_slash');
  });

  it('alias-class guard: every alias lands in its intended class, and no alias crosses classes', () => {
    for (const table of [WHOLE_STRING_ALIASES, TOKEN_ALIASES]) {
      for (const [key, alias] of table) {
        if (alias.target === null) {
          expect(alias.intendedClass, key).toBeNull();
          continue;
        }
        const licence = getLicence(alias.target);
        expect(licence, `${key} -> ${alias.target}`).not.toBeNull();
        expect(licence?.licenceClass, key).toBe(alias.intendedClass);
      }
    }
  });

  it('alias-class guard: no permissive-looking alias reaches a restricted licence', () => {
    for (const [key, alias] of WHOLE_STRING_ALIASES) {
      const licence = alias.target ? getLicence(alias.target) : null;
      if (licence && isRestrictedClass(licence.licenceClass)) {
        expect(key, 'restricted aliases must name the licence explicitly').toMatch(/server side|business source/);
      }
    }
  });
});

describe('catalogue', () => {
  it('has 29 licences and 3 exceptions (PLAN §3.3)', () => {
    expect(LICENCES).toHaveLength(29);
    expect(new Set(LICENCES.map((l) => l.id)).size).toBe(29);
    expect(EXCEPTIONS.map((e) => e.id)).toEqual(['Classpath-exception-2.0', 'GCC-exception-3.1', 'LLVM-exception']);
  });

  it('or-later expansions point only at catalogue -only ids', () => {
    for (const l of LICENCES) {
      for (const id of l.expandsTo ?? []) expect(getLicence(id), `${l.id} -> ${id}`).not.toBeNull();
      if (l.orLaterId) expect(getLicence(l.orLaterId)?.expandsTo).not.toBeNull();
    }
  });
});

describe('-or-later expansion', () => {
  it('GPL-2.0-or-later expands to GPL-2.0-only OR GPL-3.0-only', () => {
    const n = norm('GPL-2.0-or-later');
    const expanded = expandOrLater(n.expr as ExprNode);
    expect(expanded.type).toBe('or');
    expect(renderExpr(expanded)).toBe('GPL-2.0-only OR GPL-3.0-only');
    expect(leaves(expanded).every((l) => l.expandedFrom === 'GPL-2.0-or-later')).toBe(true);
  });

  it('GPL-3.0-or-later expands to the single recognised version', () => {
    expect(renderExpr(expandOrLater(norm('GPL-3.0-or-later').expr as ExprNode))).toBe('GPL-3.0-only');
  });

  it('an exception is carried to every alternative and re-checked per version', () => {
    const expanded = expandOrLater(norm('GPL-2.0-or-later WITH Classpath-exception-2.0').expr as ExprNode);
    expect(leaves(expanded).map((l) => [l.text, l.status])).toEqual([
      ['GPL-2.0-only WITH Classpath-exception-2.0', 'supported'],
      ['GPL-3.0-only WITH Classpath-exception-2.0', 'unsupported_exception'],
    ]);
  });
});

describe('evaluator (rule-independent)', () => {
  it('OR picks the best alternative and records the chosen side', () => {
    const ev = evaluateExpression(norm('GPL-3.0-only OR MIT').expr as ExprNode, ctx, fakeEvaluator({ 'GPL-3.0-only': 'conflict', MIT: 'ok' }));
    expect(ev.verdict).toBe('ok');
    expect(ev.chosenSide).toBe('MIT');
    expect(ev.leaves.map((l) => [l.leafText, l.counted])).toEqual([
      ['GPL-3.0-only', false],
      ['MIT', true],
    ]);
    expect(ev.obligations).toEqual(['ob:MIT']);
  });

  it('OR ties go to the first declared alternative', () => {
    const ev = evaluateExpression(norm('MIT OR GPL-3.0-only').expr as ExprNode, ctx, fakeEvaluator({ MIT: 'ok', 'GPL-3.0-only': 'ok' }));
    expect(ev.chosenSide).toBe('MIT');
  });

  it('an all-unknown OR stays unknown', () => {
    const ev = evaluateExpression(norm('Frobnicate-1 OR Frobnicate-2').expr as ExprNode, ctx, fakeEvaluator({}));
    expect(ev.verdict).toBe('unknown');
  });

  it('OR order: unknown beats conflict', () => {
    const ev = evaluateExpression(norm('GPL-3.0-only OR Frobnicate-1').expr as ExprNode, ctx, fakeEvaluator({ 'GPL-3.0-only': 'conflict' }));
    expect(ev.verdict).toBe('unknown');
  });

  it('AND takes the worst and every leaf counts', () => {
    const ev = evaluateExpression(norm('MIT AND GPL-3.0-only').expr as ExprNode, ctx, fakeEvaluator({ MIT: 'ok', 'GPL-3.0-only': 'conflict' }));
    expect(ev.verdict).toBe('conflict');
    expect(ev.chosenSide).toBeNull();
    expect(ev.leaves.every((l) => l.counted)).toBe(true);
  });

  it('AND order: an unknown member is worse than needs_review', () => {
    const ev = evaluateExpression(norm('MIT AND Frobnicate-1').expr as ExprNode, ctx, fakeEvaluator({ MIT: 'needs_review' }));
    expect(ev.verdict).toBe('unknown');
  });

  it('an expanded -or-later alternative is named by its original id in OR choices', () => {
    const ev = evaluateExpression(norm('MIT OR GPL-2.0-or-later').expr as ExprNode, ctx, fakeEvaluator({ MIT: 'conflict', 'GPL-3.0-only': 'ok' }));
    expect(ev.orChoices[0]).toMatchObject({ alternatives: ['MIT', 'GPL-2.0-or-later'], chosen: 'GPL-2.0-or-later' });
    expect(ev.orChoices[1]).toMatchObject({ alternatives: ['GPL-2.0-only', 'GPL-3.0-only'] });
  });
});
