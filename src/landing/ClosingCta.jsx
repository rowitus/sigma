import { LINKS, closingCta } from "./copy.js";
import ExternalLink from "./ExternalLink.jsx";

/** End of the page: back to the map, and where to find a person to talk to. */
export default function ClosingCta() {
  return (
    <section id="closing-cta" className="landing-section closing-cta" aria-labelledby="closing-title">
      <div className="landing-inner">
        <h2 id="closing-title">{closingCta.heading}</h2>
        <p className="landing-lede">{closingCta.text}</p>
        <a className="btn btn-primary landing-btn" href="/field-desk">
          {closingCta.buttonLabel}
        </a>
        <div className="closing-help">
          <p>{closingCta.helpLead}</p>
          <ul className="help-links">
            <li><ExternalLink href={LINKS.extension.href}>{LINKS.extension.label}</ExternalLink></li>
            <li><ExternalLink href={LINKS.nrcs.href}>{LINKS.nrcs.label}</ExternalLink></li>
          </ul>
        </div>
      </div>
    </section>
  );
}
