import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "./format.js";
import usePrefersReducedMotion from "./usePrefersReducedMotion.js";

const COLOR_VARS = ["--chart-temp", "--chart-rain", "--text-secondary", "--divider", "--accent", "--text"];

/**
 * Recharts draws SVG and sets colours as attributes, where CSS var() is not reliable,
 * so read the theme colours from CSS and re-read them when the OS theme changes.
 */
export function useThemeColors() {
  const read = () => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(COLOR_VARS.map((name) => [name, style.getPropertyValue(name).trim()]));
  };
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return undefined;
    const onChange = () => setColors(read());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return colors;
}

/** Tooltip shown on hover, and on keyboard focus (arrow keys move between months). */
function MonthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{d.full}</strong>
      <div>Average temperature: {formatNumber(d.temp)} °C</div>
      {d.low != null && d.high != null && (
        <div>
          Average low / high: {formatNumber(d.low)} / {formatNumber(d.high)} °C
        </div>
      )}
      <div>Rain: {formatNumber(d.rain, 0)} mm</div>
    </div>
  );
}

/**
 * Monthly temperature (line, left axis, °C) and rain (bars, right axis, mm), January to December.
 * rows: [{ month: "Jan", full: "January", temp, rain, low?, high? }] x 12
 * A hidden table with the same numbers is included for screen reader users.
 */
export default function ClimateChart({ rows }) {
  const reducedMotion = usePrefersReducedMotion();
  const c = useThemeColors();
  const tick = { fill: c["--text-secondary"], fontSize: 11 };
  const hasLowHigh = rows.every((r) => r.low != null && r.high != null);

  return (
    <figure className="chart">
      <figcaption className="chart-legend">
        <span className="legend-line" style={{ background: c["--chart-temp"] }} aria-hidden="true" />
        Average temperature (°C, left axis)
        <span className="legend-bar" style={{ background: c["--chart-rain"] }} aria-hidden="true" />
        Rain (mm, right axis)
        <span className="visually-hidden">. The same values are listed in the table that follows.</span>
      </figcaption>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke={c["--divider"]} />
            <XAxis dataKey="month" tick={tick} tickLine={false} axisLine={false} interval={0} />
            <YAxis
              yAxisId="temp"
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v) => `${v}°C`}
            />
            <YAxis
              yAxisId="rain"
              orientation="right"
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={50}
              tickFormatter={(v) => `${v} mm`}
            />
            <Tooltip content={<MonthTooltip />} cursor={{ fill: c["--divider"] }} />
            <Bar
              yAxisId="rain"
              dataKey="rain"
              name="Rain"
              fill={c["--chart-rain"]}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!reducedMotion}
            />
            <Line
              yAxisId="temp"
              dataKey="temp"
              name="Average temperature"
              stroke={c["--chart-temp"]}
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: c["--chart-temp"] }}
              isAnimationActive={!reducedMotion}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <table className="visually-hidden">
        <caption>Typical climate by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Average temperature (°C)</th>
            {hasLowHigh && <th scope="col">Average low (°C)</th>}
            {hasLowHigh && <th scope="col">Average high (°C)</th>}
            <th scope="col">Rain (mm)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <th scope="row">{r.full}</th>
              <td>{formatNumber(r.temp)}</td>
              {hasLowHigh && <td>{formatNumber(r.low)}</td>}
              {hasLowHigh && <td>{formatNumber(r.high)}</td>}
              <td>{formatNumber(r.rain, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
