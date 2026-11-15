import { useEffect, useRef } from "react";
import usePrefersReducedMotion from "../farmData/usePrefersReducedMotion.js";
import { hero } from "./copy.js";
import { creditLine } from "./credit.js";
import { scrollToId } from "./scroll.js";

const GRASS_COLORS = ["#8fc63d", "#64a82f", "#b1dc55", "#4c8d2d", "#d0eb72"];
const HERO_GRASS_BLADES = Array.from({ length: 76 }, (_, index) => ({
  x: (index / 75) * 100 + ((index * 17) % 7) - 3.5,
  height: 26 + ((index * 29) % 50),
  lean: ((index * 23) % 17) - 8,
  color: GRASS_COLORS[index % GRASS_COLORS.length],
}));

/**
 * The first screen: a field photo (self-hosted, with a plain green background if it fails to
 * load), the page title and two buttons, one into the soil story and one straight to the map.
 */
export default function Hero() {
  const reducedMotion = usePrefersReducedMotion();
  const heroRef = useRef(null);

  useEffect(() => {
    const heroNode = heroRef.current;
    if (!heroNode) return undefined;

    const onPointerMove = (event) => {
      const bounds = heroNode.getBoundingClientRect();
      const hoverX = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
      heroNode.querySelectorAll(".hero-grass-field .grass-blade").forEach((blade) => {
        const bladeX = Number(blade.dataset.x);
        const influence = Math.max(0, 1 - Math.abs(hoverX - bladeX) / 24);
        const bendAway = hoverX > bladeX ? -18 * influence : 18 * influence;
        blade.style.transform = `rotate(${Number(blade.dataset.lean) + bendAway}deg)`;
      });
    };
    const resetGrass = () => heroNode.querySelectorAll(".hero-grass-field .grass-blade").forEach((blade) => { blade.style.transform = ""; });

    heroNode.addEventListener("pointermove", onPointerMove);
    heroNode.addEventListener("pointerleave", resetGrass);
    return () => {
      heroNode.removeEventListener("pointermove", onPointerMove);
      heroNode.removeEventListener("pointerleave", resetGrass);
    };
  }, []);

  return (
    <section ref={heroRef} className="hero" aria-labelledby="hero-title">
      <div className="hero-grass-field" aria-hidden="true">
        {HERO_GRASS_BLADES.map((blade, index) => (
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
      <div className="hero-inner">
        <p className="hero-kicker">{hero.kicker}</p>
        <h1 id="hero-title">{hero.title}</h1>
        <p className="hero-lede">{hero.lede}</p>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary landing-btn" onClick={() => scrollToId("depth-story", reducedMotion)}>
            {hero.exploreLabel}
          </button>
          <a className="btn btn-light landing-btn" href="/field-desk">
            {hero.deskLabel}
          </a>
        </div>
      </div>
      <p className="hero-credit">{creditLine()}</p>
    </section>
  );
}
