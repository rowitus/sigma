import { useEffect, useMemo, useRef, useState } from "react";

const RAMPS = [
  ["viridis", "Purple, blue, green and yellow"],
  ["magma", "Black, purple, orange and yellow"],
  ["blue-red", "Blue to red"],
];

function tileUrl(overlay) {
  return `/api/rasters/${overlay.rasterId}/tiles/{z}/{x}/{y}.png?band=${overlay.band}&ramp=${overlay.ramp}`;
}

function createOverlay(raster) {
  const initialRecord = raster.records[0];
  return {
    uid: `${raster.id}-${Date.now()}`,
    rasterId: initialRecord?.id || raster.id,
    band: raster.variables[0]?.index || 1,
    visible: true,
    opacity: 0.75,
    ramp: "viridis",
    records: raster.records,
    date: initialRecord?.datetime || raster.datetime || "",
    noObservation: false,
    asset: null,
    loading: false,
    detailsError: null,
  };
}

function loadRasterCatalog() {
  return fetch("/api/rasters").then((response) => {
    if (!response.ok) throw new Error(`Map layer list could not be loaded (HTTP ${response.status})`);
    return response.json();
  });
}

function Legend({ overlay, raster, variable }) {
  if (!overlay.visible || overlay.noObservation || overlay.loading ||
      overlay.asset?.id !== overlay.rasterId || !variable) return null;
  const categories = variable.categories;
  const catalogEntry = variable.catalog_entry;
  return (
    <div className="raster-legend">
      <strong>{raster.dataset}: {variable.name || raster.title || raster.name}</strong>
      <div className="raster-legend-units">{variable.units || "Units not given"}</div>
      {categories?.length ? (
        <div className="raster-categories">
          {categories.slice(0, 12).map((category) => (
            <span key={category.value}>
              <i style={{ backgroundColor: category.color }} />{category.label}
            </span>
          ))}
        </div>
      ) : (
        <>
          <div className={`raster-gradient raster-gradient-${overlay.ramp}`} />
          <div className="raster-legend-values">
            <span>Lowest {variable.min == null ? "—" : Number(variable.min.toPrecision(4))}</span>
            <span>Highest {variable.max == null ? "—" : Number(variable.max.toPrecision(4))}</span>
          </div>
        </>
      )}
      {catalogEntry?.minimum_valid_value !== "" && catalogEntry?.minimum_valid_value != null &&
        catalogEntry?.maximum_valid_value !== "" && catalogEntry?.maximum_valid_value != null && (
        <div className="raster-legend-range">
          Values allowed by the source: {catalogEntry.minimum_valid_value}–{catalogEntry.maximum_valid_value}
          {catalogEntry.range_basis ? ` · ${catalogEntry.range_basis}` : ""}
        </div>
      )}
      <div className="raster-nodata"><i /> No map information available</div>
    </div>
  );
}

export default function RasterOverlayPanel({ map }) {
  const [catalog, setCatalog] = useState([]);
  const [catalogWarnings, setCatalogWarnings] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [overlays, setOverlays] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [syncDates, setSyncDates] = useState(false);
  const [syncDate, setSyncDate] = useState("");
  const [speed, setSpeed] = useState(100);
  const [open, setOpen] = useState(false);
  const timers = useRef(new Map());
  const detailRequests = useRef(new Map());

  useEffect(() => {
    let cancelled = false;
    loadRasterCatalog()
      .then((data) => {
        if (!cancelled) {
          const rasters = data.rasters || [];
          const defaultRaster = rasters.find((raster) =>
            raster.source_family === "SMAP" &&
            raster.catalog_entry?.layer_header === "Geophysical_Data_soil_temp_layer1"
          );
          setCatalog(rasters);
          setCatalogWarnings(data.warnings || []);
          setSelectedId(defaultRaster?.id || rasters[0]?.id || "");
          if (defaultRaster) {
            setOverlays((current) => current.length ? current : [createOverlay(defaultRaster)]);
            setOpen(true);
          }
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause.message || "Could not load map layers");
      });
    return () => { cancelled = true; };
  }, []);

  const overlayById = useMemo(() => new Map(catalog.map((raster) => [raster.id, raster])), [catalog]);
  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return catalog;
    return catalog.filter((raster) =>
      [
        raster.dataset,
        raster.name,
        raster.title,
        raster.description,
        raster.source_family,
        raster.catalog_entry?.layer_header,
      ]
        .some((value) => value?.toLocaleLowerCase().includes(query))
    );
  }, [catalog, search]);
  const visibleSelectedId = filteredCatalog.some((raster) => raster.id === selectedId)
    ? selectedId
    : filteredCatalog[0]?.id || "";
  const allDates = useMemo(() => {
    const dated = overlays.filter((overlay) => overlay.visible)
      .map((overlay) => overlay.records.map((record) => record.datetime).filter(Boolean))
      .filter((records) => records.length);
    if (!dated.length) return [];
    const intersection = dated.reduce((dates, current) => dates.filter((value) => current.includes(value)));
    return [...new Set(intersection.length ? intersection : dated.flat())].sort();
  }, [overlays]);

  function updateOverlay(uid, change) {
    setOverlays((current) => current.map((overlay) =>
      overlay.uid === uid ? { ...overlay, ...change } : overlay
    ));
  }

  function addOverlay() {
    const raster = overlayById.get(visibleSelectedId);
    if (!raster) return;
    setOverlays((current) => [...current, createOverlay(raster)]);
    setOpen(true);
  }

  function setOverlayDate(overlay, dateValue) {
    const record = overlay.records.find((item) => item.datetime === dateValue);
    if (!record) {
      updateOverlay(overlay.uid, { date: dateValue, noObservation: true });
      return;
    }
    updateOverlay(overlay.uid, {
      rasterId: record.id,
      date: dateValue,
      noObservation: false,
      loading: false,
      detailsError: null,
    });
  }

  useEffect(() => {
    overlays.filter((overlay) =>
      !overlay.noObservation && overlay.rasterId &&
      overlay.asset?.id !== overlay.rasterId && !overlay.loading && !overlay.detailsError
    ).forEach((overlay) => {
      detailRequests.current.set(overlay.uid, overlay.rasterId);
      updateOverlay(overlay.uid, { loading: true });
      fetch(`/api/rasters/${overlay.rasterId}`)
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.detail || `Map layer details could not be loaded (HTTP ${response.status})`);
          }
          return response.json();
        })
        .then((asset) => {
          if (detailRequests.current.get(overlay.uid) === overlay.rasterId) {
            updateOverlay(overlay.uid, { asset, loading: false });
            setError("");
          }
        })
        .catch((cause) => {
          if (detailRequests.current.get(overlay.uid) === overlay.rasterId) {
            if (cause.message?.toLowerCase().includes("has no crs")) {
              detailRequests.current.delete(overlay.uid);
              setOverlays((current) => current.filter((item) => item.uid !== overlay.uid));
              setCatalog((current) => current.filter((item) =>
                !item.records.some((record) => record.id === overlay.rasterId)
              ));
              setError("Removed this map layer because it has no CRS.");
              loadRasterCatalog()
                .then((data) => {
                  setCatalog(data.rasters || []);
                  setCatalogWarnings(data.warnings || []);
                })
                .catch((refreshCause) => {
                  setError(refreshCause.message || "Could not refresh map layers");
                });
              return;
            }
            updateOverlay(overlay.uid, { loading: false, detailsError: cause.message });
            setError(cause.message || "Could not load the selected map layer");
          }
        });
    });
  }, [overlays]);

  useEffect(() => () => detailRequests.current.clear(), []);

  function moveDate(overlay, direction) {
    const dated = overlay.records.filter((record) => record.datetime);
    const currentIndex = dated.findIndex((record) => record.datetime === overlay.date);
    const next = dated[Math.max(0, Math.min(dated.length - 1, currentIndex + direction))];
    if (next) setOverlayDate(overlay, next.datetime);
  }

  function startPlayback(uid, records, delay) {
    const dated = records.filter((record) => record.datetime);
    if (dated.length < 2) return;
    const timer = setInterval(() => {
      setOverlays((current) => current.map((item) => {
        if (item.uid !== uid) return item;
        if (item.loading || item.asset?.id !== item.rasterId) return item;
        const sourceId = `raster-source-${item.uid}-${item.rasterId}`;
        if (!map?.getSource(sourceId) || !map.isSourceLoaded(sourceId)) return item;
        const index = dated.findIndex((record) => record.datetime === item.date);
        const record = dated[(index + 1) % dated.length];
        return { ...item, rasterId: record.id, date: record.datetime, noObservation: false, playing: true };
      }));
    }, delay);
    timers.current.set(uid, timer);
  }

  function togglePlayback(overlay) {
    if (timers.current.has(overlay.uid)) {
      clearInterval(timers.current.get(overlay.uid));
      timers.current.delete(overlay.uid);
      updateOverlay(overlay.uid, { playing: false });
      return;
    }
    startPlayback(overlay.uid, overlay.records, speed);
    updateOverlay(overlay.uid, { playing: true });
  }

  function changePlaybackSpeed(nextSpeed) {
    setSpeed(nextSpeed);
    overlays.filter((overlay) => timers.current.has(overlay.uid)).forEach((overlay) => {
      clearInterval(timers.current.get(overlay.uid));
      timers.current.delete(overlay.uid);
      startPlayback(overlay.uid, overlay.records, nextSpeed);
    });
  }

  function removeOverlay(uid) {
    if (timers.current.has(uid)) clearInterval(timers.current.get(uid));
    timers.current.delete(uid);
    detailRequests.current.delete(uid);
    setOverlays((current) => current.filter((overlay) => overlay.uid !== uid));
  }

  useEffect(() => () => {
    timers.current.forEach(clearInterval);
    timers.current.clear();
  }, []);

  useEffect(() => {
    if (!map || !catalog.length) return undefined;
    const render = () => {
      const desiredSources = new Set(overlays.map((overlay) =>
        `raster-source-${overlay.uid}-${overlay.rasterId}`
      ));
      const desiredLayers = new Set(overlays.map((overlay) =>
        `raster-layer-${overlay.uid}-${overlay.rasterId}`
      ));
      for (const layer of map.getStyle().layers || []) {
        if (layer.id.startsWith("raster-layer-") && !desiredLayers.has(layer.id)) map.removeLayer(layer.id);
      }
      for (const sourceId of Object.keys(map.getStyle().sources || {})) {
        if (sourceId.startsWith("raster-source-") && !desiredSources.has(sourceId)) map.removeSource(sourceId);
      }
      for (const overlay of overlays) {
        const sourceId = `raster-source-${overlay.uid}-${overlay.rasterId}`;
        const layerId = `raster-layer-${overlay.uid}-${overlay.rasterId}`;
        const raster = overlay.asset;
        if (!raster || raster.id !== overlay.rasterId || !raster.bounds || overlay.loading) {
          if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", "none");
          continue;
        }
        const tileOverlay = { ...overlay, rasterId: overlay.rasterId };
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: "raster",
            tiles: [tileUrl(tileOverlay)],
            tileSize: 256,
            bounds: raster.bounds,
            minzoom: 0,
            maxzoom: raster.maxzoom ?? 22,
          });
          map.addLayer({
            id: layerId,
            type: "raster",
            source: sourceId,
            layout: { visibility: overlay.visible && !overlay.noObservation ? "visible" : "none" },
            paint: { "raster-opacity": overlay.opacity },
          }, map.getLayer("field-area-line") ? "field-area-line" : undefined);
        } else {
          const source = map.getSource(sourceId);
          if (source.setTiles) source.setTiles([tileUrl(tileOverlay)]);
          map.setLayoutProperty(layerId, "visibility",
            overlay.visible && !overlay.noObservation ? "visible" : "none");
          map.setPaintProperty(layerId, "raster-opacity", overlay.opacity);
        }
      }
    };
    if (map.isStyleLoaded()) render();
    else map.once("load", render);
    return () => map.off("load", render);
  }, [map, overlays, catalog, overlayById]);

  useEffect(() => {
    if (!map || !region) return undefined;
    const renderRegion = () => {
      const data = { type: "Feature", properties: {}, geometry: region };
      const source = map.getSource("raster-summary-region");
      if (source) {
        source.setData(data);
        return;
      }
      map.addSource("raster-summary-region", { type: "geojson", data });
      map.addLayer({
        id: "raster-summary-region-fill",
        type: "fill",
        source: "raster-summary-region",
        paint: { "fill-color": "#0071e3", "fill-opacity": 0.06 },
      });
      map.addLayer({
        id: "raster-summary-region-line",
        type: "line",
        source: "raster-summary-region",
        paint: { "line-color": "#0071e3", "line-width": 2, "line-dasharray": [2, 1] },
      });
    };
    if (map.isStyleLoaded()) renderRegion();
    else map.once("load", renderRegion);
    return () => map.off("load", renderRegion);
  }, [map, region]);

  useEffect(() => {
    if (!region) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const active = overlays.filter((overlay) => overlay.visible && !overlay.noObservation);
      setSummaryLoading(true);
      const results = await Promise.all(active.map(async (overlay) => {
        try {
          const response = await fetch(`/api/rasters/${overlay.rasterId}/summary`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(region),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.detail || `Map-area summary could not be created (HTTP ${response.status})`);
          return [overlay.uid, payload];
        } catch (cause) {
          return [overlay.uid, { error: cause.message || "Could not summarize this map area" }];
        }
      }));
      if (!cancelled) {
        setSummaries(Object.fromEntries(results));
        setSummaryLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [region, overlays]);

  function summarizeVisibleArea() {
    if (!map) return;
    const bounds = map.getBounds();
    const west = Math.max(-180, bounds.getWest());
    const east = Math.min(180, bounds.getEast());
    const south = Math.max(-85, bounds.getSouth());
    const north = Math.min(85, bounds.getNorth());
    setRegion({
      type: "Polygon",
      coordinates: [[
        [west, south], [east, south], [east, north], [west, north], [west, south],
      ]],
    });
  }

  function changeSyncDate(nextDate) {
    setSyncDate(nextDate);
    setOverlays((current) => current.map((overlay) => {
      if (!overlay.visible || !overlay.records.some((record) => record.datetime)) return overlay;
      const record = overlay.records.find((item) => item.datetime === nextDate);
      return record
        ? { ...overlay, rasterId: record.id, date: nextDate, noObservation: false }
        : { ...overlay, date: nextDate, noObservation: true };
    }));
  }

  function toggleDateSync(enabled) {
    setSyncDates(enabled);
    if (!enabled) return;
    timers.current.forEach(clearInterval);
    timers.current.clear();
    setOverlays((current) => current.map((overlay) => ({ ...overlay, playing: false })));
    if (allDates.length) changeSyncDate(allDates.includes(syncDate) ? syncDate : allDates[0]);
  }

  return (
    <section className={`raster-panel frosted${open ? " raster-panel-open" : ""}`} aria-label="Map layers">
      <button
        className="raster-panel-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Map layers <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="raster-panel-content">
          {error && <p className="raster-error" role="alert">{error}</p>}
          {catalogWarnings.map((warning) => (
            <p className="raster-warning" role="status" key={warning}>{warning}</p>
          ))}
          <div className="raster-add-row">
            <label className="visually-hidden" htmlFor="raster-search">Search map layers</label>
            <input id="raster-search" type="search" placeholder="Search map layers" value={search}
              onChange={(event) => setSearch(event.target.value)} />
            <label className="visually-hidden" htmlFor="raster-add-select">Available map layers</label>
            <select id="raster-add-select" value={visibleSelectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {!catalog.length && <option value="">No map layers found</option>}
              {!!catalog.length && !filteredCatalog.length && <option value="">No matching map layers</option>}
              {filteredCatalog.map((raster) => (
                <option key={raster.id} value={raster.id}>
                  {raster.dataset} · {raster.catalog_matched ? raster.title : raster.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn raster-add-button" onClick={addOverlay} disabled={!visibleSelectedId}>
              Add
            </button>
          </div>
          {overlays.map((overlay) => {
            const raster = overlayById.get(overlay.rasterId) ||
              catalog.find((item) => item.records.some((record) => record.id === overlay.rasterId));
            const original = catalog.find((item) => item.records.some((record) =>
              overlay.records.some((itemRecord) => itemRecord.id === record.id)
            )) || raster;
            if (!raster || !original) return null;
            const details = overlay.asset || raster;
            const variable = details.variables?.find((item) => item.index === overlay.band) || details.variables?.[0];
            const dated = overlay.records.filter((record) => record.datetime);
            const dateIndex = Math.max(0, dated.findIndex((record) => record.datetime === overlay.date));
            return (
              <article className="raster-overlay-item" key={overlay.uid}>
                <div className="raster-overlay-heading">
                  <label>
                    <input
                      type="checkbox"
                      checked={overlay.visible}
                      onChange={(event) => updateOverlay(overlay.uid, { visible: event.target.checked })}
                    />
                    <span>{original.dataset} · {details.catalog_matched ? details.title : details.name}</span>
                  </label>
                  <button type="button" className="raster-remove" aria-label={`Remove ${raster.name}`}
                    onClick={() => removeOverlay(overlay.uid)}>
                    Remove
                  </button>
                </div>
                {overlay.loading && <p className="raster-help" role="status">Loading selected map layer…</p>}
                {details.variables?.length > 1 && (
                  <label className="raster-field">Measurement
                    <select value={overlay.band} onChange={(event) => updateOverlay(overlay.uid, { band: Number(event.target.value) })}>
                      {details.variables.map((item) => (
                        <option key={item.index} value={item.index}>{item.name || `Band ${item.index}`}</option>
                      ))}
                    </select>
                  </label>
                )}
                {dated.length > 1 && (
                  <div className="raster-time-controls">
                    <div className="raster-time-heading">
                      <strong>{overlay.noObservation ? `No information for ${overlay.date}` : overlay.date}</strong>
                      {!syncDates && (
                        <div>
                          <button type="button" aria-label="Previous date" onClick={() => moveDate(overlay, -1)}>‹</button>
                          <button type="button" aria-label="Next date" onClick={() => moveDate(overlay, 1)}>›</button>
                          <button type="button" aria-label={overlay.playing ? "Pause animation" : "Play animation"}
                            onClick={() => togglePlayback(overlay)}>{overlay.playing ? "Ⅱ" : "▶"}</button>
                        </div>
                      )}
                    </div>
                    {!syncDates && (
                      <>
                        <input type="range" min="0" max={dated.length - 1} value={dateIndex}
                          aria-label={`${raster.name} available dates`}
                          onChange={(event) => setOverlayDate(overlay, dated[Number(event.target.value)].datetime)} />
                        <label className="raster-date-picker">Choose a date
                          {dated.every((record) => record.datetime.length === 10) ? (
                            <input type="date" min={dated[0].datetime} max={dated[dated.length - 1].datetime}
                              value={overlay.date?.length === 10 ? overlay.date : ""}
                              onChange={(event) => setOverlayDate(overlay, event.target.value)} />
                          ) : (
                            <select value={overlay.date} onChange={(event) => setOverlayDate(overlay, event.target.value)}>
                              {dated.map((record) => <option key={record.id} value={record.datetime}>{record.datetime}</option>)}
                            </select>
                          )}
                        </label>
                        <div className="raster-date-strip" aria-label="Available observation dates">
                          {dated.map((record) => (
                            <button type="button" key={record.id}
                              aria-current={record.datetime === overlay.date ? "date" : undefined}
                              onClick={() => setOverlayDate(overlay, record.datetime)}>
                              {record.datetime}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {dated.length > 1 && (
                  <div className="raster-style-row">
                    <label>Playback speed
                      <select value={speed} onChange={(event) => changePlaybackSpeed(Number(event.target.value))}>
                        <option value={1200}>Slow</option><option value={700}>Normal</option><option value={300}>Fast</option>
                        <option value={100}>Fastest (wait for map)</option>
                      </select>
                    </label>
                  </div>
                )}
                <label className="raster-style-row">
                  <span>Transparency</span>
                  <input type="range" min="0" max="1" step="0.05" value={overlay.opacity}
                    onChange={(event) => updateOverlay(overlay.uid, { opacity: Number(event.target.value) })} />
                  <span>{Math.round(overlay.opacity * 100)}%</span>
                </label>
                <label className="raster-style-row">Map colors
                  <select value={overlay.ramp} onChange={(event) => updateOverlay(overlay.uid, { ramp: event.target.value })}>
                    {RAMPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                {variable && !variable.catalog_entry && (
                  <p className="raster-warning">A full description is not available; showing the details we have.</p>
                )}
                {details.description && <p className="raster-description">{details.description}</p>}
                <Legend overlay={overlay} raster={details} variable={variable} />
              </article>
            );
          })}
          <section className="raster-summary">
            <h3>Summary for this map area</h3>
            <button type="button" className="btn raster-summary-button" onClick={summarizeVisibleArea}
              disabled={!map || !overlays.some((overlay) => overlay.visible && !overlay.noObservation)}>
              Summarize this map area
            </button>
            {summaryLoading && <p className="raster-help" role="status">Summarizing map information…</p>}
            {Object.entries(summaries).map(([uid, summary]) => {
              const overlay = overlays.find((item) => item.uid === uid);
              if (!overlay || !overlay.visible) return null;
              return (
                <article className="raster-summary-item" key={uid}>
                  <strong>{summary.name || overlay.asset?.title || "Map layer"}{summary.datetime ? ` · ${summary.datetime}` : ""}</strong>
                  {summary.error && <p className="raster-error">{summary.error}</p>}
                  {!summary.error && (
                    <>
                      <p className="raster-summary-note">
                        {summary.source_type} · Values are read from the map, not measured in your field.
                      </p>
                      <p className="raster-summary-note">
                        The middle value is the halfway point. Variation shows how spread out the values are.
                      </p>
                      {summary.variables?.map((item) => (
                        <div key={item.index} className="raster-summary-variable">
                          <b>{item.name || `Band ${item.index}`} {item.units && item.units !== "n/a" ? `(${item.units})` : ""}</b>
                          {!item.catalog_matched && <span className="raster-warning"> Full description unavailable.</span>}
                          {item.description && <p>{item.description}</p>}
                          {item.summary.warning && <p className="raster-warning">{item.summary.warning}</p>}
                          {item.summary.valid_pixel_count > 0 && (
                            <p>
                              Lowest {Number(item.summary.min.toPrecision(4))} · Highest {Number(item.summary.max.toPrecision(4))} ·
                              Average {Number(item.summary.mean.toPrecision(4))} · Middle value {Number(item.summary.median.toPrecision(4))}
                              {item.summary.median_is_sampled ? " (estimated from a sample)" : ""} ·
                              Variation (standard deviation) {Number(item.summary.standard_deviation.toPrecision(4))}
                              <br />{item.summary.valid_pixel_count.toLocaleString()} usable map squares
                              ({item.summary.valid_region_percent}% of the selected area has information)
                              {item.summary.region_pixel_count_is_approximate ? " · approximate area covered" : ""}
                            </p>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </article>
              );
            })}
          </section>
          {overlays.some((overlay) => overlay.records.filter((record) => record.datetime).length > 1) && (
            <label className="raster-sync">
              <input type="checkbox" checked={syncDates} onChange={(event) => toggleDateSync(event.target.checked)} />
              Keep dates in sync
            </label>
          )}
          {syncDates && allDates.length > 0 && (
            <label className="raster-sync-date">Date for all layers
              <select value={syncDate || allDates[0]} onChange={(event) => changeSyncDate(event.target.value)}>
                {allDates.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          )}
          {!catalog.length && !error && !catalogWarnings.length && <p className="raster-help">Finding available map layers…</p>}
        </div>
      )}
    </section>
  );
}
