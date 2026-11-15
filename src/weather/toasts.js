// Order of the weather alert pop-ups. Pure function, no React.

const RANK = { danger: 0, warn: 1, info: 2 };
const byLevel = (a, b) => (RANK[a.level] ?? 3) - (RANK[b.level] ?? 3);

/**
 * Official National Weather Service alerts first, then the farm alerts worked out from the
 * forecast. Inside each group: danger, then warn, then info (a farm "danger" never goes above an
 * official alert). Alerts whose id is in dismissedIds are left out.
 */
export function orderToasts(official = [], farm = [], dismissedIds = []) {
  const hidden = new Set(dismissedIds);
  const keep = (list, kind) =>
    [...list].sort(byLevel).filter((a) => !hidden.has(a.id)).map((a) => ({ ...a, group: kind }));
  return [...keep(official, "official"), ...keep(farm, "farm")];
}

/** Every alert id in an /api/weather answer (official and farm). */
export function allAlertIds(weather) {
  const a = weather?.alerts;
  return [...(a?.official || []), ...(a?.farm || [])].map((x) => x.id);
}
