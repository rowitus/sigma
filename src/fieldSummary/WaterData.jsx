import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRef } from "react";
import { useThemeColors } from "../farmData/ClimateChart.jsx";
import { MONTH_FULL, MONTH_NAMES, formatNumber } from "../farmData/format.js";
import usePrefersReducedMotion from "../farmData/usePrefersReducedMotion.js";
import { useElementSize } from "../layoutHooks.js";
import TermInfo from "./TermInfo.jsx";

const GW_COLOR = "#2f6db5";
const ROOT_COLOR = "#8a5a2b";
const YEARS_SHOWN = 10; // the groundwater chart shows the last 10 years, so the recent picture is readable

/**
 * NASA satellite water data (Req 23.7, 23.8, 23.10): IMERG rain next to NASA POWER rain for the
 * same months, and GRACE groundwater and root-zone soil moisture as drought percentiles.
 * Location-level time series only, never a map, each labelled with its resolution.
 *
 * water: the water part of /api/rotation
 */
export default function WaterData({ water }) {
  const c = useThemeColors();
  const reducedMotion = usePrefersReducedMotion();

  if (!water || water.status !== "ok") {
    return (
      <p className="note">
        NASA satellite water data is not shown for this spot: {water?.reason || "it is not available"}
      </p>
    );
  }

  const tick = { fill: c["--text-secondary"], fontSize: 11 };
  return (
    <div className="summary-card satellite water">
      <RainCompare rain={water.rain} c={c} tick={tick} reducedMotion={reducedMotion} />
      <Percentiles water={water} c={c} tick={tick} reducedMotion={reducedMotion} />
      {water.smap?.reason && <p className="small-print">{water.smap.reason}</p>}
    </div>
  );
}

function RainCompare({ rain, c, tick, reducedMotion }) {
  const chartRef = useRef(null);
  const { width } = useElementSize(chartRef);
  const wide = width >= 840; // 12 groups x about 70 px each fit "September"
  if (!rain || rain.status !== "ok") {
    return <p className="note">Satellite rain (IMERG) is not available here: {rain?.reason || "no data"}.</p>;
  }
  const cmp = rain.calendar_vs_power;
  const rows = MONTH_FULL.map((m, i) => ({
    month: m,
    short: MONTH_NAMES[i],
    imerg: cmp ? cmp.imerg_mm?.[i] : rain.calendar?.[i],
    power: cmp ? cmp.power_mm?.[i] : null,
  }));
  const period = (cmp?.period || rain.calendar_period || "").replace("-", "–");
  const t = rain.trend;
  return (
    <>
      <h4 className="trend-title">Rain measured from space vs. the weather model</h4>
      <p className="small-print">
        Average rain in each month, {period}: NASA GPM IMERG (satellites, about {Math.round(rain.resolution_m / 1000)} km)
        next to NASA POWER (model, about 50 km). {rain.note}
      </p>
      <div className="water-chart" aria-hidden="true" ref={chartRef}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={c["--divider"]} />
            {/* Full month names when each bar group has room (about 70 px), else "Jan", "Feb"... */}
            <XAxis dataKey="month" tick={tick} tickLine={false} axisLine={false} interval={0}
              tickFormatter={(m, i) => (wide ? m : rows[i]?.short ?? m)} />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={36} unit="" />
            <Tooltip cursor={{ fill: c["--divider"] }} content={<RainTip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="imerg" name="Satellite (IMERG), mm" fill={c["--chart-rain"]} radius={[3, 3, 0, 0]}
              isAnimationActive={!reducedMotion} />
            {cmp && (
              <Bar dataKey="power" name="Model (NASA POWER), mm" fill={c["--text-secondary"]} radius={[3, 3, 0, 0]}
                isAnimationActive={!reducedMotion} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="small-print">
        Yearly satellite rain, {rain.recent_period?.replace("-", "–")}: about {formatNumber(rain.recent_avg, 0)} mm
        ({formatNumber(rain.recent_avg / 25.4, 1)} in) a year.
        {t?.method === "theil_sen" &&
          ` Since ${t.years.slice(0, 4)}: ${t.per_decade >= 0 ? "about " + formatNumber(t.per_decade, 0) + " mm more" : "about " + formatNumber(-t.per_decade, 0) + " mm less"} per decade, ${t.clear ? "a clear change" : "which could still be normal ups and downs"}.`}{" "}
        <TermInfo term="clear_change" /> Source: {rain.source}, {rain.period}.
      </p>
      <table className="visually-hidden">
        <caption>Average monthly rain, satellite and model, {period}</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">IMERG (mm)</th><th scope="col">NASA POWER (mm)</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.month}><th scope="row">{r.month}</th><td>{fmt(r.imerg)}</td><td>{fmt(r.power)}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function RainTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((p) => <div key={p.dataKey}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  );
}

function Percentiles({ water, c, tick, reducedMotion }) {
  const gw = water.groundwater?.status === "ok" ? water.groundwater : null;
  const rz = water.root_zone?.status === "ok" ? water.root_zone : null;
  if (!gw && !rz) {
    return <p className="note">GRACE groundwater and soil moisture are not available here: {water.groundwater?.reason || "no data"}.</p>;
  }
  // One row per month, both series side by side, for the last YEARS_SHOWN years.
  const byMonth = new Map();
  for (const [key, part] of [["gw", gw], ["rz", rz]]) {
    for (const m of part?.monthly || []) {
      byMonth.set(m.month, { ...(byMonth.get(m.month) || { month: m.month }), [key]: m.pct });
    }
  }
  const all = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  const lastYear = Number(all[all.length - 1]?.month.slice(0, 4));
  const rows = all.filter((r) => Number(r.month.slice(0, 4)) > lastYear - YEARS_SHOWN);
  const yearTicks = rows.filter((r) => r.month.endsWith("-01")).map((r) => r.month);
  const ref = gw || rz;
  return (
    <>
      <h4 className="trend-title">Groundwater and soil moisture (GRACE satellites)</h4>
      <p className="small-print">
        Each value is a percentile <TermInfo term="percentile" />: 10 means drier than 90 % of the same weeks in
        1948–2012, 90 means wetter than 90 %. Below 20 (shaded) is drought territory.{" "}
        <TermInfo term="grace" /> {ref.note}
      </p>
      <div className="water-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={c["--divider"]} />
            <ReferenceArea y1={0} y2={20} fill={c["--chart-temp"]} fillOpacity={0.12} />
            <XAxis dataKey="month" ticks={yearTicks} tickFormatter={(m) => m.slice(0, 4)} tick={tick}
              tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} ticks={[0, 20, 50, 80, 100]} tick={tick} tickLine={false} axisLine={false} width={36} />
            <Tooltip content={<PctTip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {gw && <Line dataKey="gw" name="Groundwater" stroke={GW_COLOR} strokeWidth={2} dot={false}
              isAnimationActive={!reducedMotion} connectNulls />}
            {rz && <Line dataKey="rz" name="Root-zone soil moisture" stroke={ROOT_COLOR} strokeWidth={2} dot={false}
              isAnimationActive={!reducedMotion} connectNulls />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="water-facts">
        {gw && <li>Groundwater: {fmt(gw.latest.pct)} in the week of {gw.latest.date}; {fmt(gw.last_12m_avg)} on average over the last 12 months.</li>}
        {rz && <li>Root-zone soil moisture: {fmt(rz.latest.pct)} in the week of {rz.latest.date}; {fmt(rz.last_12m_avg)} on average over the last 12 months.</li>}
      </ul>
      <p className="small-print">Source: {ref.source}, weekly, about {Math.round(ref.resolution_m / 1000)} km, {ref.period}.</p>
      <table className="visually-hidden">
        <caption>Monthly groundwater and root-zone soil moisture percentiles</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">Groundwater</th><th scope="col">Root-zone soil moisture</th></tr></thead>
        <tbody>
          {rows.map((r) => <tr key={r.month}><th scope="row">{r.month}</th><td>{fmt(r.gw)}</td><td>{fmt(r.rz)}</td></tr>)}
        </tbody>
      </table>
    </>
  );
}

function PctTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((p) => <div key={p.dataKey}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  );
}

function fmt(v) {
  return v == null ? "–" : formatNumber(v, 0);
}
