import { useEffect, useRef, useState } from "react";
import { depthStory, depthSteps } from "./copy.js";

// Band colours top to bottom (decorative; every band also has a text label).
const BANDS = [
  { id: "grass", fill: "#4f7a3a", y: 0, h: 70 },
  { id: "topsoil", fill: "#5a3f2c", y: 70, h: 110 },
  { id: "subsoil", fill: "#7a5a3c", y: 180, h: 120 },
  { id: "parent", fill: "#9a7d5c", y: 300, h: 110 },
  { id: "bedrock", fill: "#6b6a64", y: 410, h: 110 },
];

const GRASS_COLORS = ["#8fc63d", "#64a82f", "#b1dc55", "#4c8d2d", "#d0eb72"];
const GRASS_BLADES = Array.from({ length: 44 }, (_, index) => ({
  x: (index / 43) * 100 + ((index * 17) % 7) - 3.5,
  height: 26 + ((index * 29) % 50),
  lean: ((index * 23) % 17) - 8,
  color: GRASS_COLORS[index % GRASS_COLORS.length],
}));

/**
 * "Below the grass line": a sticky drawing of the soil layers beside five steps.
 * The step crossing the middle of the screen is highlighted, with its layer in the drawing.
 * The highlight is a style change only, so it also works when the user prefers reduced motion.
 */
export default function DepthStory() {
  const [active, setActive] = useState(depthSteps[0].id);
  const stepRefs = useRef([]);
  const sceneRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;

    const updateDepth = () => {
      const viewportCenter = window.innerHeight * 0.52;
      const centers = stepRefs.current
        .filter(Boolean)
        .map((step) => ({ step, center: step.getBoundingClientRect().top + step.getBoundingClientRect().height / 2 }));
      if (!centers.length) return;

      const first = centers[0].center;
      const last = centers[centers.length - 1].center;
      const progress = Math.max(0, Math.min(1, (viewportCenter - first) / Math.max(1, last - first)));
      scene.style.setProperty("--depth-progress", progress.toFixed(4));
      scene.style.setProperty("--depth-title-top", `${(6 + progress * 78).toFixed(2)}%`);

      const nearest = centers.reduce((current, candidate) => (
        Math.abs(candidate.center - viewportCenter) < Math.abs(current.center - viewportCenter) ? candidate : current
      ));
      setActive(nearest.step.dataset.step);
    };

    const onPointerMove = (event) => {
      const bounds = scene.getBoundingClientRect();
      const hoverX = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
      scene.style.setProperty("--hover-x", `${hoverX.toFixed(1)}%`);
      scene.querySelectorAll(".grass-blade").forEach((blade) => {
        const bladeX = Number(blade.dataset.x);
        const influence = Math.max(0, 1 - Math.abs(hoverX - bladeX) / 24);
        const bendAway = hoverX > bladeX ? -18 * influence : 18 * influence;
        blade.style.transform = `rotate(${Number(blade.dataset.lean) + bendAway}deg)`;
      });
    };
    const resetGrass = () => {
      scene.style.removeProperty("--hover-x");
      scene.querySelectorAll(".grass-blade").forEach((blade) => { blade.style.transform = ""; });
    };

    window.addEventListener("scroll", updateDepth, { passive: true });
    window.addEventListener("resize", updateDepth);
    scene.addEventListener("pointermove", onPointerMove);
    scene.addEventListener("pointerleave", resetGrass);
    updateDepth();
    return () => {
      window.removeEventListener("scroll", updateDepth);
      window.removeEventListener("resize", updateDepth);
      scene.removeEventListener("pointermove", onPointerMove);
      scene.removeEventListener("pointerleave", resetGrass);
    };
  }, []);

  const label = (id) => depthSteps.find((s) => s.id === id)?.band || id;

  return (
    <section id="depth-story" className="landing-section depth-story" aria-labelledby="depth-title" tabIndex={-1}>
      <div className="landing-inner">
        <p className="eyebrow">{depthStory.eyebrow}</p>
        <h2 id="depth-title">{depthStory.title}</h2>
        <p className="landing-lede">{depthStory.lede}</p>

        <div className="depth-grid">
          <div ref={sceneRef} className="depth-scene" data-active-step={active} aria-hidden="true">
            <div className="depth-title">Farmer Helper</div>
            <div className="depth-grass">
              <img src="/images/hero-field.jpg" alt="" />
              <span>GRASS LINE</span>
              <div className="grass-field">
                {GRASS_BLADES.map((blade, index) => (
                  <i
                    key={index}
                    className="grass-blade"
                    data-x={blade.x}
                    data-lean={blade.lean}
                    style={{
                      "--x": `${blade.x}%`,
                      "--height": `${blade.height}%`,
                      "--lean": `${blade.lean}deg`,
                      "--grass-color": blade.color,
                    }}
                  />
                ))}
              </div>
            </div>
            <svg viewBox="0 0 400 520" preserveAspectRatio="none" role="presentation">
              {BANDS.map((b) => (
                <g key={b.id}>
                  <rect className="depth-band" data-active={active === b.id} x="0" y={b.y} width="400" height={b.h} fill={b.fill} />
                  <text className="depth-band-label" x="18" y={b.y + 28}>{label(b.id).toUpperCase()}</text>
                </g>
              ))}
              {/* grass blades */}
              <g stroke="#9cc56b" strokeWidth="3" strokeLinecap="round">
                {Array.from({ length: 26 }, (_, i) => (
                  <path key={i} d={`M${8 + i * 15} 70 q${i % 2 ? 4 : -4} -16 ${i % 2 ? 2 : -2} -26`} fill="none" />
                ))}
              </g>
              {/* roots reaching down through the topsoil and subsoil */}
              <g className="depth-roots" strokeWidth="3">
                <path d="M80 70 C70 120 100 150 88 200 S60 260 84 300" />
                <path d="M88 200 C120 214 130 236 150 252" />
                <path d="M200 70 C188 130 222 170 206 230 S184 300 200 360" />
                <path d="M206 230 C240 240 252 262 274 276" />
                <path d="M320 70 C334 120 306 160 326 200 S350 250 334 290" />
              </g>
            </svg>
          </div>

          <div className="depth-steps">
            {depthSteps.map((s, i) => (
              <article
                key={s.id}
                ref={(el) => (stepRefs.current[i] = el)}
                data-step={s.id}
                data-active={active === s.id}
                className="depth-step"
              >
                <p className="eyebrow">{s.band}</p>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <p className="small-print">{s.note}</p>
                <p className="depth-sources">Data: {s.sources}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
