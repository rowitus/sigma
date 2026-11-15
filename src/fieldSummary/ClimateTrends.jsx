import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useThemeColors } from "../farmData/ClimateChart.jsx";
import { formatNumber, formatMonthDay } from "../farmData/format.js";
import usePrefersReducedMotion from "../farmData/usePrefersReducedMotion.js";

const OUTLOOK_START = 2030;
const OUTLOOK_END = 2049;

/**
 * How the climate at this field has changed since 1981 (NASA POWER daily data), one small
 * chart per measure: a dot for each year, the trend line, and the 2030-2049 outlook range
 * when it is loaded. Each chart says the change per decade in words and whether it is clear.
 *
 * trends: the trends part of /api/rotation; outlook: its outlook part
 */
export default function ClimateTrends({ trends, outlook }) {
  if (!trends || trends.status !== "ok") {
    return (
      <p className="note">
        Climate trends are not available right now{trends?.reason ? `: ${trends.reason}` : ""}. The rotation options still
        use the other data.
      </p>
    );
  }
  const future = outlook?.status === "ok" ? Object.fromEntries((outlook.indicators || []).map((i) => [i.id, i])) : {};
  const items = trends.indicators.filter((i) => i.yearly?.length >= 10);

  return (
    <div className="trends">
      <p className="small-print">
        Each dot is one year of information for this area ({trends.source}, about {Math.round(trends.resolution_m / 1000)} km
        across). The line shows the long-term change without letting unusually extreme years dominate. "Likely change"
        means there is less than a 5% chance the pattern is just normal ups and downs. These trends describe the past;
        they do not predict any one future year.
        {outlook?.status === "ok" && " The shaded band on the right shows the range of possible averages for 2030–2049 from the climate models."}
      </p>
      <div className="trend-grid">
        {items.map((item) => (
          <TrendChart key={item.id} item={item} future={future[item.id]} />
        ))}
      </div>
      {outlook?.status === "ok" && (
        <p className="small-print">
          2030–2049 range: each model's change from 1991–2020 ({outlook.models?.join(", ")}, {outlook.scenario}) is added
          to NASA POWER's 1991–2020 average. Weather information from{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a>,{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
        </p>
      )}
    </div>
  );
}

function TrendChart({ item, future }) {
  const c = useThemeColors();
  const reducedMotion = usePrefersReducedMotion();
  const isDate = item.units === "day of year";
  const fmt = (v) => (v == null ? "–" : isDate ? formatMonthDay(doyToMonthDay(v)) : formatNumber(v, item.units === "0–1" ? 2 : 0));
  const years = item.yearly.map(([y]) => y);
  const first = years[0];
  const last = years[years.length - 1];
  const band = future?.future_value;
  const points = item.yearly.map(([year, value]) => ({ year, value }));
  const line = trendLine(item, points, first, last);
  const tick = { fill: c["--text-secondary"], fontSize: 11 };
  const titleId = `trend-${item.id}`;

  return (
    <figure className="summary-card trend" aria-labelledby={titleId}>
      <div className="trend-head">
        <h4 id={titleId} className="trend-title">{item.label}</h4>
        <span className={`chip ${item.clear ? "chip-clear" : "chip-none"}`}>
          {item.clear ? "Likely change" : "No clear pattern"}
        </span>
      </div>
      <p className="trend-words">{changeWords(item)}</p>
      <p className="trend-decades">
        {first}–{first + 9}: <strong>{fmt(item.first_decade_avg)}</strong> · {last - 9}–{last}:{" "}
        <strong>{fmt(item.last_decade_avg)}</strong>
        {band && (
          <>
            {" "}· 2030–2049: <strong>{fmt(band.mid)}</strong> <span className="muted">({fmt(band.low)}–{fmt(band.high)})</span>
          </>
        )}
      </p>
      <div className="trend-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={c["--divider"]} />
            <XAxis
              type="number"
              dataKey="year"
              domain={[first, band ? OUTLOOK_END : last]}
              ticks={band ? [1990, 2010, 2030, 2049] : [1990, 2000, 2010, 2020]}
              tick={tick}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="number"
              dataKey="value"
              domain={["auto", "auto"]}
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={isDate ? 58 : 40}
              tickFormatter={fmt}
            />
            {band && (
              <ReferenceArea x1={OUTLOOK_START} x2={OUTLOOK_END} y1={band.low} y2={band.high}
                fill={c["--chart-temp"]} fillOpacity={0.18} stroke="none" ifOverflow="extendDomain" />
            )}
            {band && (
              <ReferenceLine segment={[{ x: OUTLOOK_START, y: band.mid }, { x: OUTLOOK_END, y: band.mid }]}
                stroke={c["--chart-temp"]} strokeDasharray="4 3" strokeWidth={2} ifOverflow="extendDomain" />
            )}
            <Tooltip
              cursor={false}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="chart-tooltip">
                    <strong>{payload[0].payload.year}</strong>: {fmt(payload[0].payload.value)} {isDate ? "" : item.units}
                  </div>
                ) : null
              }
            />
            <Scatter data={points} fill={c["--text-secondary"]} shape={<Dot />} isAnimationActive={!reducedMotion} />
            {line && (
              <Line data={line} dataKey="value" stroke={c["--accent"]} strokeWidth={2.5} dot={false}
                isAnimationActive={!reducedMotion} legendType="none" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <table className="visually-hidden">
        <caption>{item.label} by year</caption>
        <thead><tr><th scope="col">Year</th><th scope="col">{item.label} ({item.units})</th></tr></thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.year}><th scope="row">{p.year}</th><td>{fmt(p.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Dot({ cx, cy, fill }) {
  return <circle cx={cx} cy={cy} r={2.4} fill={fill} fillOpacity={0.75} />;
}

/**
 * The trend line to draw. Theil-Sen gives the slope; the line goes through the point where
 * half the years sit above and half below (the median of value - slope x year).
 * For rare events (first vs last 15 years) draw the two 15-year averages as flat segments.
 */
function trendLine(item, points, first, last) {
  if (item.method === "theil_sen" && item.per_decade != null) {
    const slope = item.per_decade / 10;
    const offsets = points.map((p) => p.value - slope * p.year).sort((a, b) => a - b);
    const b = offsets[Math.floor(offsets.length / 2)];
    return [
      { year: first, value: slope * first + b },
      { year: last, value: slope * last + b },
    ];
  }
  if (item.method === "first_last_15") {
    const avg = (list) => list.reduce((s, p) => s + p.value, 0) / list.length;
    const a = points.slice(0, 15);
    const z = points.slice(-15);
    return [
      { year: a[0].year, value: avg(a) },
      { year: a[a.length - 1].year, value: avg(a) },
      { year: z[0].year, value: null }, // gap between the two periods
      { year: z[0].year, value: avg(z) },
      { year: z[z.length - 1].year, value: avg(z) },
    ];
  }
  return null;
}

/** "About 10 more days a year per decade", "About 3 days earlier each decade", ... */
export function changeWords(item) {
  if (item.method === "not_enough_years") return "Not enough years of information to spot a pattern.";
  if (item.method === "first_last_15") {
    const ch = item.change ?? 0;
    if (Math.abs(ch) < 0.05) return "About the same in the last 15 years as in the first 15; these rare events are compared using averages.";
    return `About ${formatNumber(Math.abs(ch), 1)} ${ch > 0 ? "more" : "fewer"} ${unitWords(item.units)} in the last 15 years than in the first 15; these rare events are compared using averages.`;
  }
  const v = item.per_decade ?? 0;
  const n = formatNumber(Math.abs(v), item.units === "0–1" ? 3 : Math.abs(v) < 10 ? 1 : 0);
  if (item.units === "day of year") {
    return Math.abs(v) < 0.05 ? "About the same date each decade." : `About ${n} days ${v > 0 ? "later" : "earlier"} each decade.`;
  }
  if (Math.abs(v) < 0.0005) return "About the same each decade.";
  if (item.units === "0–1") return `${v > 0 ? "Wetter" : "Drier"} by about ${n} per decade (0 is dry, 1 is saturated).`;
  const less = item.units.startsWith("mm") ? "less" : "fewer"; // "less rain", "fewer days"
  return `About ${n} ${v > 0 ? "more" : less} ${unitWords(item.units)} per decade.`;
}

function unitWords(units) {
  return { "days/year": "days a year", "nights/year": "nights a year", "mm/year": "mm a year", mm: "mm", days: "days" }[units] || units;
}

function doyToMonthDay(doy) {
  const d = new Date(Date.UTC(2001, 0, Math.round(doy)));
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
