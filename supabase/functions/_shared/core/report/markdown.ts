import type { JsonExport } from './json.ts';
import { OPTION_LABELS } from '../explain/options.ts';

/** Escape untrusted metadata in prose/table cells, including pipes/backticks and HTML. */
export function escapeMarkdown(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[\r\n]+/g, ' ').replace(/([\\`*_[\]{}()#+.!|~\-])/g, '\\$1');
}
export function buildMarkdownExport(doc: JsonExport): string {
  const e = escapeMarkdown;
  const lines = [
    '# License Compatibility Explainer report', '',
    `Project key: ${e(doc.projectKey)}`, `Generated: ${e(doc.generatedAt)}`, '',
    `Project licence: ${e(doc.settings.projectLicense)}; mode: ${e(doc.settings.mode)}; bundled: ${doc.settings.bundled ? 'yes' : 'no'}.`,
    `Acknowledgements (${e(doc.acknowledgementsLabel)}): unmodified_use=${doc.settings.acknowledgements.unmodified_use}; mpl_secondary_eligible=${doc.settings.acknowledgements.mpl_secondary_eligible}.`,
    `Rules edition: ${e(doc.rulesEdition)}; settings hash: ${e(doc.settingsHash)}.`, '',
    e(doc.disclaimer), '',
    '## Findings grouped by verdict', '',
  ];
  for (const verdict of ['conflict', 'needs_review', 'unknown', 'ok_with_conditions', 'ok'] as const) {
    const findings = doc.findings.filter((finding) => finding.verdict === verdict);
    if (!findings.length) continue;
    lines.push(`### ${e(verdict)} (${findings.length})`, '');
    for (const f of findings) {
      lines.push(`#### ${e(f.name)}@${e(f.version)}`, '',
        `Engine verdict: ${e(f.verdict)}; rule(s): ${e(f.ruleIds.join(', '))}.`,
        `Occurrence: ${e(f.occurrence)}; scope: ${e(f.scope)}.`,
        `Path: ${e(f.path?.join(' > ') ?? f.pathNote ?? 'path unavailable')}; location: ${e(f.location ?? 'unavailable')}; source row: ${f.sourceRow ?? 'unavailable'}.`,
        `Licence as written: ${e(f.rawLicence)}; normalised: ${e(f.exprNormalised ?? `unresolved (${f.reason ?? 'unknown'})`)}.`,
        `Chosen OR side: ${e(f.chosenSide ?? 'none')}.`,
        `Explanation label: ${e(f.explanation.label)}; ${e(f.explanation.fallbackReason ?? 'quotes verified; summary not checked for legal meaning')}; dropped quotes: ${f.explanation.droppedQuotes}.`, '',
        'Obligations:', ...(f.obligations.length ? f.obligations.map((item) => `- ${e(item)}`) : ['- None identified by the modelled rule.']), '',
        'Assumptions:', ...(f.assumptions.length ? f.assumptions.map((item) => `- ${e(item)}`) : ['- None listed.']), '',
        'Options to review:', ...(f.options.length ? f.options.map((id) => `- ${e(OPTION_LABELS[id])}`) : ['- None listed.']), '');
      if (f.explanation.label === 'model') lines.push(e(f.explanation.summary), '', ...f.explanation.quotes.map(q => `> ${e(q.text)} (${e(q.passage_id)})`), '');
      for (const overlay of doc.rulings.filter((item) => item.event.occurrence === f.occurrence)) {
        lines.push(`Review event: ${e(overlay.event.action)} (${e(overlay.event.kind)}); ${e(overlay.status)}; latest=${overlay.latest}; applied=${overlay.applied}.`,
          `Reason: ${e(overlay.event.reason || 'No reason supplied.')}`, `Recorded: ${e(overlay.event.created_at)}; id: ${e(overlay.event.id)}.`,
          `Recorded expression hash: ${e(overlay.event.expr_hash)}; settings hash: ${e(overlay.event.settings_hash)}; edition: ${e(overlay.event.rules_edition)}.`,
          `Recorded settings: ${e(JSON.stringify(overlay.event.settings))}.`,
          `Context differences: ${e(overlay.differences.join('; ') || 'none')}.`, '');
      }
    }
  }
  lines.push('## Coverage gaps', '');
  lines.push(...(doc.coverageGaps.length ? doc.coverageGaps.map((gap) => `- ${e(gap.kind)}: ${e(gap.detail)}; from: ${e(gap.from ?? 'unknown')}; dependency: ${e(gap.dependency ?? 'unknown')}.`) : ['None reported.']), '');
  lines.push('## Warnings', '', ...(doc.warnings.length ? doc.warnings.map((warning) => `- ${e(warning.code)}: ${e(warning.message)}`) : ['None reported.']), '');
  const absent = doc.rulings.filter((item) => item.status === 'not_in_report');
  if (absent.length) lines.push('## Rulings for absent occurrences (history only)', '', ...absent.map((item) => `- ${e(item.event.occurrence)}: ${e(item.event.action)}; ${e(item.event.reason)}; not applied.`), '');
  lines.push('## Notes', '', ...doc.notes.map((note) => `- ${e(note)}`), '', e(doc.osadlAttribution), '', e(doc.disclaimer), '');
  return lines.join('\n');
}
