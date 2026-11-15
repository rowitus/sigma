import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { fieldAreaGeoJSON } from "./fieldArea.js";
import RasterOverlayPanel from "./RasterOverlayPanel.jsx";

// Basemap: OpenStreetMap data served by OpenFreeMap (free, no key).
// Terrain: Mapzen "terrarium" elevation tiles hosted on AWS (free, no key).
const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const TERRAIN_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

/**
 * Full-screen 3D terrain map.
 * Props:
 *   lat, lon   selected location
 *   onPick(lat, lon)  called when the user clicks the map
 *   padding    { top, right, bottom, left } in px: the parts of the map covered by the
 *              top bar and the data panel, so the marker is centred in the visible area
 *
 * Camera moves are not marked "essential", so MapLibre jumps instead of flying
 * when the user has asked the OS to reduce motion.
 */
export default function TerrainMap({ lat, lon, onPick, padding }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const paddingRef = useRef(padding);
  paddingRef.current = padding;

  // Create the map once.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [lon, lat],
      zoom: 14,
      pitch: 65, // tilt the camera so the 3D terrain is visible
      bearing: 20,
      maxPitch: 80,
      attributionControl: false, // re-added below in a corner the panel does not cover
      // The page scrolls past the map to the field summary. Plain scrolling (and one finger on a
      // phone) scrolls the page; Ctrl/⌘ + scroll zooms and two fingers move the map.
      cooperativeGestures: true,
      locale: {
        "CooperativeGesturesHandler.WindowsHelpText": "Hold Ctrl and scroll to zoom the map. Scroll on to see your field summary.",
        "CooperativeGesturesHandler.MacHelpText": "Hold ⌘ and scroll to zoom the map. Scroll on to see your field summary.",
        "CooperativeGesturesHandler.MobileHelpText": "Use two fingers to move the map. One finger scrolls the page.",
      },
    });
    mapRef.current = map;
    setMapInstance(map);
    if (paddingRef.current) map.setPadding(paddingRef.current);
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-left");
    markerRef.current = new maplibregl.Marker().setLngLat([lon, lat]).addTo(map);

    map.on("load", () => {
      map.addSource("terrain-dem", {
        type: "raster-dem",
        tiles: [TERRAIN_TILES],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 15,
      });
      map.setTerrain({ source: "terrain-dem", exaggeration: 1.5 });

      // Estimated field area box.
      map.addSource("field-area", { type: "geojson", data: fieldAreaGeoJSON(lat, lon) });
      map.addLayer({
        id: "field-area-fill",
        type: "fill",
        source: "field-area",
        paint: { "fill-color": "#ffcc00", "fill-opacity": 0.15 },
      });
      map.addLayer({
        id: "field-area-line",
        type: "line",
        source: "field-area",
        paint: { "line-color": "#ffcc00", "line-width": 3 },
      });
    });

    // Click anywhere to analyze that spot.
    map.on("click", (e) => onPickRef.current?.(e.lngLat.lat, e.lngLat.lng));

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the location changes: move marker, redraw box, fly the camera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.setLngLat([lon, lat]);
    map.getSource("field-area")?.setData(fieldAreaGeoJSON(lat, lon));
    map.flyTo({ center: [lon, lat], zoom: 14, pitch: 65, padding: paddingRef.current });
  }, [lat, lon]);

  // When the panel or top bar changes size, keep the marker in the uncovered area.
  const { top = 0, right = 0, bottom = 0, left = 0 } = padding || {};
  useEffect(() => {
    mapRef.current?.easeTo({ padding: { top, right, bottom, left }, duration: 300 });
  }, [top, right, bottom, left]);

  return (
    <>
      <div ref={containerRef} className="map" />
      <RasterOverlayPanel map={mapInstance} />
    </>
  );
}
