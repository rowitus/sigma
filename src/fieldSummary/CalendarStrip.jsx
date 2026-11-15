import { MONTH_FULL } from "../farmData/format.js";
import { cropColor, cropName } from "./labels.js";
import MonthName from "./MonthName.jsx";

/**
 * Month-by-month view of a rotation: what is in the ground, and when the soil is bare.
 * Colour is never the only signal: bare months are hatched and say "Bare", and the heat,
 * frost and wettest-month flags are symbols with a legend. Each month has a full aria-label.
 *
 * calendar: [[{month, crop_ids, bare, heat, frost, wettest}, ... 12], ... one row per year]
 */
export default function CalendarStrip({ calendar, crops }) {
  if (!calendar?.length) return null;
  const multiYear = calendar.length > 1;
  return (
    <div className="calendar">
      {calendar.map((year, yi) => (
        <div key={yi} className="cal-year">
          {multiYear && <div className="cal-year-label">Year {yi + 1}</div>}
          <ol className="cal-row month-row" aria-label={multiYear ? `Year ${yi + 1} of the rotation` : "The year, month by month"}>
            {year.map((cell) => {
              const names = cell.crop_ids.map((c) => cropName(crops, c));
              const flags = [cell.heat && "heat-stress month", cell.frost && "frost possible", cell.wettest && "wettest month"].filter(Boolean);
              const cover = cell.bare ? "bare soil" : names.length ? names.join(" and ") : "green cover seen by satellite";
              const label = `${MONTH_FULL[cell.month - 1]}: ${cover}${flags.length ? `, ${flags.join(", ")}` : ""}`;
              return (
                <li key={cell.month} className={`cal-cell${cell.bare ? " bare" : ""}`} aria-label={label} title={label}>
                  <span className="cal-month" aria-hidden="true"><MonthName month={cell.month} /></span>
                  <span className="cal-bands" aria-hidden="true">
                    {cell.bare ? (
                      <span className="cal-bare">Bare</span>
                    ) : !cell.crop_ids.length ? (
                      <span className="cal-bare">Green</span>
                    ) : (
                      cell.crop_ids.map((c) => <span key={c} className="cal-band" style={{ background: cropColor(crops, c) }} />)
                    )}
                  </span>
                  <span className="cal-flags" aria-hidden="true">
                    {cell.heat && "☀"}
                    {cell.frost && "❄"}
                    {cell.wettest && "💧"}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

/** Legend shared by all calendars (shown once above the cards). */
export function CalendarLegend({ crops, cropIds }) {
  return (
    <div className="cal-legend" aria-label="Calendar legend">
      {cropIds.map((c) => (
        <span key={c} className="cal-legend-item">
          <span className="cal-swatch" style={{ background: cropColor(crops, c) }} aria-hidden="true" />
          {cropName(crops, c)}
        </span>
      ))}
      <span className="cal-legend-item"><span className="cal-swatch hatch" aria-hidden="true" />Bare soil</span>
      <span className="cal-legend-item"><span aria-hidden="true">☀</span> Heat-stress month (average high above 35 °C)</span>
      <span className="cal-legend-item"><span aria-hidden="true">❄</span> Frost possible</span>
      <span className="cal-legend-item"><span aria-hidden="true">💧</span> Wettest month</span>
    </div>
  );
}
