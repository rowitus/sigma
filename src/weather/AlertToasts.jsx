import { useRef, useState } from "react";
import { orderToasts } from "./toasts.js";

const LEVEL_LABEL = { danger: "Danger", warn: "Warning", info: "Info" };

function when(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

/**
 * Weather alert pop-ups in the top right: official National Weather Service alerts first, then
 * the farm alerts worked out from the forecast. They stay until closed (button or Escape), and a
 * closed alert is remembered for this place and day.
 *
 * weather: the useWeather result; dismissed: the useDismissed result; mapVisible: place them
 * beside the data panel while the map is on screen.
 */
export default function AlertToasts({ weather, dismissed, mapVisible }) {
  const [open, setOpen] = useState({});
  const listRef = useRef(null);
  const alerts = weather?.status === "loaded" ? weather.data.alerts : null;
  const toasts = alerts ? orderToasts(alerts.official, alerts.farm, dismissed.ids) : [];

  function close(id, index) {
    dismissed.dismiss(id);
    // Move focus to the next alert's close button, or back to the map.
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll(".toast-close") || [];
      const next = buttons[Math.min(index, buttons.length - 1)];
      if (next) next.focus();
      else document.getElementById("map-section")?.focus({ preventScroll: true });
    });
  }

  return (
    <div
      ref={listRef}
      className={`alerts${mapVisible ? " map-visible" : ""}`}
      role="region"
      aria-label="Weather alerts"
      aria-live="polite"
    >
      {toasts.map((a, i) => (
        <div
          key={a.id}
          className={`toast level-${a.level}`}
          onKeyDown={(e) => e.key === "Escape" && close(a.id, i)}
        >
          <div className="toast-level">{LEVEL_LABEL[a.level] || a.level}</div>
          <h4>{a.title}</h4>
          {a.group === "farm" ? (
            <>
              <p>{a.reason}</p>
              <p><strong>What to do:</strong> {a.action}</p>
            </>
          ) : (
            <>
              <p>{a.text}</p>
              {a.detail && (
                <>
                  <button type="button" className="toast-more" aria-expanded={!!open[a.id]}
                    onClick={() => setOpen((o) => ({ ...o, [a.id]: !o[a.id] }))}>
                    {open[a.id] ? "Less" : "More"}
                  </button>
                  {open[a.id] && <p className="toast-detail">{a.detail}</p>}
                </>
              )}
            </>
          )}
          <p className="toast-source">
            {a.source}
            {when(a.until) ? ` · until ${when(a.until)}` : ""}
          </p>
          <button type="button" className="toast-close" aria-label={`Close alert: ${a.title}`} onClick={() => close(a.id, i)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
