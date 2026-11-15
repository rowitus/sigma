// A short, plain description of the chosen field, sent with each chat question so the search
// answers for this exact spot. Built only from data the page already loaded; missing values are
// simply left out. Pure function (no React).

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];

const lower = (v) => String(v ?? "").toLowerCase();

export function farmBrief({ place, rotation, weather, today = new Date() } = {}) {
  const parts = [];
  if (place?.label) {
    parts.push(`My field is at ${place.label}${place.lat != null ? ` (${Number(place.lat).toFixed(3)}, ${Number(place.lon).toFixed(3)})` : ""}.`);
  }
  parts.push(`It is ${MONTHS[today.getMonth()]} ${today.getFullYear()}.`);

  if (rotation) {
    const f = rotation.soil_facts || {};
    const p = rotation.soil_profile;
    const soil = [];
    if (p?.status === "ok" && p.map_unit) soil.push(`mapped as "${p.map_unit}"`);
    if (p?.status === "ok" && p.layers?.[0]?.texture) soil.push(`top layer ${lower(p.layers[0].texture)}`);
    if (f.drainage?.value) soil.push(`${lower(f.drainage.value)}`);
    if (f.om_pct?.value != null) soil.push(`${f.om_pct.value}% organic matter`);
    if (f.flooding?.value && lower(f.flooding.value) !== "none") soil.push(`flooding ${lower(f.flooding.value)}`);
    if (soil.length) parts.push(`Soil survey: ${soil.join(", ")}.`);

    const c = rotation.current_rotation;
    if (c?.label && c.status !== "unknown") parts.push(`What grows here now: ${c.label}.`);
    const best = (rotation.strategies || []).find((s) => s.best_fit);
    if (best?.name) parts.push(`A rotation that fits well: ${best.name}.`);
  }

  if (weather) {
    const periods = weather.forecast?.status === "ok" ? weather.forecast.periods || [] : [];
    if (periods.length) {
      parts.push("Forecast: " + periods.slice(0, 3)
        .map((x) => `${x.name} ${x.temp_f}°F ${lower(x.short)}${x.rain_pct ? `, ${x.rain_pct}% rain` : ""}`)
        .join("; ") + ".");
    }
    const a = weather.alerts?.status === "ok" ? weather.alerts : null;
    const titles = [...(a?.official || []), ...(a?.farm || [])].map((x) => x.title).filter(Boolean);
    if (titles.length) parts.push(`Weather alerts: ${titles.slice(0, 3).join("; ")}.`);
  }
  return parts.join(" ");
}
