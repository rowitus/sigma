import ClimateChart from "./ClimateChart.jsx";
import SunChart from "./SunChart.jsx";
import SourceTag from "./SourceTag.jsx";
import Stat from "./Stat.jsx";
import {
  MONTH_FULL,
  MONTH_NAMES,
  byVariable,
  firstValue,
  formatMonthDay,
  formatNumber,
  monthlySeries,
} from "./format.js";

/** Climate view: key numbers, the monthly chart, and the note that this is regional data. */
export default function ClimateView({ records }) {
  const g = byVariable(records);
  const temp = monthlySeries(g, "temperature_mean");
  const rain = monthlySeries(g, "precipitation");
  const low = monthlySeries(g, "temperature_min");
  const high = monthlySeries(g, "temperature_max");
  const sun = monthlySeries(g, "solar_radiation");

  const frostDays = firstValue(g, "frost_days_per_year");
  const heatDays = firstValue(g, "heat_days_per_year");
  const lastFrost = firstValue(g, "last_spring_frost");
  const firstFrost = firstValue(g, "first_fall_frost");
  const period = (g.frost_days_per_year || g.heat_days_per_year)?.[0]?.date;

  const stats = [];
  if (temp) {
    const mean = temp.reduce((a, b) => a + b, 0) / 12;
    stats.push({ value: formatNumber(mean), unit: "°C", label: "Average temperature over the year" });
  }
  if (rain) {
    stats.push({ value: formatNumber(rain.reduce((a, b) => a + b, 0), 0), unit: "mm", label: "Rain per year" });
  }
  if (frostDays != null) stats.push({ value: formatNumber(frostDays, 0), unit: "days", label: "Frost days per year (low at or below 0 °C)" });
  if (heatDays != null) stats.push({ value: formatNumber(heatDays, 0), unit: "days", label: "Hot days per year (high above 35 °C)" });
  if (lastFrost != null) stats.push({ value: formatMonthDay(lastFrost), label: "Typical last spring frost" });
  if (firstFrost != null) stats.push({ value: formatMonthDay(firstFrost), label: "Typical first fall frost" });

  const rows =
    temp && rain
      ? MONTH_NAMES.map((month, i) => ({
          month,
          full: MONTH_FULL[i],
          temp: temp[i],
          rain: rain[i],
          low: low?.[i] ?? null,
          high: high?.[i] ?? null,
        }))
      : null;

  return (
    <>
      <h3 className="view-heading">Typical climate</h3>
      <div className="stat-grid">
        {stats.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>
      {period && <p className="small-print">Frost and heat estimates are yearly averages from daily data for {period.replace("-", "–")}.</p>}

      <h4 className="section-heading">Month by month</h4>
      {rows ? <ClimateChart rows={rows} /> : <p className="small-print">Monthly values are incomplete for this location.</p>}

      {sun && (
        <>
          <h4 className="section-heading">Sunshine</h4>
          <SunChart values={sun} />
        </>
      )}

      <p className="note">
        NASA POWER climate estimates cover an area about 50 km across. They describe the regional climate, not the
        weather in your field.
      </p>
      <SourceTag records={records} />
    </>
  );
}
