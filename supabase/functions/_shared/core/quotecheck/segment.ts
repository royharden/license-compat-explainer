// Pure deterministic segmentation; text is always a verbatim source substring.
export interface Passage { id: string; licenceId: string; text: string }
export function segmentLicence(licenceId: string, text: string): Passage[] {
  // GNU primary headings have exactly two spaces; a four-space embedded “7.” is not a section.
  const headings = [...text.matchAll(/^ {2}(\d+)\. (?! )/gm)];
  if (headings.length === 0) {
    return text.split(/\r?\n[ \t]*\r?\n/).filter(p => p.trim()).map((p,i) => ({ id: `${licenceId}#p${i+1}`, licenceId, text: p }));
  }
  const endMarker = text.indexOf('END OF TERMS AND CONDITIONS');
  const end = endMarker < 0 ? text.length : endMarker;
  const seen = new Set<string>();
  return headings.filter(h => h.index < end).map((h,i,all) => {
    const id = `${licenceId}#s${h[1]}`;
    if (seen.has(id)) throw new Error('duplicate section id');
    seen.add(id);
    return { id, licenceId, text: text.slice(h.index, all[i+1]?.index ?? end).trimEnd() };
  });
}
