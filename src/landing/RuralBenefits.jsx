import { ruralBenefits } from "./copy.js";

/** "Built for rural farms": 3 to 4 plain-language benefit cards. All text comes from copy.js. */
export default function RuralBenefits() {
  const { eyebrow, heading, cards } = ruralBenefits;
  return (
    <section id="rural-benefits" className="landing-section rural-benefits" aria-labelledby="rural-benefits-title">
      <div className="landing-inner">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="rural-benefits-title">{heading}</h2>
        <ul className="benefit-grid">
          {cards.map((c) => (
            <li className="benefit-card foliage-card" key={c.title}>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
