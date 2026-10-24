# Data provenance

Retrieval date: 2026-10-24. No licence-document terms are inferred from OSADL terms. No SPDX license-list-data is vendored. Raw bytes copied without alteration from the prior run’s download directory; source URLs were confirmed from the prior run’s tool metadata. Content headings and copying grants inspected in M2.

| File | Source URL | Retrieval | Bytes | SHA-256 | Copying basis |
|---|---|---|---|---|---|
| `licenses/gpl-2.0.txt` | https://www.gnu.org/licenses/gpl-2.0.txt | 2026-10-24 (prior run download) | 17984 | `edaef632cbb643e4e7a221717a6c441a4c1a7c918e6e4d56debc3d8739b233f6` | Lines 6–7: “Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.” |
| `licenses/gpl-3.0.txt` | https://www.gnu.org/licenses/gpl-3.0.txt | 2026-10-24 (prior run download) | 35149 | `3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986` | Lines 5–6: “Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.” |
| `licenses/lgpl-2.1.txt` | https://www.gnu.org/licenses/lgpl-2.1.txt | 2026-10-24 (prior run download) | 26419 | `20e50fe7aae3e56378ebf0417d9de904f55a0e61e4df315333e632a4d3555d95` | Lines 6–7: “Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.” |
| `osadl/matrix.csv` | https://www.osadl.org/fileadmin/checklists/matrix.csv | 2026-10-24 (prior run download) | 60652 | `9d8dddbd30038c09add0142dc3f00543f19a3625ee7d115f31d1c0a1a08c23b7` | OSADL Open Source License Compatibility Matrix, © Open Source Automation Development Lab (OSADL), CC-BY-4.0; attribution retained, no changes. Terms: https://www.osadl.org/Access-to-raw-data.oss-compliance-raw-data-access.0.html |

## Document coverage (incomplete)

Available documents: GPL-2.0, GPL-3.0, LGPL-2.1. `-only`/`-or-later` share their document; aliases do not duplicate raw files.

Failed public GETs on 2026-10-24: `https://www.gnu.org/licenses/agpl-3.0.txt`, `https://www.gnu.org/licenses/lgpl-3.0.txt`, `https://www.gnu.org/licenses/gcc-exception-3.1.txt` timed out (PowerShell; one bounded curl AGPL retry also timed out). No failed response is vendored. Those three texts remain template-only; the AGPL quoted demo is unavailable pending D18, not passed. No further network retries were attempted.

Template-only licences (no document vendored; individual document terms await D18): `0BSD`, `Unlicense`, `CC0-1.0`, `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `Zlib`, `BlueOak-1.0.0`, `Python-2.0`, `CC-BY-4.0`, `BSL-1.0`, `MPL-2.0`, `LGPL-3.0-only`, `LGPL-3.0-or-later`, `EPL-2.0`, `AGPL-3.0-only`, `AGPL-3.0-or-later`, `SSPL-1.0`, `BUSL-1.1`, `Elastic-2.0`, `CC-BY-NC-4.0`; exceptions `Classpath-exception-2.0`, `GCC-exception-3.1`, `LLVM-exception`. GPL3 text alone does not establish GCC exception wording.

Every rule has a policy in `rules/rulePassages.ts`: either verified passage ids or an explicit template-only reason. Broad rules may have verified passages only for certain GNU leaves; `offeredPassages` filters by actual dependency/project ids. No passage is substituted for a missing document. Quote coverage must remain labelled incomplete.

## OSADL coverage and orientation

Row = project (leading), column = dependency (added). Header-covered catalogue ids: `0BSD`, `Unlicense`, `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `Zlib`, `BlueOak-1.0.0`, `Python-2.0`, `BSL-1.0`, `MPL-2.0`, `LGPL-2.1-only`, `LGPL-2.1-or-later`, `LGPL-3.0-only`, `LGPL-3.0-or-later`, `EPL-2.0`, `GPL-2.0-only`, `GPL-2.0-or-later`, `GPL-3.0-only`, `GPL-3.0-or-later`, `AGPL-3.0-only`, `AGPL-3.0-or-later`.

Catalogue ids absent as columns: `CC0-1.0`, `CC-BY-4.0`, `SSPL-1.0`, `BUSL-1.1`, `Elastic-2.0`, `CC-BY-NC-4.0`. Project choices absent as rows: `LicenseRef-Proprietary`. Every other configured project choice has a row. The matrix is a distribution oracle only; modes, scope, bundling and explicit context remain app rules. `Yes` → ok/conditions; `No` → conflict; `Same` → same licence ok/conditions; Unknown/Check dependency/undefined → needs_review.

## Exact-byte verification after Dirty Mode

`npx vitest run tests/corpus.test.ts` checks SHA-256 against the pinned values and `TEXTS[id] === readFileSync(raw, "utf8")`. M2 additionally statically decoded the string literal as JSON and compared its UTF-8 bytes to each raw file, without importing modules. `segmentLicence` keeps source substrings, stable numbered GNU sections, and paragraph fallback; tests guard against an indented in-section numeral being treated as a heading.
