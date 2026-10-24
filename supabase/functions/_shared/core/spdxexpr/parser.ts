// Recursive-descent SPDX parser (PLAN §3.1):
//   expr     := andExpr ((OR | '/') andExpr)*
//   andExpr  := withExpr (AND withExpr)*          -- AND binds tighter than OR
//   withExpr := ID [WITH ID] | '(' expr ')'       -- WITH only after a simple id
// Parenthesis nesting is capped (MAX_NESTING_DEPTH); deeper input fails with `too_deep`.

import { MAX_NESTING_DEPTH } from '../inputs/caps.ts';
import type { Token } from './lexer.ts';

export type RawExpr =
  | { type: 'id'; id: string; plus: boolean }
  | { type: 'with'; id: string; plus: boolean; exception: string }
  | { type: 'and'; left: RawExpr; right: RawExpr }
  | { type: 'or'; left: RawExpr; right: RawExpr; slash: boolean };

export type ParseResult =
  | { ok: true; ast: RawExpr; usedSlash: boolean }
  | { ok: false; code: 'parse_error' | 'too_deep'; pos: number; detail: string };

class ParseFailure extends Error {
  code: 'parse_error' | 'too_deep';
  pos: number;
  constructor(code: 'parse_error' | 'too_deep', pos: number, detail: string) {
    super(detail);
    this.code = code;
    this.pos = pos;
  }
}

export function parse(tokens: readonly Token[], maxDepth: number = MAX_NESTING_DEPTH): ParseResult {
  let i = 0;
  let depth = 0;
  let usedSlash = false;
  const endPos = tokens.length > 0 ? tokens[tokens.length - 1].pos + tokens[tokens.length - 1].value.length : 0;

  const peek = (): Token | undefined => tokens[i];

  const parseOr = (): RawExpr => {
    let left = parseAnd();
    for (;;) {
      const t = peek();
      if (!t || (t.type !== 'OR' && t.type !== 'SLASH')) return left;
      i++;
      if (t.type === 'SLASH') usedSlash = true;
      const right = parseAnd();
      left = { type: 'or', left, right, slash: t.type === 'SLASH' };
    }
  };

  const parseAnd = (): RawExpr => {
    let left = parseWith();
    for (;;) {
      const t = peek();
      if (!t || t.type !== 'AND') return left;
      i++;
      left = { type: 'and', left, right: parseWith() };
    }
  };

  const parseWith = (): RawExpr => {
    const t = peek();
    if (!t) throw new ParseFailure('parse_error', endPos, 'unexpected end of expression');
    if (t.type === 'LPAREN') {
      i++;
      depth++;
      if (depth > maxDepth) throw new ParseFailure('too_deep', t.pos, `parentheses nested deeper than ${maxDepth}`);
      const inner = parseOr();
      const close = peek();
      if (!close || close.type !== 'RPAREN') {
        throw new ParseFailure('parse_error', close ? close.pos : endPos, 'missing closing parenthesis');
      }
      i++;
      depth--;
      const next = peek();
      if (next && next.type === 'WITH') {
        throw new ParseFailure('parse_error', next.pos, 'WITH must follow a licence identifier, not a group');
      }
      return inner;
    }
    if (t.type === 'ID') {
      i++;
      const next = peek();
      if (next && next.type === 'WITH') {
        i++;
        const ex = peek();
        if (!ex || ex.type !== 'ID' || ex.plus) {
          throw new ParseFailure('parse_error', ex ? ex.pos : endPos, 'WITH must be followed by an exception identifier');
        }
        i++;
        return { type: 'with', id: t.value, plus: t.plus, exception: ex.value };
      }
      return { type: 'id', id: t.value, plus: t.plus };
    }
    throw new ParseFailure('parse_error', t.pos, `unexpected ${t.type} at ${t.pos}`);
  };

  try {
    if (tokens.length === 0) throw new ParseFailure('parse_error', 0, 'empty expression');
    const ast = parseOr();
    const rest = peek();
    if (rest) throw new ParseFailure('parse_error', rest.pos, `unexpected ${rest.type} after the expression`);
    return { ok: true, ast, usedSlash };
  } catch (err) {
    if (err instanceof ParseFailure) return { ok: false, code: err.code, pos: err.pos, detail: err.message };
    throw err;
  }
}
