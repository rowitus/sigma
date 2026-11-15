import { LINKS, dataLimitations } from "../landing/copy.js";
import ExternalLink from "../landing/ExternalLink.jsx";

/**
 * Every data source with its resolution and licence, and what the results can and cannot say.
 * outlook: the outlook part of the /api/rotation answer (to name the models when loaded)
 */
export default function DataLimitations({ outlook }) {
  const models = outlook?.status === "ok" ? outlook.models?.join(", ") : null;
  return (
    <section className="summary-card limits" aria-labelledby="limits-h">
      <h3 id="limits-h" className="card-title">Data and limitations</h3>
      <ul className="limits-list">
        <li>
          <strong>Crop information for Central Texas.</strong> Details about 15 crops, their growing months and
          limits come from SARE, USDA NRCS plant guides and Texas A&amp;M AgriLife Extension. Outside Central Texas,
          treat the options as rough ideas.
        </li>
        <li>
          <strong>Approximate field area.</strong> The yellow box covers about 1 km around the point you chose. It is
          not your exact field boundary.
        </li>
        <li>
          <strong>USDA NASS Cropland Data Layer (yearly crop map, 30 m squares).</strong> Shows what may have grown
          in each square, based on satellite images. A square can be mislabeled (for example, a tree line may show as
          forest). Free to use.
        </li>
        <li>
          <strong>USDA NRCS SSURGO soil survey.</strong> Soil averages for a mapped area (often several hectares),
          not a test of your field. Free to use.
        </li>
        <li>
          <strong>NASA POWER weather information, about 50 km.</strong> Daily weather estimates since 1981, based on NASA's
          models and satellites. It describes the regional climate, not your field. We use the Theil–Sen method to
          measure long-term change and the Mann–Kendall test to check whether the pattern is likely real; "likely
          change" means less than a 5% chance it is normal ups and downs. Free to use with credit to NASA Langley POWER.
        </li>
        <li>
          <strong>Climate outlook for 2030–2049, Open-Meteo Climate API, about 10 km.</strong> The changes from 1991–2020 in{" "}
          {models || "three climate models"} under a high-emissions scenario, added to the NASA weather averages. This
          gives a range of possible futures, not a prediction. Weather information from{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a>, licensed{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
        </li>
        <li>
          <strong>Scores are a guide, not a crop-yield prediction.</strong> They use the crop information's low /
          medium / high values and the field facts. Every calculation is shown under "How was this scored?". Prices,
          equipment and labor are not included.
        </li>
        <li>
          <strong>Map.</strong> Basemap © OpenStreetMap contributors via OpenFreeMap; terrain from Mapzen terrain
          tiles on AWS.
        </li>
        <li>
          <strong>Weather.</strong> The 7-day forecast and official alerts come from the National Weather Service
          (US only). Farm alerts are worked out from the next 3 days of that forecast and are suggestions.
        </li>
        <li>
          <strong>Photo and fonts.</strong> Hero photo by Federico Respini on Unsplash (Unsplash License). Fraunces
          and Inter fonts under the SIL Open Font License. All are served from this site.
        </li>
      </ul>
      <p className="small-print">{dataLimitations.helpLead}</p>
      <ul className="help-links">
        <li><ExternalLink href={LINKS.extension.href}>{LINKS.extension.label}</ExternalLink></li>
        <li><ExternalLink href={LINKS.nrcs.href}>{LINKS.nrcs.label}</ExternalLink></li>
        <li><ExternalLink href={LINKS.serviceCenter.href}>{LINKS.serviceCenter.label}</ExternalLink></li>
      </ul>
      <p className="small-print">
        This tool supports your judgment as a farmer. It does not replace it, or your county extension agent.
      </p>
    </section>
  );
}
