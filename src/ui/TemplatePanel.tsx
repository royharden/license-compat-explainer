import type { Finding } from '@core/types.ts';
import { templateExplanation } from '@core/explain/template.ts';

/** Template explanation built from rule-table text only. No model is called in this build. */
export function TemplatePanel({ finding }: { finding: Finding }) {
  const t = templateExplanation(finding);
  return (
    <div className="explanation">
      <p className="explanation-label">
        <span className="badge template">{t.label}</span> rule-table text; model explanations are not built yet
      </p>
      {t.sections.map((s) => (
        <div key={s.ruleId} className="explanation-section">
          <h4>
            <code>{s.ruleId}</code> {s.title}
            {s.stub && <span className="badge stub">stub</span>}
          </h4>
          <p>{s.rationale}</p>
        </div>
      ))}
      {t.obligations.length > 0 && (
        <>
          <h4>Obligations</h4>
          <ul>
            {t.obligations.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </>
      )}
      {t.assumptions.length > 0 && (
        <>
          <h4>Assumptions</h4>
          <ul>
            {t.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </>
      )}
      {t.options.length > 0 && (
        <>
          <h4>Options to review</h4>
          <ul>
            {t.options.map((o) => (
              <li key={o.id}>{o.label}</li>
            ))}
          </ul>
        </>
      )}
      <p className="disclaimer small">{t.disclaimer}</p>
    </div>
  );
}
