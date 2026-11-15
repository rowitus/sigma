import CalendarStrip from "./CalendarStrip.jsx";
import ScoreBars from "./ScoreBars.jsx";
import { CONFIDENCE, cropName, evidenceText } from "./labels.js";

/**
 * One rotation option: the current rotation (pinned first) or a suggested alternative.
 * Shows the crops with their sources, the overall scores, the calendar, the six scores,
 * and expandable sections: why, benefits, risks to check locally, 2030-2049 risks,
 * soil health notes, and what we don't know.
 *
 * rank: 1-based position among the alternatives (null for the current rotation)
 * moved: "up" | "down" | null, compared with the previous ranking
 */
export default function StrategyCard({ strategy: s, crops, rank, moved }) {
  const conf = CONFIDENCE[s.confidence] || CONFIDENCE.low;
  const today = s.scores?.today?.overall;
  const outlook = s.scores?.outlook?.overall;
  const titleId = `strategy-${s.id}`;

  return (
    <article className={`summary-card strategy${s.is_current ? " current" : ""}${s.best_fit ? " best" : ""}`} aria-labelledby={titleId}>
      <div className="strategy-head">
        <div className="badges">
          {s.is_current && <span className="badge">What you grow now</span>}
          {rank != null && <span className="badge neutral">Option {rank}</span>}
          {s.best_fit && <span className="badge accent">Best fit for your priorities</span>}
          {moved && <span className="badge neutral">{moved === "up" ? "▲ Moved up" : "▼ Moved down"}</span>}
        </div>
        <h3 className="card-title" id={titleId}>{s.name}</h3>
        {s.crop_ids?.length > 0 && (
          <ul className="crop-chips" aria-label="Crops in this rotation">
            {s.crop_ids.map((c) => (
              <li key={c}>
                <span>{cropName(crops, c)}</span>
                {crops?.[c]?.sources?.[0] && (
                  <a href={crops[c].sources[0].url} target="_blank" rel="noreferrer" className="source-link"
                    aria-label={`Source for ${cropName(crops, c)}: ${crops[c].sources[0].title} (opens in a new tab)`}>
                    source
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overall">
        <div className="overall-item">
          <span className="overall-num">{today ?? "–"}</span>
          <span className="overall-label">Overall today</span>
        </div>
        <div className="overall-item">
          <span className="overall-num">{outlook ?? "–"}</span>
          <span className="overall-label">{outlook == null ? "2030-2049 (outlook not loaded)" : "Overall 2030-2049"}</span>
        </div>
        <div className={`confidence conf-${s.confidence}`} title={conf.text}>
          <span aria-hidden="true">{s.confidence === "high" ? "●●●" : s.confidence === "medium" ? "●●○" : "●○○"}</span> {conf.label}
        </div>
      </div>

      <CalendarStrip calendar={withSatellite(s)} crops={crops} />
      {s.satellite_bare_months && (
        <p className="small-print cal-source">
          Bare months here are what NASA's MODIS satellite saw ({(s.satellite_period || "").replace("-", "–")}), not the crop
          calendar estimate.
        </p>
      )}

      <ScoreBars scores={s.scores} parts={s.score_parts} weights={s.weights} />

      <Section title="Why this option" open>
        <ul className="reasons">
          {s.why.map((w, i) => (
            <li key={i}>
              {w.text}
              {w.evidence?.length > 0 && (
                <span className="evidence">Based on: {w.evidence.map(evidenceText).join("; ")}</span>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {s.benefits?.length > 0 && (
        <Section title="Benefits">
          <ul>{s.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </Section>
      )}

      <Section title={`Risks to check locally (${s.risks.length})`}>
        <ul className="risks">
          {s.risks.map((r, i) => (
            <li key={i} className={r.local_review ? "local-review" : ""}>
              {r.local_review && <span className="visually-hidden">Check locally: </span>}
              {r.text}
            </li>
          ))}
        </ul>
      </Section>

      {s.future_risks?.length > 0 && (
        <Section title={`Risks under the 2030-2049 outlook (${s.future_risks.length})`}>
          <ul className="risks">
            {s.future_risks.map((r, i) => <li key={i} className="local-review">{r.text}</li>)}
          </ul>
        </Section>
      )}

      {s.soil_health_notes?.length > 0 && (
        <Section title="Soil health notes">
          <ul>{s.soil_health_notes.map((n, i) => <li key={i}><strong>{n.crop_name}:</strong> {n.text}</li>)}</ul>
        </Section>
      )}

      <Section title="What we don't know">
        <p className="small-print">{conf.text}</p>
        <ul>
          {s.gaps.map((g, i) => <li key={i}>{g}</li>)}
          {(s.missing_facts || []).filter((m) => !s.gaps.some((g) => g.includes(m))).map((m, i) => (
            <li key={`m${i}`}>Not used: {m}.</li>
          ))}
        </ul>
      </Section>
    </article>
  );
}

/**
 * For the current rotation, use the satellite's bare months in place of the crop-calendar
 * estimate (Req 21.3). The crops shown in each month stay as they are.
 */
function withSatellite(s) {
  if (!s.calendar || !s.satellite_bare_months) return s.calendar;
  const bare = new Set(s.satellite_bare_months);
  return s.calendar.map((year) => year.map((cell) => ({ ...cell, bare: bare.has(cell.month) })));
}

function Section({ title, open = false, children }) {
  return (
    <details className="details" open={open}>
      <summary>{title}</summary>
      {children}
    </details>
  );
}
