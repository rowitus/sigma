// Small pure helpers for showing farm facts. No React here, so they are easy to test.

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Trim a number to at most `digits` decimals without trailing zeros: 50 -> "50", 2.50 -> "2.5". */
function trimNumber(n, digits = 1) {
  return String(Number(n.toFixed(digits)));
}

/**
 * How broad an area the data covers, in words. 1000 m or more is shown in kilometres,
 * anything smaller in metres: 50000 -> "50 km", 250 -> "250 m", 30 -> "30 m".
 */
export function formatResolution(metres) {
  const m = Number(metres);
  if (!Number.isFinite(m) || m <= 0) return "unknown area";
  if (m >= 1000) return `${trimNumber(m / 1000)} km`;
  return `${Math.round(m)} m`;
}

/** "02-19" -> "Feb 19". Returns the input unchanged if it does not look like MM-DD. */
export function formatMonthDay(text) {
  const match = /^(\d{2})-(\d{2})$/.exec(String(text));
  if (!match) return String(text);
  const month = MONTH_NAMES[Number(match[1]) - 1];
  return month ? `${month} ${Number(match[2])}` : String(text);
}

/** A number for display with a sensible number of decimals. */
export function formatNumber(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

/** "live" -> "live", "cached" -> "saved copy" (plain words for the source tag). */
export function formatFreshness(liveOrCached) {
  return liveOrCached === "cached" ? "saved copy" : "live";
}

/** Group a list of Feature_Records by their variable name: { temperature_mean: [...], ... }. */
export function byVariable(records = []) {
  const out = {};
  for (const r of records) (out[r.variable] ||= []).push(r);
  return out;
}

/** The single value of a one-off record (e.g. frost_days_per_year), or undefined. */
export function firstValue(groups, variable) {
  return groups[variable]?.[0]?.value;
}

/** 12 monthly values ordered January..December, or null if any month is missing. */
export function monthlySeries(groups, variable) {
  const list = groups[variable];
  if (!list) return null;
  const values = Array(12).fill(null);
  for (const r of list) {
    const i = Number(r.date) - 1;
    if (i >= 0 && i < 12) values[i] = Number(r.value);
  }
  return values.every((v) => Number.isFinite(v)) ? values : null;
}
