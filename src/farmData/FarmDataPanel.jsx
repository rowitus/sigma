import { useId, useState } from "react";
import ClimateView from "./ClimateView.jsx";
import CropHistoryView from "./CropHistoryView.jsx";
import SegmentedControl from "./SegmentedControl.jsx";
import SoilView from "./SoilView.jsx";
import ViewState from "./ViewState.jsx";

// Each view shows the facts from one backend source.
const VIEWS = [
  { id: "climate", label: "Climate", source: "nasa_power", Component: ClimateView, empty: "We couldn't find climate information for this location." },
  { id: "soil", label: "Soil", source: "ssurgo", Component: SoilView, empty: "We couldn't find soil information for this location." },
  { id: "crops", label: "Crop history", source: "cdl", Component: CropHistoryView, empty: "We couldn't find crop history for this location. The USDA crop map covers the lower 48 states only." },
];

/** The sentence screen readers hear when the panel changes state. */
function announcement(farm, placeLabel) {
  if (farm.status === "loading") return `Loading farm data${placeLabel ? ` for ${placeLabel}` : ""}.`;
  if (farm.status === "error") return `Could not load farm data. ${farm.error}`;
  if (farm.status === "loaded") {
    const missing = VIEWS.filter((v) => farm.data.sources[v.source]?.status === "unavailable").map(
      (v) => `Could not load ${v.label.toLowerCase()} information: ${farm.data.sources[v.source].reason}.`
    );
    return ["Farm information loaded.", ...missing].join(" ");
  }
  return "";
}

/** Body of the selected view, or its loading / empty / error state. */
function ViewBody({ view, farm, soilModelData }) {
  if (farm.status === "idle") {
    return <ViewState kind="idle" message="Choose a demo farm, search for an address, or click the map to see farm data." />;
  }
  if (farm.status === "loading") {
    return <ViewState kind="loading" message={`Loading ${view.label.toLowerCase()} data…`} />;
  }
  if (farm.status === "error") {
    return <ViewState kind="error" message={farm.error} onRetry={farm.retry} />;
  }
  const group = farm.data.sources[view.source];
  if (!group || group.status === "unavailable") {
    const reason = group?.reason || "the information source did not respond";
    return <ViewState kind="error" message={`We couldn't load ${view.label.toLowerCase()} information: ${reason}.`} onRetry={farm.retry} />;
  }
  if (!group.records.length) return <ViewState kind="empty" message={view.empty} />;
  const { Component } = view;
  return <Component records={group.records} soilModelData={soilModelData} />;
}

/**
 * Frosted panel with farm facts for the selected location.
 * Right side of the map on wide screens; a collapsible bottom sheet on narrow screens (CSS).
 *
 * farm: the result of useFarmData ({ status, data, error, retry })
 * place: { label, lat, lon } of the selected location, or null
 * collapsed / onToggleCollapsed: bottom sheet state (the button only shows on narrow screens)
 * panelRef: lets the app measure the panel so the map can keep the marker visible
 */
export default function FarmDataPanel({ farm, place, soilModelData, collapsed, onToggleCollapsed, panelRef }) {
  const [viewId, setViewId] = useState("climate");
  const idPrefix = useId().replace(/:/g, "");
  const view = VIEWS.find((v) => v.id === viewId);
  const titleId = `${idPrefix}-title`;

  return (
    <aside ref={panelRef} className={`panel frosted${collapsed ? " collapsed" : ""}`} aria-labelledby={titleId}>
      <div className="panel-header">
        <div className="panel-title-row">
          <div>
            <h2 className="panel-title" id={titleId}>
              Farm details
            </h2>
            {place && (
              <p className="panel-subtitle">
                {place.label} · {place.lat.toFixed(4)}, {place.lon.toFixed(4)}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-small sheet-toggle"
            aria-expanded={!collapsed}
            aria-controls={`${idPrefix}-panel`}
            onClick={onToggleCollapsed}
          >
            {collapsed ? "Show details" : "Hide details"}
          </button>
        </div>
        <SegmentedControl
          label="Farm details"
          options={VIEWS}
          value={viewId}
          onChange={setViewId}
          idPrefix={idPrefix}
        />
      </div>

      <div
        className="panel-body"
        id={`${idPrefix}-panel`}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-tab-${viewId}`}
        tabIndex={0}
      >
        <ViewBody view={view} farm={farm} soilModelData={soilModelData} />
      </div>

      <p className="panel-footer">This tool supports your judgment as a farmer. It does not replace it.</p>

      <div className="visually-hidden" role="status" aria-live="polite">
        {announcement(farm, place?.label)}
      </div>
    </aside>
  );
}
