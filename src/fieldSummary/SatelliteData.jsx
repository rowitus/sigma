import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useThemeColors } from "../farmData/ClimateChart.jsx";
import { MONTH_FULL, formatNumber } from "../farmData/format.js";
import usePrefersReducedMotion from "../farmData/usePrefersReducedMotion.js";
import MonthName from "./MonthName.jsx";
import TermInfo from "./TermInfo.jsx";

/**
 * "Seen from space": NASA MODIS greenness (NDVI) at this spot, every 16 days for the last
 * 3 complete years, with the bare-soil line and the months that looked bare (Req 21.4, 21.5).
 * Satellite data is shown as a time series for one 250 m pixel, never as a fine map.
 *
 * ndvi: the ndvi part of /api/rotation
 */
export default function SatelliteData({ ndvi }) {
  const c = useThemeColors();
  const reducedMotion = usePrefersReducedMotion();

  if (!ndvi || ndvi.status !== "ok") {
    return (
      <p className="note">
        Satellite greenness is not shown for this spot: {ndvi?.reason || "it is not available"}.
        {ndvi?.demo_farm === false && " Choose the demo farm to see it."}
      </p>
    );
  }

  const points = ndvi.series.map((p) => ({ t: Date.parse(p.date), ndvi: p.ndvi, date: p.date, quality: p.quality }));
  const bare = ndvi.bare_months || [];
  const tick = { fill: c["--text-secondary"], fontSize: 11 };
  const years = [...new Set(ndvi.series.map((p) => p.date.slice(0, 4)))];
  const yearTicks = years.map((y) => Date.parse(`${y}-01-01`));

  return (
    <div className="summary-card satellite">
      <p className="small-print">
        How green this spot looks in NASA's MODIS satellite images, every 16 days, {ndvi.period.replace("-", "–")}.{" "}
        <TermInfo term="ndvi" /> Each square covers 250 m (about 15 acres), so it may include roads, trees or a
        neighbor's field. This is measured from satellite images, unlike the estimated climate information above.
      </p>
      <div className="trend-chart ndvi-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={c["--divider"]} />
            <XAxis type="number" dataKey="t" domain={["dataMin", "dataMax"]} ticks={yearTicks}
              tickFormatter={(v) => new Date(v).getUTCFullYear()} tick={tick} tickLine={false} axisLine={false} />
            <YAxis type="number" dataKey="ndvi" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tick={tick}
              tickLine={false} axisLine={false} width={36} />
            <ReferenceLine y={ndvi.bare_threshold} stroke={c["--chart-temp"]} strokeDasharray="4 3"
              label={{ value: "bare below this", position: "insideBottomRight", fill: c["--text-secondary"], fontSize: 11 }} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="chart-tooltip">
                    <strong>{payload[0].payload.date}</strong>: Greenness score {formatNumber(payload[0].payload.ndvi, 2)}
                    {payload[0].payload.quality === "marginal" ? " (less reliable reading)" : ""}
                  </div>
                ) : null
              }
            />
            <Line data={points} dataKey="ndvi" stroke="#34a853" strokeWidth={2} dot={false} isAnimationActive={!reducedMotion} />
            <Scatter data={points} fill="#34a853" isAnimationActive={!reducedMotion} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <h4 className="trend-title">Typical greenness by month</h4>
      <ol className="ndvi-months month-row" aria-label="Typical greenness by month">
        {ndvi.monthly.map((m) => {
          const isBare = bare.includes(m.month);
          const label = `${MONTH_FULL[m.month - 1]}: ${m.typical_ndvi == null ? "no clear view" : `greenness score ${formatNumber(m.typical_ndvi, 2)}`}${isBare ? ", looked bare in most years" : ""}`;
          return (
            <li key={m.month} className={`ndvi-cell${isBare ? " bare" : ""}`} aria-label={label} title={label}>
              <span className="cal-month" aria-hidden="true"><MonthName month={m.month} /></span>
              <span className="ndvi-swatch" aria-hidden="true"
                style={m.typical_ndvi == null ? {} : { background: greenness(m.typical_ndvi), color: m.typical_ndvi > 0.55 ? "#fff" : "#1d1d1f" }}>
                {isBare ? "Bare" : m.typical_ndvi == null ? "–" : formatNumber(m.typical_ndvi, 1)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="small-print">
        {bare.length
          ? `Looked bare (greenness score below ${ndvi.bare_threshold}) in at least half the years in: ${bare.map((m) => MONTH_FULL[m - 1]).join(", ")}.`
          : `No month looked bare (greenness score below ${ndvi.bare_threshold}) in most years: the ground stayed covered.`}{" "}
        Source: {ndvi.source}, {ndvi.product}, prepared {ndvi.fetched_on}.
      </p>

      <table className="visually-hidden">
        <caption>Greenness score from satellite images every 16 days</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Greenness score</th></tr></thead>
        <tbody>
          {ndvi.series.map((p) => (
            <tr key={p.date}><th scope="row">{p.date}</th><td>{formatNumber(p.ndvi, 2)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Pale tan for bare ground to deep green for thick cover. */
function greenness(v) {
  const x = Math.max(0, Math.min(1, v));
  const hue = 40 + x * 80;      // 40 (tan) -> 120 (green)
  const light = 72 - x * 40;    // light -> darker green
  return `hsl(${hue}, 45%, ${light}%)`;
}
