import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TerrainMap from "./TerrainMap.jsx";
import LocationSearch from "./LocationSearch.jsx";
import FarmDataPanel from "./farmData/FarmDataPanel.jsx";
import useFarmData from "./farmData/useFarmData.js";
import usePrefersReducedMotion from "./farmData/usePrefersReducedMotion.js";
import FieldSummary from "./fieldSummary/FieldSummary.jsx";
import SummaryErrorBoundary from "./fieldSummary/SummaryErrorBoundary.jsx";
import ClosingCta from "./landing/ClosingCta.jsx";
import DepthStory from "./landing/DepthStory.jsx";
import Hero from "./landing/Hero.jsx";
import HowItWorks from "./landing/HowItWorks.jsx";
import RuralBenefits from "./landing/RuralBenefits.jsx";
import SkipLink from "./landing/SkipLink.jsx";
import AlertToasts from "./weather/AlertToasts.jsx";
import { allAlertIds } from "./weather/toasts.js";
import useDismissed from "./weather/useDismissed.js";
import useWeather from "./weather/useWeather.js";
import { useElementSize, useMediaQuery } from "./layoutHooks.js";

const NARROW = "(max-width: 767px)"; // below this the panel becomes a bottom sheet

/**
 * The whole app: a full-screen 3D map, a frosted top bar (title, demo farms, search)
 * and the frosted farm data panel. Picking a location by search, demo farm or map
 * click loads new farm data.
 */
export default function App() {
  const isFieldDesk = window.location.pathname === "/field-desk";
  // location = { lat, lon, label, source }
  const [location, setLocation] = useState(null);
  const [farms, setFarms] = useState([]);
  const [error, setError] = useState(null);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [soilModelData, setSoilModelData] = useState(null);

  const farm = useFarmData(location?.lat, location?.lon);
  const receiveSoilModelData = useCallback((next) => setSoilModelData(next), []);
  const activeSoilModelData =
    soilModelData && location &&
    Math.abs(soilModelData.location.lat - location.lat) < 1e-6 &&
    Math.abs(soilModelData.location.lon - location.lon) < 1e-6
      ? soilModelData
      : null;
  const summaryRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    document.title = isFieldDesk ? "Field Desk · Farmer Helper" : "Farmer Helper";
  }, [isFieldDesk]);

  // National Weather Service forecast and alerts: one request feeds the card and the pop-ups.
  const weather = useWeather(location?.lat, location?.lon);
  const dismissed = useDismissed(location?.lat, location?.lon);
  const alertIds = allAlertIds(weather.status === "loaded" ? weather.data : null);
  const dismissedHere = alertIds.filter((id) => dismissed.ids.includes(id)).length;

  // While the map is on screen, the alert pop-ups sit beside the data panel instead of over it.
  const mapSectionRef = useRef(null);
  const [mapVisible, setMapVisible] = useState(false);
  useEffect(() => {
    const el = mapSectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([e]) => setMapVisible(e.intersectionRatio > 0.5), { threshold: [0, 0.5, 1] });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // "Your field summary" button: scroll down to the summary and move keyboard focus there.
  function goToSummary() {
    const el = summaryRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  }

  // Measure the top bar and panel so the map centres the marker in the part you can see.
  const topbarRef = useRef(null);
  const panelRef = useRef(null);
  const topbar = useElementSize(topbarRef);
  const panel = useElementSize(panelRef);
  const narrow = useMediaQuery(NARROW);
  const gap = narrow ? 8 : 12;
  const padding = useMemo(
    () =>
      narrow
        ? { top: topbar.height + 2 * gap, right: 0, bottom: panel.height, left: 0 }
        : { top: topbar.height + 2 * gap, right: panel.width + 2 * gap, bottom: 0, left: 0 },
    [narrow, gap, topbar.height, panel.width, panel.height]
  );

  // Load the demo farm coordinates from the backend (config/demo_farms.json).
  useEffect(() => {
    fetch("/api/demo-farms")
      .then((r) => r.json())
      .then((data) => {
        setFarms(data.farms);
        const f = data.farms[0];
        setLocation({
          lat: f.lat,
          lon: f.lon,
          label: f.name,
          source: f.placeholder ? "Demo farm (placeholder coordinates)" : "Demo farm",
        });
      })
      .catch(() => setError("Backend not reachable. Start it with: uvicorn app.main:app --port 8010"));
  }, []);

  function pickOnMap(lat, lon) {
    setLocation({
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6)),
      label: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      source: "Clicked on map",
    });
  }

  return (
    <>
    {isFieldDesk && <SkipLink targetId="map-section" />}
    {/* Landing: plain bundled text with no data call, so it shows before the map and charts load. */}
    {!isFieldDesk && (
      <>
        <Hero />
        <DepthStory />
        <HowItWorks />
        <RuralBenefits />
      </>
    )}

    {/* The map section fills one screen; the field summary follows it as the page scrolls.
        --sheet-h lets the CSS lift the map controls above the bottom sheet on narrow screens. */}
    {isFieldDesk && (
      <div
        id="map-section"
        ref={mapSectionRef}
        tabIndex={-1}
        className="app"
        style={{ "--sheet-h": `${narrow ? panel.height : 0}px`, "--topbar-h": `${topbar.height}px` }}
      >
        {location && (
          <TerrainMap lat={location.lat} lon={location.lon} onPick={pickOnMap} padding={padding} />
        )}

        <header ref={topbarRef} className="topbar frosted">
          <a className="desk-back-link" href="/">← Farmer Helper</a>
          <h2 className="topbar-title">Farmer Helper</h2>
          {farms.length > 0 && (
            <div className="demo-farms" role="group" aria-label="Demo farms">
              {farms.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="btn"
                  onClick={() => setLocation({ lat: f.lat, lon: f.lon, label: f.name, source: "Demo farm" })}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
          <LocationSearch onFound={setLocation} />
          {location && (
            <p className="topbar-place">
              {location.label} · {location.source}. The yellow box marks an estimated area about 1 km across, not your
              exact field boundary. Click the map to choose another spot.
            </p>
          )}
          {error && (
            <p className="topbar-error" role="alert">
              {error}
            </p>
          )}
        </header>

        <FarmDataPanel
          farm={farm}
          place={location}
          soilModelData={activeSoilModelData}
          collapsed={sheetCollapsed}
          onToggleCollapsed={() => setSheetCollapsed((c) => !c)}
          panelRef={panelRef}
        />

        {location && (
          <button type="button" className="summary-pill frosted" onClick={goToSummary}>
            Your field summary <span aria-hidden="true">↓</span>
          </button>
        )}
      </div>
    )}

    {isFieldDesk && (
      <SummaryErrorBoundary resetKey={location ? `${location.lat},${location.lon}` : ""}>
        <FieldSummary
          place={location}
          sectionRef={summaryRef}
          onSoilModelData={receiveSoilModelData}
          weather={weather}
          dismissedCount={dismissedHere}
          onRestoreAlerts={dismissed.restore}
        />
      </SummaryErrorBoundary>
    )}

    {!isFieldDesk && <ClosingCta />}

    {isFieldDesk && (
      <div style={{ "--topbar-h": `${topbar.height}px` }}>
        <AlertToasts weather={weather} dismissed={dismissed} mapVisible={mapVisible} />
      </div>
    )}
    </>
  );
}
