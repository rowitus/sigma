import { useEffect, useMemo, useRef, useState } from "react";
import ViewState from "../farmData/ViewState.jsx";
import FieldHelper from "../helper/FieldHelper.jsx";
import ForecastCard from "../weather/ForecastCard.jsx";
import { CalendarLegend } from "./CalendarStrip.jsx";
import ClimateTrends from "./ClimateTrends.jsx";
import Findings from "./Findings.jsx";
import PriorityPicker from "./PriorityPicker.jsx";
import RuledOut from "./RuledOut.jsx";
import SatelliteData from "./SatelliteData.jsx";
import StrategyCard from "./StrategyCard.jsx";
import WaterData from "./WaterData.jsx";
import useOutlook from "./useOutlook.js";
import useRotation from "./useRotation.js";

const STORAGE_KEY = "fieldshift.choices.v1";
const DEFAULT_INPUTS = { priorities: [], irrigation: "no", livestock: "unknown", no_till: "no", current: "" };

/** Priorities and constraints are remembered in this browser only (never sent anywhere else). */
function loadChoices() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULT_INPUTS, ...saved, current: "" };
  } catch {
    return DEFAULT_INPUTS;
  }
}

/**
 * The scroll-down summary below the map: what the data says about the field, the current
 * rotation next to suggested alternatives, the farmer's priorities, and the data limitations.
 *
 * place: { lat, lon, label } of the selected location, or null
 */
export default function FieldSummary({ place, sectionRef, onSoilModelData, weather, dismissedCount, onRestoreAlerts }) {
  const [inputs, setInputs] = useState(loadChoices);
  const rotation = useRotation(place?.lat, place?.lon, inputs);
  const outlook = useOutlook(place?.lat, place?.lon, rotation.retry);

  // A new location starts from the crop map guess again.
  useEffect(() => {
    setInputs((i) => (i.current ? { ...i, current: "" } : i));
  }, [place?.lat, place?.lon]);

  useEffect(() => {
    const { current, ...keep } = inputs; // the current crop belongs to one field, so it is not saved
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keep));
    } catch {
      // storage can be blocked; the choices then last until the page is closed
    }
  }, [inputs]);

  // Only show an answer that belongs to the place now selected. Right after a new pick, the
  // previous field's answer must not appear under the new place name.
  const matches = (d) =>
    d && place && Math.abs(d.location.lat - place.lat) < 1e-6 && Math.abs(d.location.lon - place.lon) < 1e-6;
  const data = matches(rotation.data) ? rotation.data : null;
  const waiting = place && !data && rotation.status !== "error";
  const order = useRanking(data, place);
  const soilModelData = useMemo(() => {
    if (data) {
      return {
        location: data.location,
        status: data.soil_profile?.status === "ok" ? "ready" : "unavailable",
        profile: data.soil_profile,
        surface: data.surface_cover,
        facts: data.soil_facts,
      };
    }
    if (!place) return null;
    return {
      location: { lat: place.lat, lon: place.lon },
      status: rotation.status === "error" ? "unavailable" : "loading",
      profile: rotation.status === "error" ? { status: "unavailable", reason: rotation.error } : null,
      surface: null,
      facts: null,
      reason: rotation.error,
    };
  }, [data, place?.lat, place?.lon, rotation.status, rotation.error]);

  useEffect(() => {
    onSoilModelData?.(soilModelData);
  }, [soilModelData, onSoilModelData]);

  return (
    <section ref={sectionRef} id="field-summary" className="summary" aria-labelledby="summary-h" tabIndex={-1}>
      <div className="summary-inner">
        <header className="summary-header">
          <h2 id="summary-h" className="summary-title">Your field summary</h2>
          {place && <p className="summary-place">{place.label} · {place.lat.toFixed(4)}, {place.lon.toFixed(4)}</p>}
          <p className="summary-lead">
            Compare these crop-rotation ideas with your county extension agent. They use NASA and USDA information
            and clear, written rules. The crop list is for Central Texas.
          </p>
        </header>

        {/* The forecast does not wait for the rotation answer, which can take a minute. */}
        <ForecastCard weather={weather} dismissedCount={dismissedCount} onRestore={onRestoreAlerts} />

        {rotation.status === "idle" && <ViewState kind="idle" message="Choose a location on the map to see rotation options." />}
        {waiting && (
          <ViewState kind="loading" message="Working out rotation options for this field… The first look at a new spot can take up to a minute." />
        )}
        {rotation.status === "error" && <ViewState kind="error" message={rotation.error} onRetry={rotation.retry} />}

        {data && (
          <div className={`summary-body${rotation.refreshing ? " refreshing" : ""}`} aria-busy={rotation.refreshing}>
            {rotation.error && (
              <p className="note error-note" role="alert">
                {rotation.error} The options below are from your previous choices.{" "}
                <button type="button" className="btn btn-small" onClick={rotation.retry}>Try again</button>
              </p>
            )}
            <SourceStatus data={data} />

            <h3 className="summary-section">How your climate is changing</h3>
            <ClimateTrends trends={data.trends} outlook={data.outlook} />

            <h3 className="summary-section">Seen from space</h3>
            <SatelliteData ndvi={data.ndvi} />
            <WaterData water={data.water} />

            <h3 className="summary-section">What the data says about this field</h3>
            <Findings findings={data.findings} />
            <OutlookStatus data={data} outlook={outlook} />

            <h3 className="summary-section">Compare rotations</h3>
            <PriorityPicker
              inputs={inputs}
              onChange={setInputs}
              crops={data.crops}
              currentUnknown={data.current_rotation?.status === "unknown"}
            />
            {data.engine_error && <p className="note error-note">{data.engine_error}</p>}
            <p className="small-print">{data.ranking_note}</p>
            <CurrentLeads strategies={data.strategies} />
            <CalendarLegend crops={data.crops} cropIds={[...new Set(data.strategies.flatMap((s) => s.crop_ids))]} />
            <div className="strategy-grid">
              {data.strategies.map((s, i) => (
                <StrategyCard
                  key={s.id}
                  strategy={s}
                  crops={data.crops}
                  rank={s.is_current ? null : i}
                  moved={order.moved[s.id] || null}
                />
              ))}
            </div>
            <RuledOut exclusions={data.exclusions} notSuggested={data.not_suggested} />
          </div>
        )}
      </div>

      {/* Floating "Ask about this field" chat: SerpApi answers, using this field's data above. */}
      <FieldHelper
        place={place}
        rotation={data}
        weather={weather}
      />

      <div className="visually-hidden" role="status" aria-live="polite">{order.announcement}</div>
    </section>
  );
}

/**
 * Remembers the previous order of the alternatives for the same location, so the cards can say
 * "moved up" or "moved down" and screen readers hear the new top option.
 */
function useRanking(data, place) {
  const previous = useRef({ key: null, ids: [] });
  const [result, setResult] = useState({ moved: {}, announcement: "" });
  useEffect(() => {
    if (!data) return;
    const key = `${place?.lat},${place?.lon}`;
    const ids = data.strategies.filter((s) => !s.is_current).map((s) => s.id);
    const moved = {};
    if (previous.current.key === key) {
      ids.forEach((id, i) => {
        const before = previous.current.ids.indexOf(id);
        if (before !== -1 && before !== i) moved[id] = i < before ? "up" : "down";
      });
    }
    const top = data.strategies.find((s) => s.best_fit);
    const changed = previous.current.key !== key || previous.current.ids[0] !== ids[0];
    previous.current = { key, ids };
    setResult({
      moved,
      announcement: top && changed ? `Rotation options updated. Best fit for your priorities: ${top.name}.` : "",
    });
    // Only a new answer from the backend should update the ranking memory.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  return result;
}

/** Say so plainly when what the farmer grows now scores at least as well as every alternative. */
function CurrentLeads({ strategies }) {
  const current = strategies.find((s) => s.is_current)?.scores?.today?.overall;
  const best = Math.max(...strategies.filter((s) => !s.is_current).map((s) => s.scores?.today?.overall ?? -1));
  if (current == null || best < 0 || current < best) return null;
  return (
    <p className="note">
      <strong>Your current rotation scores highest today ({current} vs {best}).</strong> The options show what
      could change, for example to prepare for the hotter 2030–2049 outlook or to match a different priority.
    </p>
  );
}

/** Which sources answered, in plain words; missing ones explain the lower confidence. */
function SourceStatus({ data }) {
  const missing = data.missing_sources || [];
  if (!missing.length) {
    return <p className="source-ok">All data sources answered for this field.</p>;
  }
  return (
    <div className="note warn-note">
      <strong>Some information is missing, so these results are less certain:</strong>
      <ul>{missing.map((m) => <li key={m}>{m}</li>)}</ul>
    </div>
  );
}

/** The 2030-2049 outlook: loaded, loading, can be loaded, or unavailable with the reason. */
function OutlookStatus({ data, outlook }) {
  if (data.outlook?.status === "ok") {
    const hot = data.outlook.indicators?.find((i) => i.id === "hot_days");
    return (
      <p className="note">
        <strong>Climate outlook for 2030–2049 is ready</strong>
        {data.outlook.origin === "precomputed" ? " (prepared in advance for this demo farm)" : ""}.
        {hot?.future_value && ` Days above 35 °C: about ${Math.round(hot.future_value.mid)} a year (range ${Math.round(hot.future_value.low)}–${Math.round(hot.future_value.high)} across ${data.outlook.models?.length || 3} models).`}{" "}
        Each option shows a 2030–2049 score.
      </p>
    );
  }
  const status = outlook.status === "unknown" ? data.outlook?.status : outlook.status;
  if (status === "loading") {
    return (
      <p className="note" role="status">
        Loading the 2030–2049 climate outlook… about {outlook.etaS ?? 90} seconds. The options will update by themselves.
      </p>
    );
  }
  if (status === "unavailable") {
    return <p className="note">The 2030–2049 outlook is not available right now: {outlook.reason || data.outlook?.reason}.</p>;
  }
  return (
    <div className="note">
      <p className="note-p">
        The 2030–2049 climate outlook is not loaded for this spot. Loading it takes about 90 seconds and uses most of
        the free hourly limit of the climate service, so only one place can load per hour.
      </p>
      <button type="button" className="btn btn-primary btn-small" onClick={outlook.load}>
        Load 2030–2049 outlook
      </button>
    </div>
  );
}
