// Server-side selection only. Table union is filtered to the facts' actual licence ids.
import type { RuleId } from './ruleIds.ts';
import { PASSAGES, canonicalTextId } from '../texts/index.ts';
export interface RulePassagePolicy { passages: readonly string[]; templateOnlyReason: string | null }
export const rulePassages: Readonly<Record<RuleId, RulePassagePolicy>> = {
  "R-UNKNOWN-UNRESOLVED": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-UNKNOWN-UNSUPPORTED": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-EXC-UNSUPPORTED": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-SA-REVIEW": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-EXC-CLASSPATH": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-EXC-GCC": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-EXC-CONTEXT": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-DEV-NOT-SHIPPED": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-INTERNAL-ANY": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-STRONG-HOSTED": {
    "passages": [
      "GPL-2.0-only#s0",
      "GPL-3.0-only#s2"
    ],
    "templateOnlyReason": null
  },
  "R-NET-HOSTED": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-NET-HOSTED-AGPL": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-NET-GPL3-COMBINATION": {
    "passages": [
      "GPL-3.0-only#s13"
    ],
    "templateOnlyReason": null
  },
  "R-WEAK-HOSTED": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-PERM-HOSTED": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-LIB-UNBUNDLED-COPYLEFT": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-LIB-UNBUNDLED-WEAK": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-LIB-UNBUNDLED-PERM": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-PAIR-APACHE-GPL2": {
    "passages": [
      "GPL-2.0-only#s6"
    ],
    "templateOnlyReason": null
  },
  "R-PAIR-APACHE-GPL3": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-PAIR-GPL2ONLY-GPL3": {
    "passages": [
      "GPL-2.0-only#s2",
      "GPL-2.0-only#s9"
    ],
    "templateOnlyReason": null
  },
  "R-PAIR-GPL-SAME": {
    "passages": [
      "GPL-3.0-only#s5",
      "GPL-3.0-only#s6"
    ],
    "templateOnlyReason": null
  },
  "R-PAIR-MPL-GPL": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-PAIR-MPL-GPL-CONTEXT": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-PAIR-LGPL-PROPRIETARY-BUNDLED": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-PAIR-EPL-GPL": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-SAME-LICENCE": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-PAIR-GPL3-GPL2ONLY": {
    "passages": [
      "GPL-3.0-only#s5",
      "GPL-2.0-only#s6"
    ],
    "templateOnlyReason": null
  },
  "R-PAIR-GPL3-AGPL": {
    "passages": [
      "GPL-3.0-only#s13"
    ],
    "templateOnlyReason": null
  },
  "R-PAIR-GPL2ONLY-AGPL": {
    "passages": [
      "GPL-2.0-only#s2",
      "GPL-2.0-only#s9"
    ],
    "templateOnlyReason": null
  },
  "R-PAIR-LGPL-GPL": {
    "passages": [
      "LGPL-2.1-only#s3"
    ],
    "templateOnlyReason": null
  },
  "R-PAIR-LGPL3-GPL2ONLY": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-DIST-PERM": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-DIST-WEAK-UNBUNDLED": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-DIST-WEAK-BUNDLED": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-DIST-STRONG": {
    "passages": [
      "GPL-2.0-only#s2",
      "GPL-3.0-only#s5"
    ],
    "templateOnlyReason": null
  },
  "R-DIST-NET": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-DIST-NET-AGPL": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  },
  "R-FALLBACK": {
    "passages": [],
    "templateOnlyReason": "No applicable verified passage in this run: text not vendored, metadata-only context, or generic rule spans multiple licences. See data/PROVENANCE.md (D18)."
  }
};
export function offeredPassages(ruleIds: readonly RuleId[], licenceIds: readonly string[]) {
  const allowed = new Set(licenceIds.map(canonicalTextId));
  const ids = new Set(ruleIds.flatMap(id => [...rulePassages[id].passages]));
  return PASSAGES.filter(p => ids.has(p.id) && allowed.has(p.licenceId));
}
