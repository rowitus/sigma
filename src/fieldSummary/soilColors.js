// Texture group -> colour and pattern for the soil block. No React here.
//
// Colour is never the only signal: each group also has its own pattern, and its name is
// written on the band and in the legend. The colours are earthy and fairly dark so the
// white band labels stay readable (at least 4.5:1 against each base colour) in both themes.

export const SOIL_GROUPS = {
  clay:         { label: "Clay",       color: "#6b4a3a", pattern: "lines" },
  "clay loam":  { label: "Clay loam",  color: "#7a5636", pattern: "dots" },
  loam:         { label: "Loam",       color: "#5f5032", pattern: "none" },
  "sandy loam": { label: "Sandy loam", color: "#7d6331", pattern: "speckle" },
  sand:         { label: "Sand",       color: "#86682a", pattern: "dense" },
  silt:         { label: "Silt",       color: "#5d5a4a", pattern: "diagonal" },
  organic:      { label: "Organic (muck or peat)", color: "#2f2a24", pattern: "none" },
  bedrock:      { label: "Bedrock",    color: "#55585c", pattern: "cross" },
  unknown:      { label: "Texture not recorded", color: "#5c5c5c", pattern: "none" },
};

const LIGHT = "rgba(255,255,255,0.22)";

// Background images for each pattern (CSS gradients, so no image files are needed).
const PATTERNS = {
  none: "none",
  lines: `repeating-linear-gradient(0deg, ${LIGHT} 0 1px, transparent 1px 7px)`,
  dots: `radial-gradient(${LIGHT} 1.2px, transparent 1.6px)`,
  speckle: `radial-gradient(${LIGHT} 1px, transparent 1.4px), radial-gradient(${LIGHT} 1px, transparent 1.4px)`,
  dense: `radial-gradient(${LIGHT} 1.4px, transparent 1.8px)`,
  diagonal: `repeating-linear-gradient(45deg, ${LIGHT} 0 1px, transparent 1px 6px)`,
  cross: `repeating-linear-gradient(45deg, ${LIGHT} 0 1px, transparent 1px 8px), repeating-linear-gradient(-45deg, ${LIGHT} 0 1px, transparent 1px 8px)`,
};
const SIZES = { dots: "8px 8px", speckle: "11px 11px, 7px 7px", dense: "5px 5px" };
const OFFSETS = { speckle: "0 0, 4px 5px" };

export function soilGroup(group) {
  return SOIL_GROUPS[group] || SOIL_GROUPS.unknown;
}

/** Inline style for one layer band. */
export function layerStyle(group) {
  const g = soilGroup(group);
  return {
    backgroundColor: g.color,
    backgroundImage: PATTERNS[g.pattern],
    backgroundSize: SIZES[g.pattern],
    backgroundPosition: OFFSETS[g.pattern],
  };
}

// Surface cover on top of the block, from the USDA crop map label.
export function surfaceColor(label) {
  const t = String(label || "").toLowerCase();
  if (t.includes("forest") || t.includes("shrub")) return "#2e6b34";
  if (t.includes("grass") || t.includes("pasture") || t.includes("hay") || t.includes("alfalfa")) return "#4f9a3c";
  if (t.includes("fallow") || t.includes("barren")) return "#9a7b52";
  if (t.includes("developed")) return "#8a8a8a";
  if (t.includes("water") || t.includes("wetland")) return "#3a7ca5";
  return "#7aa83a"; // a crop
}
