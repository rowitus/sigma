import { howItWorks } from "./copy.js";

/** Three steps from one address to a field plan. */
export default function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-section how-it-works" aria-labelledby="how-title">
      <div className="landing-inner">
        <p className="eyebrow">{howItWorks.eyebrow}</p>
        <h2 id="how-title">{howItWorks.title}</h2>
        <p className="landing-lede">{howItWorks.intro}</p>
        <ol className="step-grid">
          {howItWorks.steps.map((s, i) => (
            <li className="step-card foliage-card" key={s.title}>
              <span className="step-num">Step {["one", "two", "three"][i]}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
