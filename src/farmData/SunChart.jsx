import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useThemeColors } from "./ClimateChart.jsx";
import { MONTH_FULL, MONTH_NAMES, formatNumber } from "./format.js";
import usePrefersReducedMotion from "./usePrefersReducedMotion.js";

/**
 * Monthly sunshine reaching the ground (NASA POWER all-sky solar radiation, kWh/m²/day).
 * It drives how fast crops grow and how much water they use. A hidden table repeats the numbers.
 */
export default function SunChart({ values }) {
  const c = useThemeColors();
  const reducedMotion = usePrefersReducedMotion();
  const rows = MONTH_NAMES.map((month, i) => ({ month, full: MONTH_FULL[i], sun: values[i] }));
  const tick = { fill: c["--text-secondary"], fontSize: 11 };
  const best = rows.reduce((a, b) => (b.sun > a.sun ? b : a));
  const least = rows.reduce((a, b) => (b.sun < a.sun ? b : a));

  return (
    <figure className="chart">
      <figcaption className="small-print">
        Sunshine reaching the ground, per day: most in {best.full} ({formatNumber(best.sun)} kWh/m²), least in{" "}
        {least.full} ({formatNumber(least.sun)} kWh/m²). More sun means faster growth and more water use.
      </figcaption>
      <div className="chart-wrap sun-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={c["--divider"]} />
            <XAxis dataKey="month" tick={tick} tickLine={false} axisLine={false} interval={0} />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={34} />
            <Tooltip
              cursor={{ fill: c["--divider"] }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="chart-tooltip">
                    <strong>{payload[0].payload.full}</strong>: {formatNumber(payload[0].payload.sun)} kWh/m² a day
                  </div>
                ) : null
              }
            />
            <Bar dataKey="sun" name="Sunshine" fill="#f5a623" radius={[3, 3, 0, 0]} isAnimationActive={!reducedMotion} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="visually-hidden">
        <caption>Sunshine reaching the ground by month (kWh per square metre per day)</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}><th scope="row">{r.full}</th><td>{formatNumber(r.sun)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
