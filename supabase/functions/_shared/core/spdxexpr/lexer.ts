// SPDX expression lexer (PLAN §3.1). Tokens: licence/exception ids (with an optional trailing `+`),
// AND, OR, WITH, parentheses, and `/` (legacy OR, e.g. `MIT/Apache-2.0`).
// Operators are recognised case-insensitively; non-upper-case operators are reported so the
// normaliser can note them.

export type TokenType = 'ID' | 'AND' | 'OR' | 'WITH' | 'LPAREN' | 'RPAREN' | 'SLASH';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
  /** ID only: a trailing `+` ("this version or any later one"). */
  plus: boolean;
}

export type LexResult =
  | { ok: true; tokens: Token[]; nonUpperOperators: boolean }
  | { ok: false; code: 'unexpected_character'; pos: number; detail: string };

function isIdChar(c: string): boolean {
  return /^[A-Za-z0-9.\-:]$/.test(c);
}

export function lex(input: string): LexResult {
  const tokens: Token[] = [];
  let nonUpperOperators = false;
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'LPAREN', value: c, pos: i, plus: false });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'RPAREN', value: c, pos: i, plus: false });
      i++;
      continue;
    }
    if (c === '/') {
      tokens.push({ type: 'SLASH', value: c, pos: i, plus: false });
      i++;
      continue;
    }
    if (isIdChar(c)) {
      const start = i;
      while (i < input.length && isIdChar(input[i])) i++;
      const value = input.slice(start, i);
      let plus = false;
      if (input[i] === '+') {
        plus = true;
        i++;
      }
      const upper = value.toUpperCase();
      if (!plus && (upper === 'AND' || upper === 'OR' || upper === 'WITH')) {
        if (value !== upper) nonUpperOperators = true;
        const opType: TokenType = upper;
        tokens.push({ type: opType, value: upper, pos: start, plus: false });
      } else {
        tokens.push({ type: 'ID', value, pos: start, plus });
      }
      continue;
    }
    return { ok: false, code: 'unexpected_character', pos: i, detail: `unexpected character ${JSON.stringify(c)} at ${i}` };
  }
  return { ok: true, tokens, nonUpperOperators };
}
