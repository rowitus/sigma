import SourceTag from "./SourceTag.jsx";
import Stat from "./Stat.jsx";
import { byVariable, firstValue, formatNumber } from "./format.js";
import SoilBlock from "../fieldSummary/SoilBlock.jsx";

// Plain-language meaning of the USDA hydrologic soil groups.
const HYDRO_GROUPS = {
  A: "water soaks in fast, little runoff",
  B: "water soaks in moderately",
  C: "water soaks in slowly",
  D: "water soaks in very slowly, high runoff",
};

function describeGroup(group) {
  const main = String(group).split("/")[0].trim().toUpperCase();
  return HYDRO_GROUPS[main] ? `${group} (${HYDRO_GROUPS[main]})` : String(group);
}

/** Soil view: the mapped soil, its key numbers, and the note that these are map-unit averages. */
export default function SoilView({ records, soilModelData }) {
  const g = byVariable(records);
  const name = firstValue(g, "soil_map_unit_name");
  const om = firstValue(g, "soil_organic_matter");
  const awc = firstValue(g, "soil_available_water_capacity");
  const k = firstValue(g, "soil_erodibility_k");

  const stats = [];
  if (om != null) stats.push({ value: formatNumber(om, 2), unit: "%", label: "Plant and animal material in topsoil" });
  if (awc != null) stats.push({ value: formatNumber(awc, 2), unit: "in/in", label: "Water the soil holds for plants, per inch of soil" });
  if (k != null) stats.push({ value: formatNumber(k, 2), label: "How easily soil washes away (higher means easier)" });

  const rows = [
    ["Soil feel (surface layer)", firstValue(g, "soil_texture")],
    ["Drainage", firstValue(g, "soil_drainage_class")],
    ["How quickly rain soaks in", firstValue(g, "soil_hydrologic_group") != null ? describeGroup(firstValue(g, "soil_hydrologic_group")) : null],
    ["Slope", firstValue(g, "soil_slope_range") != null ? `${firstValue(g, "soil_slope_range")} %` : null],
  ].filter(([, v]) => v != null);

  return (
    <>
      <h3 className="view-heading">{name || "Mapped soil"}</h3>
      {name && <p className="small-print">Main soil of the mapped area at this spot.</p>}
      {soilModelData?.status === "ready" && (
        <SoilBlock profile={soilModelData.profile} surface={soilModelData.surface}
          facts={soilModelData.facts} compact />
      )}
      {soilModelData?.status === "loading" && (
        <p className="note" role="status">Loading the soil layers for this location…</p>
      )}
      {soilModelData?.status === "unavailable" && (
        <p className="note">
          A picture of the soil layers is not available{soilModelData.reason ? `: ${soilModelData.reason}` : " for this location"}.
          The soil information below may still be available.
        </p>
      )}
      {stats.length > 0 && (
        <div className="stat-grid">
          {stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <dl className="rows">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="note">
        USDA NRCS SSURGO soil-map values are averages for a mapped area, not measurements from your field. A soil test
        tells you what is really there.
      </p>
      <SourceTag records={records} />
    </>
  );
}
