import { MONTH_FULL } from "../farmData/format.js";
import { cropColor, cropName } from "./labels.js";
import MonthName from "./MonthName.jsx";

const SEASONS = [
  { id: "spring", name: "Spring", months: [3, 4, 5] },
  { id: "summer", name: "Summer", months: [6, 7, 8] },
  { id: "fall", name: "Fall", months: [9, 10, 11] },
  { id: "winter", name: "Winter", months: [12, 1, 2] },
];

const CROP_ICONS = {
  bermudagrass: "🌾", native_grass_mix: "🌿", sorghum_sudangrass: "🌾", forage_oats: "🌾",
  annual_ryegrass: "🌱", crimson_clover: "🍀", hairy_vetch: "🪻", cowpea: "🫘",
  sunn_hemp: "🌼", winter_wheat_cover: "🌱", corn: "🌽", grain_sorghum: "🌾",
  cotton: "☁️", soybean: "🫘", winter_wheat_grain: "🌾",
};

const monthName = (month) => MONTH_FULL[month - 1];

function monthRanges(months) {
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  if (!sorted.length) return "";
  const groups = [];
  for (const month of sorted) {
    const last = groups[groups.length - 1];
    if (last && month === last[last.length - 1] + 1) last.push(month);
    else groups.push([month]);
  }
  return groups.map((group) => group.length > 1
    ? `${monthName(group[0])}-${monthName(group[group.length - 1])}`
    : monthName(group[0])).join(", ");
}

function CropIcon({ id, crops, compact = false }) {
  const name = cropName(crops, id);
  return (
    <span className={`plan-crop-icon${compact ? " compact" : ""}`} style={{ "--crop-color": cropColor(crops, id) }}
      role={compact ? undefined : "img"} aria-label={compact ? undefined : name} aria-hidden={compact ? "true" : undefined} title={name}>
      <span aria-hidden="true">{CROP_ICONS[id] || "🌱"}</span>
    </span>
  );
}

function monthState(cell, crops) {
  if (!cell.crop_ids.length) return cell.bare ? "No crop listed" : "Green cover seen from space";
  return cell.crop_ids.map((id) => {
    const crop = crops[id];
    const growing = crop?.growing_months?.includes(cell.month);
    return `${cropName(crops, id)}${growing ? " growing" : " in the ground"}`;
  }).join("; ");
}

/** A seasonal, plain-language plan with a compact month-by-month strip for each rotation year. */
export default function SeasonPlan({ strategy, crops, calendar, satelliteBareMonths = [] }) {
  if (!calendar?.length) return <p className="small-print">A seasonal calendar is not available for this rotation.</p>;

  const satelliteBare = new Set(satelliteBareMonths);
  return (
    <section className="season-plan" aria-label="Season-by-season crop plan">
      <header className="season-plan-head">
        <div>
          <p className="plan-kicker">Your plan, season by season</p>
          <h4>What to expect and when</h4>
        </div>
        <p>Month ranges are planning windows, not exact planting dates. Confirm timing with your local extension agent.</p>
      </header>

      {calendar.map((year, yearIndex) => (
        <div className="plan-year" key={yearIndex}>
          {calendar.length > 1 && <h5 className="plan-year-title">Year {yearIndex + 1} of this rotation</h5>}
          <div className="season-grid">
            {SEASONS.map((season) => {
              const cells = season.months.map((m) => year.find((cell) => cell.month === m)).filter(Boolean);
              const cropIds = [...new Set(cells.flatMap((cell) => cell.crop_ids))];
              const plantIds = cropIds.filter((id) => crops[id]?.plant_months?.some((m) => season.months.includes(m)));
              const suggestedPlantIds = strategy.is_current ? [] : plantIds;
              const plantMonths = [...new Set(suggestedPlantIds.flatMap((id) => crops[id].plant_months.filter((m) => season.months.includes(m))))];
              const growingIds = cropIds.filter((id) => crops[id]?.growing_months?.some((m) => season.months.includes(m)));
              const dormantIds = cropIds.filter((id) => !growingIds.includes(id));
              const bareMonths = cells.filter((cell) => cell.bare && !cell.crop_ids.length).map((cell) => cell.month);
              const notes = cropIds.map((id) => crops[id]?.soil_note).filter(Boolean);
              const watch = cropIds.flatMap((id) => (crops[id]?.risks || []).slice(0, 1).map((risk) => ({ id, risk }))).slice(0, 1);
              const overseedIds = new Set((strategy.slots || []).filter((slot) => slot.overseed).flatMap((slot) => slot.crop_ids));

              let action;
              if (suggestedPlantIds.length) {
                const actions = suggestedPlantIds.map((id) => {
                  const name = cropName(crops, id);
                  const window = monthRanges(crops[id].plant_months.filter((m) => season.months.includes(m)));
                  if (crops[id]?.season === "perennial" && yearIndex > 0) return `Maintain established ${name} (guide window: ${window})`;
                  if (overseedIds.has(id)) return `Overseed ${name} (${window})`;
                  if (crops[id]?.season === "perennial") return `Establish ${name} (${window})`;
                  return `Sow ${name} (${window})`;
                });
                action = `${actions.join("; ")}.`;
              } else if (growingIds.length) {
                action = `Keep ${growingIds.map((id) => cropName(crops, id)).join(" and ")} growing and protect the soil cover.`;
              } else if (dormantIds.length) {
                action = `${dormantIds.map((id) => cropName(crops, id)).join(" and ")} stays in the ground while dormant, keeping roots in place.`;
              } else {
                action = "No crop is listed for this season. Consider keeping residue or asking locally about a suitable cover crop.";
              }

              const headlineMonths = plantMonths.length ? monthRanges(plantMonths) : `${monthName(season.months[0])}-${monthName(season.months[season.months.length - 1])}`;
              const monthHeader = plantMonths.length ? "Suggested planting window" : "This season's plan";
              const sustainability = notes[0] || (bareMonths.length
                ? "Bare soil can be more exposed to runoff. Keep residue where practical and check local cover-crop options."
                : "Keeping living roots and residue in place can help protect soil between crops.");

              return (
                <article className={`season-card season-${season.id}`} key={season.id}>
                  <div className="season-title-row">
                    <span className="season-index" aria-hidden="true">{season.id === "spring" ? "01" : season.id === "summer" ? "02" : season.id === "fall" ? "03" : "04"}</span>
                    <div><p>{season.name}</p><h5>{monthName(season.months[0])}-{monthName(season.months[season.months.length - 1])}</h5></div>
                  </div>

                  <div className="season-suggestion">
                    <span>{monthHeader}</span>
                    <strong>{headlineMonths}</strong>
                    <p><strong>{strategy.is_current ? "What happens:" : "What we suggest:"}</strong> {action}</p>
                  </div>

                  <div className="season-crops" aria-label={`${season.name} crops`}>
                    {cropIds.length ? cropIds.map((id) => (
                      <span className="season-crop" key={id}>
                        <CropIcon id={id} crops={crops} />
                        <span>{cropName(crops, id)}</span>
                      </span>
                    )) : <span className="season-no-crop">No planned crop</span>}
                  </div>

                  <ol className="season-months month-row" aria-label={`${season.name}, month by month`}>
                    {cells.map((cell) => {
                      const observedBare = satelliteBare.has(cell.month);
                      const label = `${monthName(cell.month)}: ${monthState(cell, crops)}${observedBare ? "; satellite observed bare ground" : ""}${cell.heat ? "; heat stress" : ""}${cell.frost ? "; frost possible" : ""}${cell.wettest ? "; wettest month" : ""}`;
                      return (
                        <li className={`season-month${cell.bare && !cell.crop_ids.length ? " bare" : ""}${observedBare ? " satellite-bare" : ""}`} key={cell.month} title={label} aria-label={label}>
                          <span><MonthName month={cell.month} /></span>
                          <span className="season-month-icons">
                            {cell.crop_ids.length
                              ? cell.crop_ids.map((id) => <CropIcon key={id} id={id} crops={crops} compact />)
                              : <span className="season-month-empty" aria-hidden="true">{observedBare || cell.bare ? "·" : "✓"}</span>}
                          </span>
                          <small>{cell.crop_ids.length ? `${cell.crop_ids.length} crop${cell.crop_ids.length > 1 ? "s" : ""}` : observedBare ? "Bare seen" : cell.bare ? "Bare" : "Green"}</small>
                        </li>
                      );
                    })}
                  </ol>

                  <div className="season-notes">
                    <p><strong>Soil benefit</strong>{sustainability}</p>
                    {watch.length > 0 && <p><strong>Plan ahead</strong>{cropName(crops, watch[0].id)}: {watch[0].risk}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
      {satelliteBare.size > 0 && <p className="plan-satellite-note">Dashed month borders mark periods NASA's MODIS satellite often saw little green cover; the satellite view may differ from the crop-calendar estimate.</p>}
    </section>
  );
}
