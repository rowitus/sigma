/** One key fact as a large number with its unit and a plain label underneath. */
export default function Stat({ value, unit, label }) {
  return (
    <div className="stat">
      <div className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
