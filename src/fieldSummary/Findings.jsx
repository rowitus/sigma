import { evidenceText } from "./labels.js";
import TermInfo, { TERMS } from "./TermInfo.jsx";

/**
 * What the data says about this field: rising heat, slow-soaking soil, flood risk and so on.
 * Each finding names the numbers and sources it is based on.
 */
export default function Findings({ findings }) {
  if (!findings?.length) {
    return <p className="small-print">No findings: the data sources for this field did not answer.</p>;
  }
  return (
    <ul className="findings">
      {findings.map((f) => (
        <li key={f.id} className="summary-card finding">
          <h4 className="finding-title">{f.title}</h4>
          <p className="finding-text">{f.text}</p>
          {f.evidence?.length > 0 && (
            <p className="evidence">Based on: {f.evidence.map(evidenceText).join("; ")}</p>
          )}
          {f.terms?.some((t) => TERMS[t]) && (
            <p className="terms">
              <span className="visually-hidden">Terms explained: </span>
              {f.terms.map((t) => <TermInfo key={t} term={t} />)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
