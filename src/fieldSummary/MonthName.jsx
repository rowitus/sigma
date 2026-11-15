import { MONTH_FULL, MONTH_NAMES } from "../farmData/format.js";

/**
 * A month's name for a 12-month row: the full name ("September") when the row is wide enough,
 * the 3-letter name ("Sep") when it is narrow (phones, small cards). Each month's own box decides
 * (CSS container query on ".month-row > li" in index.css), so the same row works everywhere.
 * month: 1-12
 */
export default function MonthName({ month }) {
  return (
    <>
      <span className="month-full">{MONTH_FULL[month - 1]}</span>
      <span className="month-short">{MONTH_NAMES[month - 1]}</span>
    </>
  );
}
