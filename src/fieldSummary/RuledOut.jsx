/**
 * Crops the rules ruled out for this field, and options not suggested, each with the reason.
 * Shown so the farmer can disagree: local knowledge may say otherwise.
 */
export default function RuledOut({ exclusions, notSuggested }) {
  if (!exclusions?.length && !notSuggested?.length) return null;
  // One line per crop even when several rules apply.
  const byCrop = {};
  for (const e of exclusions || []) (byCrop[e.crop_id] ||= { name: e.crop_name, reasons: [] }).reasons.push(e.text);
  return (
    <details className="summary-card details ruled-out">
      <summary>Ruled out for this field ({Object.keys(byCrop).length} crops)</summary>
      <p className="small-print">
        These crops were left out of every option. If you know they grow well here, tell us what you grow now
        above, or ask your county extension agent.
      </p>
      <ul>
        {Object.entries(byCrop).map(([id, c]) => (
          <li key={id}><strong>{c.name}:</strong> {c.reasons.join(" ")}</li>
        ))}
        {(notSuggested || []).map((n) => (
          <li key={n.id}><strong>{n.name}:</strong> {n.reason}</li>
        ))}
      </ul>
    </details>
  );
}
