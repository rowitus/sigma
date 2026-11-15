import { formatNumber } from "../farmData/format.js";
import { groupDays } from "./groupDays.js";

function dayLabel(card) {
  const d = new Date(`${card.date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? card.name : `${card.name} · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/**
 * "Next 7 days" from the National Weather Service: one card per day with the high and low,
 * rain chance, wind and short forecast. It does not wait for the rotation answer.
 *
 * weather: the useWeather result; dismissedCount / onRestore: the "show dismissed alerts" button
 */
export default function ForecastCard({ weather, dismissedCount = 0, onRestore }) {
  const restore = dismissedCount > 0 && (
    <button type="button" className="btn btn-small forecast-btn" onClick={onRestore}>
      Show {dismissedCount} dismissed alert{dismissedCount === 1 ? "" : "s"}
    </button>
  );

  if (!weather || weather.status === "idle") return null;

  if (weather.status === "loading") {
    return (
      <section className="summary-card forecast-card" aria-labelledby="forecast-h">
        <h3 id="forecast-h" className="card-title">Next 7 days</h3>
        <div role="status" className="view-state" aria-busy="true">
          <p className="view-state-text">Loading the forecast… A first look at a new spot can take up to a minute on a slow connection.</p>
          <div className="skeleton" style={{ width: "60%" }} />
        </div>
      </section>
    );
  }

  const data = weather.data;
  const forecast = data?.forecast;
  const ok = weather.status === "loaded" && forecast?.status === "ok";
  const reason = weather.status === "error" ? weather.error : forecast?.reason;

  return (
    <section className="summary-card forecast-card" aria-labelledby="forecast-h">
      <h3 id="forecast-h" className="card-title">Next 7 days</h3>
      {ok ? (
        <ol className="forecast-days">
          {groupDays(forecast.periods).map((c) => (
            <li key={c.date} className="forecast-day">
              <h4>{dayLabel(c)}</h4>
              <div className="forecast-temps" aria-label={`High ${c.high ?? "not given"}, low ${c.low ?? "not given"} degrees Fahrenheit`}>
                {c.high != null ? `${formatNumber(c.high, 0)}°` : "–"}
                <span className="low">{c.low != null ? `${formatNumber(c.low, 0)}°` : "–"}</span>
              </div>
              <div className="forecast-short">{c.short}</div>
              <div className="forecast-meta">Rain chance {formatNumber(c.rain_pct, 0)}% · Wind {c.wind || "–"}</div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="view-state view-state-error">
          <p>The forecast is not available right now{reason ? `: ${reason}` : ""}.</p>
          <button type="button" className="btn btn-primary btn-small forecast-btn" onClick={weather.retry}>Try again</button>
        </div>
      )}
      <div className="forecast-foot">
        <span>
          Source: National Weather Service{ok ? ` · °F · ${forecast.live_or_cached === "cached" ? "saved copy, under an hour old" : "live"}` : ""}
        </span>
        {data?.page_url && (
          <a className="nws-link" href={data.page_url} target="_blank" rel="noopener noreferrer">
            Open the NWS forecast page <span className="ext-note">(opens in a new tab)</span>
          </a>
        )}
        {restore}
      </div>
    </section>
  );
}
