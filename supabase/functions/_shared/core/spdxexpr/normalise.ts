// Licence normaliser (PLAN §3.1, §3.5, §3.6).
//
// Order for a licence string:
//   1. length cap (1,000 chars) -> unresolved `too_long`; blank -> `missing`
//   2. `UNLICENSED` -> unresolved `unlicensed`; `SEE LICENSE IN ...` -> unresolved `see_license_in`
//   3. whole-string alias table (before lexing, so `MIT/X11` is not split); ambiguous -> unresolved `ambiguous`
//   4. expression cap (200 chars) -> `expression_too_long`
//   5. lex + parse (`/` is legacy OR; nesting cap -> `too_deep`; errors -> `parse_error`)
//   6. resolve each id: catalogue (case-insensitive), deprecated ids (stricter `-only`, `deprecated_id`
//      note), token aliases, `+` operator, known non-catalogue SPDX ids (`unsupported_licence`),
//      anything else `unresolved` (`unrecognised_identifier`)
// Legacy `{type,url}` objects use their `type`; legacy arrays are read as a choice (OR), with a note.

import type { ExprNode, LeafRef, NormaliseNote, NormalisedLicence, RawLicence, UnresolvedReason } from '../types.ts';
import { MAX_EXPRESSION_CHARS, MAX_LICENCE_STRING, clip } from '../inputs/caps.ts';
import { findLicence } from '../rules/licences.ts';
import { DEPRECATED_IDS, KNOWN_OTHER_LICENCE_IDS, TOKEN_ALIASES, WHOLE_STRING_ALIASES, aliasKey, isLicenseRef } from './aliases.ts';
import { lex } from './lexer.ts';
import { parse } from './parser.ts';
import type { RawExpr } from './parser.ts';
import { canonicalExceptionId, catalogueLeaf, leafText, otherLeaf } from './leaf.ts';

const DISPLAY_LIMIT = MAX_LICENCE_STRING;

function unresolved(reason: UnresolvedReason, rawDisplay: string, notes: NormaliseNote[]): NormalisedLicence {
  return { expr: null, text: null, unresolvedReason: reason, notes, rawDisplay };
}

export function normaliseLicence(raw: RawLicence): NormalisedLicence {
  switch (raw.kind) {
    case 'string':
      return normaliseString(raw.value);
    case 'legacy_object': {
      const result = normaliseString(raw.value);
      result.notes.unshift({ code: 'legacy_object', detail: 'legacy {type, url} licence object; its type was used' });
      return result;
    }
    case 'legacy_array': {
      if (raw.values.length === 1) {
        const result = normaliseString(raw.values[0]);
        result.notes.unshift({ code: 'legacy_array', detail: 'legacy licences array with one entry' });
        return result;
      }
      const notes: NormaliseNote[] = [
        { code: 'legacy_array', detail: 'legacy licences array read as a choice between its entries (OR)' },
      ];
      const children: ExprNode[] = raw.values.map((value): ExprNode => {
        const part = normaliseString(value);
        notes.push(...part.notes);
        if (part.expr) return part.expr;
        const reason = part.unresolvedReason ?? 'parse_error';
        return { type: 'leaf', leaf: otherLeaf(clip(value.trim(), 120), reason === 'ambiguous' ? 'ambiguous' : 'unresolved', reason) };
      });
      const expr: ExprNode = { type: 'or', children };
      return { expr, text: renderExpr(expr), unresolvedReason: null, notes, rawDisplay: clip(raw.values.join(', '), DISPLAY_LIMIT) };
    }
    case 'missing':
      return unresolved('missing', '(no licence field)', []);
    case 'lockfile_v1':
      return unresolved('lockfile_v1_no_licence', '(lockfile v1: no licence field)', []);
    case 'invalid':
      return unresolved('invalid_type', '(licence field is not a string or legacy object)', []);
  }
}

export function normaliseString(input: string): NormalisedLicence {
  const notes: NormaliseNote[] = [];
  const rawDisplay = clip(input, DISPLAY_LIMIT);
  if (input.length > MAX_LICENCE_STRING) return unresolved('too_long', rawDisplay, notes);
  const s = input.trim();
  if (s === '') return unresolved('missing', rawDisplay, notes);
  if (/^unlicensed$/i.test(s)) return unresolved('unlicensed', rawDisplay, notes);
  if (/^see licen[cs]e in\b/i.test(s)) return unresolved('see_license_in', rawDisplay, notes);

  const whole = WHOLE_STRING_ALIASES.get(aliasKey(s));
  if (whole) {
    if (whole.target === null) {
      notes.push({ code: 'alias_ambiguous', detail: `"${clip(s, 80)}" is ambiguous and was not mapped` });
      return unresolved('ambiguous', rawDisplay, notes);
    }
    notes.push({ code: 'alias', detail: `"${clip(s, 80)}" read as ${whole.target}` });
    if (whole.stricterOnly) notes.push({ code: 'alias_stricter_only', detail: `no "or later" wording; read as ${whole.target}` });
    const leaf = catalogueLeaf(whole.target, null);
    return { expr: { type: 'leaf', leaf }, text: leaf.text, unresolvedReason: null, notes, rawDisplay };
  }

  if (s.length > MAX_EXPRESSION_CHARS) return unresolved('expression_too_long', rawDisplay, notes);

  const lexed = lex(s);
  if (!lexed.ok) {
    notes.push({ code: 'parse_error', detail: lexed.detail });
    return unresolved('parse_error', rawDisplay, notes);
  }
  if (lexed.nonUpperOperators) notes.push({ code: 'non_upper_operator', detail: 'operators were not upper case' });
  const parsed = parse(lexed.tokens);
  if (!parsed.ok) {
    notes.push({ code: parsed.code, detail: parsed.detail });
    return unresolved(parsed.code === 'too_deep' ? 'too_deep' : 'parse_error', rawDisplay, notes);
  }
  if (parsed.usedSlash) notes.push({ code: 'legacy_slash', detail: '"/" read as OR (legacy form)' });

  const expr = toExprNode(parsed.ast, notes);
  return { expr, text: renderExpr(expr), unresolvedReason: null, notes, rawDisplay };
}

// ---------------------------------------------------------------- id resolution

type ResolvedToken =
  | { kind: 'catalogue'; id: string; exception: string | null }
  | { kind: 'other'; leaf: LeafRef };

function resolveLicenceToken(token: string, plus: boolean, notes: NormaliseNote[]): ResolvedToken {
  const written = token + (plus ? '+' : '');
  const lower = token.toLowerCase();
  let id = token;
  let exception: string | null = null;

  const deprecated = DEPRECATED_IDS.get(lower);
  if (deprecated) {
    id = deprecated.id;
    exception = deprecated.exception;
    notes.push({ code: 'deprecated_id', detail: `${token} is a deprecated SPDX id; read as ${leafText(id, exception)}` });
  } else {
    const alias = TOKEN_ALIASES.get(lower);
    if (alias) {
      if (alias.target === null) {
        notes.push({ code: 'alias_ambiguous', detail: `"${clip(token, 80)}" is ambiguous and was not mapped` });
        return { kind: 'other', leaf: otherLeaf(written, 'ambiguous', 'ambiguous') };
      }
      notes.push({ code: 'alias', detail: `"${clip(token, 80)}" read as ${alias.target}` });
      id = alias.target;
    }
  }

  const licence = findLicence(id);
  if (licence) {
    let canonical = licence.id;
    if (plus) {
      if (licence.orLaterId !== null) {
        canonical = licence.orLaterId;
        notes.push({ code: 'plus_operator', detail: `${written} read as ${canonical}` });
      } else if (licence.expandsTo !== null) {
        notes.push({ code: 'plus_operator', detail: `${written}: already "or later"` });
      } else {
        notes.push({ code: 'plus_no_later_version', detail: `${written}: no later version of ${licence.id} is recognised` });
      }
    }
    return { kind: 'catalogue', id: canonical, exception };
  }

  const other = KNOWN_OTHER_LICENCE_IDS.get(id.toLowerCase());
  if (other !== undefined || isLicenseRef(id)) {
    const canonical = other ?? id;
    return {
      kind: 'other',
      leaf: otherLeaf(canonical + (plus ? '+' : ''), 'unsupported_licence', 'unsupported_licence', null, canonical),
    };
  }
  return { kind: 'other', leaf: otherLeaf(clip(written, 120), 'unresolved', 'unrecognised_identifier') };
}

function leafFor(raw: { id: string; plus: boolean }, exceptionToken: string | null, notes: NormaliseNote[]): LeafRef {
  const base = resolveLicenceToken(raw.id, raw.plus, notes);
  if (base.kind === 'other') {
    if (exceptionToken === null) return base.leaf;
    const ex = canonicalExceptionId(exceptionToken);
    return { ...base.leaf, text: `${base.leaf.text} WITH ${ex.id}`, exceptionId: ex.id };
  }
  if (exceptionToken === null) return catalogueLeaf(base.id, base.exception);
  if (base.exception !== null) {
    // e.g. `GPL-2.0-with-classpath-exception WITH X`: two exceptions on one base.
    const ex = canonicalExceptionId(exceptionToken);
    return {
      ...catalogueLeaf(base.id, base.exception),
      text: `${leafText(base.id, base.exception)} WITH ${ex.id}`,
      status: 'unsupported_exception',
      exceptionPair: null,
      reason: 'multiple_exceptions',
    };
  }
  return catalogueLeaf(base.id, canonicalExceptionId(exceptionToken).id);
}

function toExprNode(raw: RawExpr, notes: NormaliseNote[]): ExprNode {
  switch (raw.type) {
    case 'id':
      return { type: 'leaf', leaf: leafFor(raw, null, notes) };
    case 'with':
      return { type: 'leaf', leaf: leafFor(raw, raw.exception, notes) };
    case 'and':
    case 'or': {
      const children: ExprNode[] = [];
      const collect = (node: RawExpr): void => {
        if ((node.type === 'and' || node.type === 'or') && node.type === raw.type) {
          collect(node.left);
          collect(node.right);
        } else {
          children.push(toExprNode(node, notes));
        }
      };
      collect(raw);
      return raw.type === 'and' ? { type: 'and', children } : { type: 'or', children };
    }
  }
}

// ---------------------------------------------------------------- rendering

/** Canonical text: ids and operators only; OR groups inside AND are parenthesised. */
export function renderExpr(node: ExprNode): string {
  switch (node.type) {
    case 'leaf':
      return node.leaf.text;
    case 'and':
      return node.children.map((c) => (c.type === 'or' ? `(${renderExpr(c)})` : renderExpr(c))).join(' AND ');
    case 'or':
      return node.children.map((c) => renderExpr(c)).join(' OR ');
  }
}

/** Text used to name an OR alternative: an expanded `-or-later` group shows its original id. */
export function choiceText(node: ExprNode): string {
  if (node.type === 'or' && node.expandedFrom !== undefined) return node.expandedFrom;
  return renderExpr(node);
}
