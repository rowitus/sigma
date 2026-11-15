import { useEffect, useRef, useState } from "react";
import usePrefersReducedMotion from "../farmData/usePrefersReducedMotion.js";
import { layerStyle, soilGroup, surfaceColor } from "./soilColors.js";

// Block size in px. Height is the soil depth; width and depth are only for the picture.
const W = 240;
const D = 150;
const H = 200;
const STEP = 15; // degrees per arrow key press
const IDLE_DEG_PER_S = 2.5;
const TICK_CM = 50;

const WET_DRAINAGE = ["somewhat poorly drained", "poorly drained", "very poorly drained"];

/**
 * A 3D block of the soil under the point, drawn with CSS 3D transforms (no extra package).
 * Layers come from USDA SSURGO, each as thick as its depth range; the top is the latest
 * USDA crop map label. Drag it, or focus it and press Left / Right, to turn it.
 *
 * profile: the soil_profile part of /api/rotation
 * surface: { value, year } or null
 * facts:   soil_facts from /api/rotation (hydro_group, drainage, flooding, ...)
 */
export default function SoilBlock({ profile, surface, facts, compact = false }) {
  if (!profile || profile.status !== "ok" || !profile.layers?.length) {
    return (
      <div className="soil-empty">
        <p>
          <strong>No soil layers are available here.</strong>{" "}
          {profile?.reason ? `${capital(profile.reason)}.` : "The USDA soil map did not have information for this spot."} The map
          does not cover every place, such as towns, water and some public land.
        </p>
      </div>
    );
  }

  const layers = profile.layers;
  const bottom = layers[layers.length - 1].bottom_cm || 1;
  const group = String(facts?.hydro_group?.value || "");
  const runoff = /^[CD]/.test(group);
  const drainage = String(facts?.drainage?.value || "");
  const slow = WET_DRAINAGE.includes(drainage.toLowerCase());
  const flooding = facts?.flooding?.value;
  const groupsPresent = [...new Set(layers.map((l) => l.texture_group || "unknown"))];

  return (
    <div className={`soil-block-wrap${compact ? " soil-block-compact" : ""}`}>
      <Cube layers={layers} bottom={bottom} surface={surface} runoff={runoff} slow={slow} profile={profile} />
      {compact && (
        <>
          <p className="soil-caption">{profile.component || "Soil"} · layers shown to {bottom} cm ({inch(bottom)} in) deep</p>
          {surface && (
            <p className="small-print soil-surface-line">
              <span className="soil-swatch" style={{ background: surfaceColor(surface.value) }} aria-hidden="true" />
              Top: {surface.value} ({surface.year}, USDA crop map, one 30 m square)
            </p>
          )}
          {(runoff || slow || (flooding && flooding !== "none")) && (
            <ul className="soil-flags">
              {runoff && <li className="soil-flag"><strong>Rain runoff:</strong> rain soaks in slowly (blue arrow; soil group {group}).</li>}
              {slow && <li className="soil-flag"><strong>Water drains slowly:</strong> {drainage.toLowerCase()} (dashed line).</li>}
              {flooding && flooding !== "none" && <li className="soil-flag"><strong>Flooding:</strong> {flooding}.</li>}
            </ul>
          )}
          <ol className="soil-layer-list" aria-label="Soil layers, from the surface downward">
            {layers.map((layer, i) => (
              <li className="soil-layer-row" key={`${layer.top_cm}-${layer.bottom_cm}-${i}`}>
                <span className="soil-layer-swatch" style={layerStyle(layer.texture_group)} aria-hidden="true" />
                <div className="soil-layer-copy">
                  <div className="soil-layer-heading">
                    <strong>{layer.name || `Layer ${i + 1}`}</strong>
                    <span>{layer.top_cm}–{layer.bottom_cm} cm ({inch(layer.top_cm)}–{inch(layer.bottom_cm)} in)</span>
                  </div>
                  <div className="soil-layer-texture">{layer.texture || "Texture not recorded"}</div>
                  <div className="soil-layer-measures">{layerMeasurements(layer)}</div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {!compact && <div className="soil-side">
        <ul className="soil-legend" aria-label="Soil colours">
          {groupsPresent.map((g) => (
            <li key={g}>
              <span className="soil-swatch" style={layerStyle(g)} aria-hidden="true" />
              {soilGroup(g).label}
            </li>
          ))}
          {surface && (
            <li>
              <span className="soil-swatch" style={{ background: surfaceColor(surface.value) }} aria-hidden="true" />
              Top: {surface.value} ({surface.year}, USDA crop map)
            </li>
          )}
        </ul>

        <ul className="soil-flags">
          {runoff && (
            <li className="soil-flag">
              <span aria-hidden="true">↘</span> <strong>Rain runoff:</strong> soil group {group}. Rain soaks in slowly, so
              heavy rain tends to run off.
            </li>
          )}
          {slow && (
            <li className="soil-flag">
              <span aria-hidden="true">💧</span> <strong>Water drains slowly:</strong> {drainage.toLowerCase()}. Roots can sit in
              wet soil after rain.
            </li>
          )}
          {flooding && flooding !== "none" && (
            <li className="soil-flag">
              <span aria-hidden="true">🌊</span> <strong>Flooding:</strong> {flooding}, says the soil survey.
            </li>
          )}
        </ul>

        <dl className="rows soil-facts">
          <div><dt>Soil</dt><dd>{profile.map_unit || profile.component || "–"}</dd></div>
          {drainage && <div><dt>Drainage</dt><dd>{drainage}</dd></div>}
          {facts?.om_pct && <div><dt>Plant and animal material in surface soil</dt><dd>{facts.om_pct.value}%</dd></div>}
          {facts?.awc && <div><dt>Water the soil holds</dt><dd>{facts.awc.value} in per in of soil</dd></div>}
          {facts?.k_factor && <div><dt>How easily soil washes away</dt><dd>{facts.k_factor.value}</dd></div>}
          {facts?.slope_high && <div><dt>Slope up to</dt><dd>{facts.slope_high.value}%</dd></div>}
        </dl>
        <p className="small-print">
          {profile.source || "USDA soil survey"}: averages for the mapped area, not a test of your field.
          Drag the soil picture, or focus it and use the Left and Right arrow keys, to turn it.
        </p>
      </div>}

      <table className="visually-hidden" aria-hidden={compact ? "true" : undefined}>
        <caption>Soil layers under this spot, from the surface down</caption>
        <thead>
          <tr>
            <th scope="col">Depth</th><th scope="col">Soil feel</th><th scope="col">Plant and animal material</th>
            <th scope="col">Clay</th><th scope="col">Sand</th><th scope="col">Water held (inches per inch of soil)</th>
          </tr>
        </thead>
        <tbody>
          {layers.map((l, i) => (
            <tr key={i}>
              <th scope="row">{l.top_cm}–{l.bottom_cm} cm ({inch(l.top_cm)}–{inch(l.bottom_cm)} in)</th>
              <td>{l.texture || "not recorded"}</td>
              <td>{l.om_pct != null ? `${l.om_pct}%` : "–"}</td>
              <td>{l.clay_pct != null ? `${l.clay_pct}%` : "–"}</td>
              <td>{l.sand_pct != null ? `${l.sand_pct}%` : "–"}</td>
              <td>{l.awc ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The turning block itself: four layered sides, a top and depth ticks. */
function Cube({ layers, bottom, surface, runoff, slow = false, profile }) {
  const grassy = /grass|pasture|hay|alfalfa|switchgrass/i.test(String(surface?.value || ""));
  const reducedMotion = usePrefersReducedMotion();
  const [angle, setAngle] = useState(-30);
  const [paused, setPaused] = useState(false);
  const drag = useRef(null);

  // Slow idle turn, only when motion is welcome and nobody is using the block.
  useEffect(() => {
    if (reducedMotion || paused) return undefined;
    let frame;
    let last = performance.now();
    const tick = (now) => {
      setAngle((a) => a + ((now - last) / 1000) * IDLE_DEG_PER_S);
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, paused]);

  function onKeyDown(e) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setAngle((a) => Math.round(a / STEP) * STEP + (e.key === "ArrowLeft" ? -STEP : STEP));
    }
  }
  function onPointerDown(e) {
    drag.current = { x: e.clientX, angle };
    e.currentTarget.setPointerCapture(e.pointerId);
    setPaused(true);
  }
  function onPointerMove(e) {
    if (!drag.current) return;
    setAngle(drag.current.angle + (e.clientX - drag.current.x) * 0.6);
  }
  function onPointerUp() {
    drag.current = null;
  }

  const faces = (
    <>
      <Face className="face front" w={W} transform={`translateZ(${D / 2}px)`} layers={layers} bottom={bottom} waterRisk={slow} />
      <Face className="face back" w={W} transform={`rotateY(180deg) translateZ(${D / 2}px)`} layers={layers} bottom={bottom} />
      <Face className="face side" w={D} left={(W - D) / 2} transform={`rotateY(90deg) translateZ(${W / 2}px)`} layers={layers} bottom={bottom} />
      <Face className="face side" w={D} left={(W - D) / 2} transform={`rotateY(-90deg) translateZ(${W / 2}px)`} layers={layers} bottom={bottom} />
      <div
        className="face top"
        style={{ width: W, height: D, top: (H - D) / 2, transform: `rotateX(90deg) translateZ(${H / 2}px)`, background: surfaceColor(surface?.value) }}
      >
        {runoff && (
          <svg className="surface-flow" viewBox="0 0 210 140" aria-hidden="true">
            <defs>
              <marker id="soil-flow-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill="#1688ee" />
              </marker>
            </defs>
            <path d="M24 52 Q105 76 186 98" fill="none" stroke="#1688ee" strokeWidth="5"
              strokeLinecap="round" markerEnd="url(#soil-flow-arrow)" />
          </svg>
        )}
        {/* Grass marks only when the crop map says grass, pasture or hay here. */}
        {grassy && <svg className="grass-marks" viewBox="0 0 210 140" aria-hidden="true">
          <path d="M35 48 Q32 39 36 34 M66 32 Q62 24 68 19 M100 51 Q97 42 101 37 M128 34 Q124 26 130 21 M158 51 Q155 42 160 37 M83 77 Q80 68 85 63 M142 80 Q139 71 144 66"
            fill="none" stroke="#267a31" strokeWidth="2.2" strokeLinecap="round" />
        </svg>}
      </div>
    </>
  );

  const summary =
    `Interactive 3D picture of soil layers, shown to ${bottom} cm (${inch(bottom)} in) deep.` +
    (surface ? ` Surface cover: ${surface.value} (${surface.year}).` : "") +
    " Use the Left and Right arrow keys to turn it. Layer measurements follow.";

  return (
    <div
      className="soil-scene"
      role="img"
      aria-label={summary}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => !drag.current && setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="cube" style={{ width: W, height: H, transform: `rotateX(-18deg) rotateY(${angle}deg)` }}>
        {faces}
      </div>
    </div>
  );
}

function layerMeasurements(layer) {
  const values = [
    layer.om_pct != null ? `Plant and animal material ${layer.om_pct}%` : null,
    layer.clay_pct != null ? `Clay ${layer.clay_pct}%` : null,
    layer.sand_pct != null ? `Sand ${layer.sand_pct}%` : null,
    layer.awc != null ? `Water held ${layer.awc} inches per inch of soil` : null,
  ].filter(Boolean);
  return values.length ? values.join(" · ") : "No extra measurements recorded";
}

function Face({ className, w, left = 0, transform, layers, bottom, ticks = false, waterRisk = false }) {
  const marks = [];
  // The total depth is already shown below the block; omit the last tick so it cannot collide with that caption.
  for (let cm = 0; cm < bottom * 0.9; cm += TICK_CM) marks.push(cm);
  return (
    <div className={className} style={{ width: w, height: H, left, transform }} aria-hidden="true">
      {layers.map((l, i) => (
        // Each deeper layer is a little darker, so layers with the same texture stay distinct.
        <div key={i} className="band"
          style={{ flexGrow: Math.max(1, l.bottom_cm - l.top_cm), ...layerStyle(l.texture_group), filter: `brightness(${Math.max(0.72, 1.24 - i * 0.15)})` }}>
          {ticks && (l.bottom_cm - l.top_cm) / bottom * H >= 42 && (
            <span className="band-label">
              <span className="band-title">{l.name ? `${l.name} · ` : ""}{soilGroup(l.texture_group).label}</span>
              <span className="band-detail">
                {[
                  l.om_pct != null ? `Plant and animal material ${l.om_pct}%` : null,
                  l.clay_pct != null ? `Clay ${l.clay_pct}%` : null,
                  l.awc != null ? `Water held ${l.awc} inches per inch of soil` : null,
                ].filter(Boolean).join(" · ") || "No layer measurements"}
              </span>
            </span>
          )}
          {waterRisk && i === 0 && <span className="infiltration-mark" aria-hidden="true" />}
        </div>
      ))}
      {ticks &&
        marks.map((cm) => (
          // Near the bottom edge, draw the label above its line so it stays on the block.
          <span key={cm} className={`tick${cm / bottom > 0.9 ? " tick-up" : ""}`} style={{ top: `${(cm / bottom) * 100}%` }}>
            {cm} cm · {inch(cm)} in
          </span>
        ))}
    </div>
  );
}

function inch(cm) {
  return Math.round(cm / 2.54);
}

function capital(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
