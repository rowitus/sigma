import SourceTag from "./SourceTag.jsx";

/** Crop history view: what the Cropland Data Layer saw at this spot each year, newest first. */
export default function CropHistoryView({ records }) {
  const years = [...records].sort((a, b) => Number(b.date) - Number(a.date));
  return (
    <>
      <h3 className="view-heading">Crop history</h3>
      <p className="small-print">
        What USDA's yearly crop map, made from satellite images, shows at this spot ({years.length} year
        {years.length === 1 ? "" : "s"}).
      </p>
      <ol className="crop-list">
        {years.map((r) => (
          <li key={r.date}>
            <span className="crop-year">{r.date}</span>
            <span className="crop-name">{r.value}</span>
          </li>
        ))}
      </ol>
      <p className="note">
        The crop map labels each 30 m square and can get a single square wrong. Compare it with what you know grew
        there.
      </p>
      <SourceTag records={records} />
    </>
  );
}
