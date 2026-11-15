// Plain-language labels shared by the field summary components. No React here.

export const PRIORITIES = [
  { id: "save_water", label: "Save water" },
  { id: "build_soil", label: "Build soil" },
  { id: "forage", label: "Grazing and hay" },
  { id: "income", label: "Income" },
  { id: "fewer_passes", label: "Fewer trips across the field" },
];

// The six scores, in the order the backend computes them (scoring.py).
export const DIMENSIONS = [
  { id: "water", label: "Water use", help: "Higher means the crops need less water." },
  { id: "soil", label: "Soil building", help: "Living roots, crops that add nitrogen, plant leftovers and deep roots." },
  { id: "erosion", label: "Erosion protection", help: "Months with protective cover, the wettest month counted twice." },
  { id: "forage", label: "Grazing and hay", help: "Grazing or hay value across the year." },
  { id: "income", label: "Income (rough)", help: "Rough crop income level only. No local prices are used." },
  { id: "passes", label: "Fewer trips across the field", help: "Fewer trips for planting, spraying and harvest." },
];

export const CONFIDENCE = {
  high: { label: "More reliable", text: "All main information sources answered." },
  medium: { label: "Somewhat reliable", text: "Some information is missing." },
  low: { label: "Rough estimate", text: "Important information is missing, so treat this as a rough guide." },
};

// One colour per crop group, readable in both themes (text is drawn on the sunken surface, not on these).
export const CATEGORY_COLORS = {
  perennial_forage: "#34a853",
  native_perennial: "#1e8e3e",
  summer_forage: "#e37400",
  cool_forage: "#4285f4",
  legume_cover: "#a142f4",
  summer_legume_cover: "#c5221f",
  cereal_cover: "#b06000",
  row_crop: "#f9ab00",
};

export function cropName(crops, id) {
  return crops?.[id]?.name || id;
}

export function cropColor(crops, id) {
  return CATEGORY_COLORS[crops?.[id]?.category] || "#8e8e93";
}

/** "Moderately well drained" style source line for an evidence entry. */
export function evidenceText(e) {
  if (!e) return "";
  const value = e.value == null ? "" : `${e.value}${e.units ? ` ${e.units}` : ""}`;
  const where = [e.source, e.resolution_m ? resolution(e.resolution_m) : null, e.period].filter(Boolean).join(", ");
  return [value, where && `(${where})`].filter(Boolean).join(" ");
}

function resolution(m) {
  return m >= 1000 ? `${Math.round(m / 100) / 10} km` : `${m} m`;
}
