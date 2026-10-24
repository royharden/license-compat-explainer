// Dirty Mode static syntax check for .ts files (no installs needed; Node >= 23.2).
// Strips TypeScript types with Node's built-in stripper, then *compiles* (never evaluates)
// the result as an ES module. It proves syntax only: no type checking, no imports resolved.
// Usage: node --experimental-vm-modules --no-warnings scripts/static-syntax-check.mjs <file.ts...>
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let failed = 0;
for (const file of process.argv.slice(2)) {
  try {
    const js = stripTypeScriptTypes(readFileSync(file, 'utf8'), { mode: 'strip' });
    new vm.SourceTextModule(js, { identifier: file });
    console.log('ok   ' + file);
  } catch (err) {
    failed++;
    console.log('FAIL ' + file + ': ' + String(err && err.message).split('\n')[0]);
  }
}
console.log(failed ? `${failed} file(s) failed` : 'all files parsed');
process.exit(failed ? 1 : 0);
