// Field helper: fixed questions and the rules that answer them. No AI and no network.
//
// Every answer is built only from data the page already loaded for the chosen spot:
//   rotation = the /api/rotation answer (soil, crop history, climate trends, outlook, rotations)
//   weather  = the /api/weather answer (National Weather Service forecast and alerts)
// When a value is missing, the answer says so. It never makes a value up.
// Pure functions (no React), so tests/answers.test.mjs can check them with node --test.

import { TERMS } from "../fieldSummary/terms.js";
import { CONFIDENCE, DIMENSIONS, PRIORITIES, cropName, evidenceText } from "../fieldSummary/labels.js";
import { LINKS } from "../landing/copy.js";

// needs: "rotation" = waits for the field data, "weather" = waits for the forecast, "none" = always works.
// keywords: words a farmer might type; used by matchQuestion() below.
export const QUESTIONS = [
  { id: "soil", group: "Your field and soil", label: "What is my soil like?", needs: "rotation",
    keywords: ["soil", "dirt", "clay", "sand", "loam", "texture", "organic", "layer", "deep", "depth", "water hold"] },
  { id: "flood", group: "Your field and soil", label: "Does this field flood or stay wet?", needs: "rotation",
    keywords: ["flood", "wet", "pond", "standing water", "drain", "drainage", "soggy", "waterlog"] },
  { id: "erosion", group: "Your field and soil", label: "How easily does my soil wash away?", needs: "rotation",
    keywords: ["erosion", "erode", "wash", "washes", "runoff", "slope", "gully", "k factor"] },
  { id: "history", group: "Your field and soil", label: "What has grown here recently?", needs: "rotation",
    keywords: ["grown", "grew", "history", "past", "last year", "crop map", "cdl", "planted", "before"] },

  { id: "week", group: "Weather this week", label: "What is the weather this week?", needs: "weather",
    keywords: ["weather", "forecast", "week", "today", "tomorrow", "temperature", "high", "low"] },
  { id: "alerts", group: "Weather this week", label: "Are there frost, heat or storm warnings?", needs: "weather",
    keywords: ["alert", "warning", "warn", "frost", "freeze", "heat", "storm", "danger"] },
  { id: "rain_wind", group: "Weather this week", label: "Will it rain or be windy in the next 3 days?", needs: "weather",
    keywords: ["rain", "wind", "windy", "spray", "spraying", "shower", "precipitation"] },

  { id: "hotter", group: "Climate since the 1980s", label: "Is it getting hotter here?", needs: "rotation",
    keywords: ["hotter", "warmer", "warming", "hot days", "warm nights", "climate", "heat trend", "temperature trend"] },
  { id: "rain_trend", group: "Climate since the 1980s", label: "Is the rain changing?", needs: "rotation",
    keywords: ["rain changing", "rainfall", "drought", "dry", "dry spell", "heavy rain", "rain trend", "less rain", "more rain"] },
  { id: "groundwater", group: "Climate since the 1980s", label: "Is groundwater or soil moisture low?", needs: "rotation",
    keywords: ["groundwater", "ground water", "well", "wells", "aquifer", "soil moisture", "grace", "water table",
      "running low", "run low", "dry well"] },
  { id: "outlook", group: "Climate since the 1980s", label: "What about 2030–2049?", needs: "rotation",
    keywords: ["future", "2030", "2040", "2049", "outlook", "projection", "coming years", "climate change"] },

  { id: "best", group: "Rotations", label: "Which rotation fits my priorities best?", needs: "rotation",
    keywords: ["best", "recommend", "should i plant", "what to plant", "which rotation", "top option", "rotation"] },
  { id: "compare", group: "Rotations", label: "How does my current rotation compare?", needs: "rotation",
    keywords: ["compare", "current", "my rotation", "what i grow", "versus", "vs", "better"] },
  { id: "risks", group: "Rotations", label: "What are the risks of the top option?", needs: "rotation",
    keywords: ["risk", "risks", "problem", "downside", "pest", "danger of"] },
  { id: "excluded", group: "Rotations", label: "Why are some crops not suggested?", needs: "rotation",
    keywords: ["why not", "not suggested", "ruled out", "excluded", "corn", "cotton", "missing crop", "can't grow", "cannot grow"] },
  { id: "confidence", group: "Rotations", label: "How sure is this?", needs: "rotation",
    keywords: ["sure", "confidence", "trust", "accurate", "reliable", "certain"] },

  { id: "terms", group: "Help", label: "What does this word mean?", needs: "none",
    keywords: ["mean", "meaning", "word", "define", "definition", "glossary", "term"] },
  { id: "talk", group: "Help", label: "Who can I talk to?", needs: "none",
    keywords: ["talk", "person", "help", "extension", "agent", "nrcs", "contact", "call", "office", "usda"] },
  { id: "limits", group: "Help", label: "What can't this tool tell me?", needs: "none",
    keywords: ["limit", "limits", "can't", "cannot", "accuracy", "source", "sources", "where does the data"] },
];

export const EXPERT = "Talk this over with your county extension agent before you decide.";

/**
 * Answer one question.
 * ctx = { rotation, rotationState, weather, weatherState, place }
 *   rotationState: "ready" | "loading" | "error" (with ctx.rotationError) | "idle"
 *   weatherState:  "ready" | "loading" | "error" | "idle"
 * Returns { id, question, paragraphs[], items[], sources[], terms[], links[], expert }.
 */
export function answer(id, ctx = {}) {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) return null;
  // paragraphs come first, then the items list, then notes (short remarks about the list).
  const base = { id, question: q.label, paragraphs: [], items: [], notes: [], sources: [], terms: [], links: [], expert: false };

  const waitFor = notReady(q.needs, ctx);
  if (waitFor) return { ...base, paragraphs: [waitFor] };

  const out = BUILDERS[id](ctx) || {};
  return { ...base, ...out, paragraphs: out.paragraphs || [], items: out.items || [], notes: out.notes || [],
    sources: out.sources || [], terms: out.terms || [], links: out.links || [], expert: !!out.expert };
}

/** Explain a single glossary term (used when a typed question names one). */
export function answerTerm(termId) {
  const entry = TERMS[termId];
  if (!entry) return null;
  return { id: `term:${termId}`, question: `What does "${entry[0]}" mean?`, paragraphs: [`${entry[0]}: ${entry[1]}`],
    items: [], sources: [], terms: [], links: [], expert: false };
}

/** Reply for typed text that matches nothing. */
export function noMatch(text) {
  return { id: "none", question: text, paragraphs: [
    "I can only answer the questions listed below. I do not guess, so pick the closest one, or ask a person.",
  ], items: [], sources: [], terms: [], links: ["extension"], expert: false };
}

/**
 * Match typed text to a question or a glossary term with simple keyword rules.
 * Returns { kind: "question", id } | { kind: "term", id } | null.
 */
export function matchQuestion(text) {
  const t = ` ${String(text || "").toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim()} `;
  if (t.trim().length < 2) return null;

  // A glossary word ("what is NDVI", "drainage class meaning")
  let term = null;
  for (const [id, [name]] of Object.entries(TERMS)) {
    const words = [name.toLowerCase().replace(/\(.*?\)/g, "").trim(), id.replace(/_/g, " ")];
    if (id === "ndvi") words.push("ndvi", "greenness");
    if (id === "k_factor") words.push("k factor", "erodibility");
    if (words.some((w) => w && t.includes(` ${w} `) || (w.length > 5 && t.includes(w)))) { term = id; break; }
  }
  const askingMeaning = /\b(mean|means|meaning|what is|what's|whats|define|definition)\b/.test(t);
  if (term && askingMeaning) return { kind: "term", id: term };

  // The question with the most keyword hits (longer keywords count a bit more).
  let best = null;
  let bestScore = 0;
  for (const q of QUESTIONS) {
    let score = 0;
    for (const k of q.keywords) if (t.includes(` ${k} `) || (k.length > 4 && t.includes(k))) score += k.includes(" ") ? 2 : 1;
    if (score > bestScore) { best = q.id; bestScore = score; }
  }
  if (best) return { kind: "question", id: best };
  if (term) return { kind: "term", id: term };
  return null;
}

// ---------------------------------------------------------------------------------------------

function notReady(needs, ctx) {
  if (needs === "rotation") {
    if (ctx.rotationState === "ready" && ctx.rotation) return null;
    if (ctx.rotationState === "error") return `The field data could not load: ${ctx.rotationError || "unknown error"}. Weather and help questions still work.`;
    if (ctx.rotationState === "idle") return "Choose a spot on the map first.";
    return "Still working out the data for this field. The first look at a new spot can take up to a minute. Weather and help questions work now.";
  }
  if (needs === "weather") {
    if (ctx.weatherState === "ready" && ctx.weather) return null;
    if (ctx.weatherState === "error") return "The weather service could not be reached. Try again in a few minutes.";
    if (ctx.weatherState === "idle") return "Choose a spot on the map first.";
    return "The forecast is still loading.";
  }
  return null;
}

const BUILDERS = {
  soil({ rotation }) {
    const f = rotation.soil_facts || {};
    const p = rotation.soil_profile;
    if (p?.status !== "ok" && !Object.keys(f).length) {
      return { paragraphs: ["The soil survey did not answer for this spot, so I can't describe the soil."], sources: ["USDA NRCS SSURGO soil survey"] };
    }
    const paragraphs = [];
    const items = [];
    if (p?.status === "ok") {
      const layers = p.layers || [];
      if (p.map_unit) paragraphs.push(`The soil survey maps this spot as "${p.map_unit}".`);
      if (layers.length) {
        const bottom = layers[layers.length - 1].bottom_cm;
        items.push(`Top layer: ${layers[0].texture || "texture not listed"}.`);
        if (bottom != null) items.push(`The survey describes ${layers.length} layer${layers.length > 1 ? "s" : ""}, down to ${bottom} cm (about ${round(bottom / 2.54)} in).`);
      }
    }
    if (f.hydro_group) items.push(`Hydrologic group ${f.hydro_group.value}: ${hydroText(f.hydro_group.value)}`);
    if (f.drainage) items.push(`Drainage: ${lower(f.drainage.value)}.`);
    if (f.om_pct) items.push(`Organic matter in the top layer: ${f.om_pct.value} %.`);
    if (f.awc) items.push(`It holds about ${f.awc.value} inches of plant-available water per inch of soil.`);
    const notes = ["These are averages for a mapped soil area, not a test of your field. A soil test tells you pH and nutrients."];
    return { paragraphs, items, notes, sources: [soilSource(f, p)], terms: ["hydrologic_group", "drainage_class", "organic_matter"] };
  },

  flood({ rotation }) {
    const f = rotation.soil_facts || {};
    const flooding = f.flooding?.value ?? rotation.soil_profile?.flooding;
    const ponding = f.ponding?.value ?? rotation.soil_profile?.ponding;
    if (flooding == null && ponding == null && !f.drainage) {
      return { paragraphs: ["The soil survey did not answer for this spot, so I can't say how often it floods."], sources: ["USDA NRCS SSURGO soil survey"] };
    }
    const items = [];
    if (flooding != null) items.push(floodText(flooding));
    if (ponding != null) items.push(lower(ponding) === "none" ? "Ponding (standing water): none expected." : `Ponding (standing water): ${lower(ponding)}.`);
    if (f.drainage) items.push(`Drainage: ${lower(f.drainage.value)}.`);
    if (f.hydro_group) items.push(`Hydrologic group ${f.hydro_group.value}: ${hydroText(f.hydro_group.value)}`);
    const wet = (flooding && !["none", "very rare"].includes(lower(flooding))) || (ponding && lower(ponding) !== "none");
    const paragraphs = [wet
      ? "Crops that cannot stand wet roots are ruled out for this field. Ask your NRCS office about drainage and planting dates."
      : "The survey does not expect regular floods here, but low spots in your field can still hold water."];
    return { paragraphs, items, sources: [soilSource(f, rotation.soil_profile)], terms: ["flooding_frequency", "drainage_class", "hydrologic_group"], links: wet ? ["nrcs"] : [] };
  },

  erosion({ rotation }) {
    const f = rotation.soil_facts || {};
    if (!f.k_factor && !f.slope_high) {
      return { paragraphs: ["The soil survey did not give an erodibility value for this spot."], sources: ["USDA NRCS SSURGO soil survey"] };
    }
    const items = [];
    if (f.k_factor) {
      const k = Number(f.k_factor.value);
      const level = k >= 0.3 ? "high: it washes away easily" : k >= 0.2 ? "moderate" : "low: it holds together well";
      items.push(`Erodibility (K factor): ${k}, which is ${level}.`);
    }
    if (f.slope_high) items.push(`Steepest slope in this soil's mapped range: ${f.slope_high.value} %.`);
    const current = (rotation.strategies || []).find((s) => s.is_current);
    const paragraphs = ["Keeping living cover on the soil, especially in the wettest months, protects it most."];
    if (current?.scores?.today?.erosion != null) paragraphs.push(`Your current rotation scores ${current.scores.today.erosion} of 100 for erosion protection.`);
    return { paragraphs, items, sources: [soilSource(f, rotation.soil_profile)], terms: ["k_factor"] };
  },

  history({ rotation }) {
    const c = rotation.current_rotation;
    if (!c) return { paragraphs: ["The crop map did not answer for this spot."], sources: ["USDA NASS Cropland Data Layer, 30 m"] };
    const items = groupYears(c.history || []).map((g) => `${g.years}: ${g.category}`);
    const paragraphs = [];
    if (c.status === "farmer_choice") paragraphs.push(`You told the app you grow ${c.label}.`);
    else if (c.status === "inferred") paragraphs.push(`The app reads this as "${c.label}"${c.evidence ? ` (${c.evidence})` : ""}.`);
    else paragraphs.push(`The app could not tell what grows here${c.reason ? `: ${c.reason}` : "."}`);
    if (!items.length) paragraphs.push("No crop map years were available for this spot.");
    paragraphs.push("This comes from a satellite crop map of 30 m squares, and one square can be mislabelled. You can set your real crop under \"Compare rotations\".");
    return { paragraphs, items, sources: ["USDA NASS Cropland Data Layer, 30 m"] };
  },

  week({ weather }) {
    const fc = weather.forecast;
    if (fc?.status !== "ok" || !fc.periods?.length) return { paragraphs: [unavailable("The forecast", fc)], sources: ["National Weather Service"] };
    const items = fc.periods.slice(0, 6).map((p) =>
      `${p.name}: ${p.short}, ${p.is_day ? "high" : "low"} ${p.temp_f} °F${p.rain_pct != null ? `, rain chance ${p.rain_pct} %` : ""}.`);
    return { paragraphs: ["The next 3 days:"], items, sources: ["National Weather Service forecast"], links: [] };
  },

  alerts({ weather }) {
    const a = weather.alerts;
    if (!a || a.status !== "ok") return { paragraphs: [unavailable("Alerts", a)], sources: ["National Weather Service"] };
    const items = [
      ...(a.official || []).map((x) => `Official NWS: ${x.title}${x.until ? ` (until ${when(x.until)})` : ""}.`),
      ...(a.farm || []).map((x) => `${x.title} (${x.reason}). ${x.action}`),
    ];
    if (!items.length) {
      return { paragraphs: ["No official NWS alerts right now, and no frost, heat or storm alerts from the next 3 days of forecast."], sources: ["National Weather Service"] };
    }
    const paragraphs = [];
    if ((a.farm || []).length) paragraphs.push("Farm alerts are suggestions worked out from the forecast, not official warnings.");
    return { paragraphs, items, sources: ["National Weather Service alerts and forecast"] };
  },

  rain_wind({ weather }) {
    const fc = weather.forecast;
    if (fc?.status !== "ok" || !fc.periods?.length) return { paragraphs: [unavailable("The forecast", fc)], sources: ["National Weather Service"] };
    const next = fc.periods.slice(0, 6);
    const items = next.map((p) => `${p.name}: rain chance ${p.rain_pct ?? 0} %, wind ${p.wind || "not given"}.`);
    const wettest = next.reduce((m, p) => ((p.rain_pct ?? 0) > (m.rain_pct ?? 0) ? p : m), next[0]);
    const windiest = next.reduce((m, p) => ((p.wind_max_mph ?? 0) > (m.wind_max_mph ?? 0) ? p : m), next[0]);
    const paragraphs = [
      `Highest rain chance: ${wettest.name}, ${wettest.rain_pct ?? 0} %. Strongest wind: ${windiest.name}, up to ${windiest.wind_max_mph ?? "?"} mph.`,
    ];
    const notes = ["Check your product label for wind and rain limits before spraying."];
    return { paragraphs, items, notes, sources: ["National Weather Service forecast"] };
  },

  hotter({ rotation }) {
    const t = rotation.trends;
    if (t?.status !== "ok") return { paragraphs: [unavailable("The climate history", t)], sources: ["NASA POWER"] };
    const items = ["hot_days", "warm_nights", "frost_days"].map((id) => trendLine(t, id)).filter(Boolean);
    if (!items.length) return { paragraphs: ["The climate history has no temperature counts for this spot."], sources: [powerSource(t)] };
    return {
      paragraphs: ["Counts per year from NASA's daily weather record. They describe the region around your farm, about 50 km wide."],
      items, sources: [powerSource(t)], terms: ["hot_day", "warm_night", "frost_day", "clear_change"],
    };
  },

  rain_trend({ rotation }) {
    const t = rotation.trends;
    if (t?.status !== "ok") return { paragraphs: [unavailable("The climate history", t)], sources: ["NASA POWER"] };
    const items = [];
    const rain = indicator(t, "rain_total");
    if (rain) items.push(`Yearly rain: ${rain.recent_avg} mm (${inches(rain.recent_avg / 25.4)} in) in ${t.recent_period}, against ${rain.baseline_avg} mm in ${t.baseline_period}. ${changeWords(rain, "mm")}`);
    const heavy = indicator(t, "heavy_rain_days");
    if (heavy) items.push(`Heavy-rain days (more than ${t.heavy_rain_threshold_mm} mm, about ${inches(t.heavy_rain_threshold_mm / 25.4)} in, in a day): ${heavy.recent_avg} a year recently. ${changeWords(heavy, "days")}`);
    const dry = indicator(t, "dry_spell");
    if (dry) items.push(`Longest dry spell: about ${dry.recent_avg} days a year recently. ${changeWords(dry, "days")}`);
    if (t.rain_cv_pct != null) items.push(`Yearly rain swings by about ${t.rain_cv_pct} % from one year to the next.`);
    if (!items.length) return { paragraphs: ["The climate history has no rain values for this spot."], sources: [powerSource(t)] };
    return { paragraphs: ["From NASA's daily weather record for the region around your farm."], items, sources: [powerSource(t)], terms: ["variation", "clear_change"] };
  },

  groundwater({ rotation }) {
    const w = rotation.water;
    const source = "NASA GRACE/GRACE-FO data assimilation (GRACE-DA), weekly, about 14 km, via NASA GES DISC";
    if (w?.status !== "ok") return { paragraphs: [unavailable("NASA's satellite water data", w)], sources: [source] };
    const items = [];
    for (const [key, name] of [["groundwater", "Groundwater"], ["root_zone", "Root-zone soil moisture"], ["surface", "Surface soil moisture"]]) {
      const p = w[key];
      if (p?.status !== "ok") continue;
      items.push(`${name}: ${round(p.latest.pct)} in the week of ${p.latest.date} (${pctWords(p.latest.pct)}); ${round(p.last_12m_avg)} on average over the last 12 months.`);
    }
    if (!items.length) return { paragraphs: ["GRACE values are not available for this spot."], sources: [source] };
    const low = (w.groundwater?.last_12m_avg ?? 100) < 20;
    return {
      paragraphs: ["Percentiles compare each week with the same week in 1948–2012: 10 is very dry, 50 is normal, 90 is very wet."],
      items,
      notes: [
        low ? "Groundwater has been low for a year. Wells may run lower, so water-saving crops and cover that helps rain soak in matter more."
            : "Groundwater has not been in drought on average over the last year.",
        "GRACE sees a region hundreds of kilometres wide, so this is the regional picture, not your well.",
      ],
      sources: [source], terms: ["percentile", "grace"], expert: low,
    };
  },

  outlook({ rotation }) {
    const o = rotation.outlook;
    if (o?.status !== "ok") {
      if (o?.status === "unavailable") return { paragraphs: [`The 2030–2049 outlook is not available here${o.reason ? `: ${o.reason}` : "."}`], sources: ["Open-Meteo Climate API"] };
      return { paragraphs: ["The 2030–2049 outlook is not loaded for this spot yet. Use the \"Load 2030–2049 outlook\" button under \"What the data says about this field\", then ask again."], sources: ["Open-Meteo Climate API"] };
    }
    const items = ["hot_days", "warm_nights", "frost_days", "rain_total"].map((id) => outlookLine(o, id)).filter(Boolean);
    return {
      paragraphs: [
        `What ${o.models?.length || "several"} climate models expect for ${o.future} compared with ${o.recent}, under a ${o.scenario || "high-emissions"} scenario.`,
        "This is a range of possible averages, not a forecast for any single year.",
      ],
      items, sources: [`Open-Meteo Climate API, about ${o.resolution_km || 10} km (CC BY 4.0), added to NASA POWER averages`], terms: ["climate_projection"],
    };
  },

  best({ rotation }) {
    const best = bestStrategy(rotation);
    if (!best) return { paragraphs: ["No rotation options could be worked out for this field."], sources: [] };
    const prios = (rotation.inputs?.priorities || []).map((id) => PRIORITIES.find((p) => p.id === id)?.label || id);
    const paragraphs = [
      prios.length
        ? `With your priorities (${prios.join(", ")}), the best fit is "${best.name}", overall ${best.scores.today.overall} of 100.`
        : `With all six scores counted equally, the best fit is "${best.name}", overall ${best.scores.today.overall} of 100. You can pick priorities under "Compare rotations".`,
    ];
    const items = (best.why || []).slice(0, 3).map((w) => w.text);
    if (items.length) paragraphs.push("Why:");
    const notes = [];
    const current = (rotation.strategies || []).find((s) => s.is_current);
    if (current?.scores?.today?.overall != null && current.scores.today.overall >= best.scores.today.overall) {
      notes.push(`Your current rotation scores at least as high today (${current.scores.today.overall}).`);
    }
    notes.push("This is a starting point to discuss, not a recommendation.");
    return { paragraphs, items, notes, sources: whySources(best), expert: true };
  },

  compare({ rotation }) {
    const current = (rotation.strategies || []).find((s) => s.is_current);
    const best = bestStrategy(rotation);
    if (!current || !best) return { paragraphs: ["There is no current rotation to compare for this field."], sources: [] };
    const a = current.scores?.today || {};
    const b = best.scores?.today || {};
    const items = DIMENSIONS.map((d) => `${d.label}: ${a[d.id] ?? "?"} now, ${b[d.id] ?? "?"} for the best fit.`);
    const paragraphs = [
      `"${current.name}" scores ${a.overall ?? "?"} of 100 overall. The best fit, "${best.name}", scores ${b.overall ?? "?"}.`,
    ];
    const notes = ["Scores are a guide built from the crop table and your field facts. They have no prices, equipment or labour in them."];
    return { paragraphs, items, notes, sources: ["Field Shift crop table (SARE, USDA NRCS, Texas A&M AgriLife) and this field's data"], expert: true };
  },

  risks({ rotation }) {
    const best = bestStrategy(rotation);
    if (!best) return { paragraphs: ["No rotation options could be worked out for this field."], sources: [] };
    const items = [...(best.risks || []).map((r) => r.text), ...(best.future_risks || []).map((r) => `In the 2030–2049 outlook: ${r.text}`)];
    const paragraphs = [`Risks for "${best.name}":`];
    if (!items.length) paragraphs.push("No specific risks are listed in the crop table for this option.");
    return { paragraphs, items, sources: ["Field Shift crop table (SARE, USDA NRCS, Texas A&M AgriLife)"], expert: true };
  },

  excluded({ rotation }) {
    const ex = rotation.exclusions || [];
    const ns = rotation.not_suggested || [];
    const seen = new Set();
    const items = [];
    for (const e of ex) {
      const key = `${e.crop_id}:${e.period}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(`${e.crop_name || cropName(rotation.crops, e.crop_id)}${e.period === "outlook" ? " (2030–2049 outlook)" : ""}: ${e.text}`);
    }
    for (const n of ns) items.push(`${n.name}: ${n.reason}`);
    if (!items.length) return { paragraphs: ["No crop in the table was ruled out for this field."], sources: [] };
    const sources = [...new Set(ex.flatMap((e) => (e.evidence || []).map((v) => v.source)).filter(Boolean))];
    return { paragraphs: ["These crops were left out by a rule you can read:"], items, sources, expert: true };
  },

  confidence({ rotation }) {
    const best = bestStrategy(rotation);
    const level = best?.confidence;
    const c = CONFIDENCE[level];
    const paragraphs = [c ? `${c.label}. ${c.text}` : "Confidence is not known for this field."];
    const missing = rotation.missing_sources || [];
    if (missing.length) paragraphs.push(`Sources that did not answer: ${missing.join(", ")}.`);
    const items = [...new Set((best?.gaps || []))];
    if (items.length) paragraphs.push("What the app does not know:");
    const notes = ["The app never sees your soil test, your equipment, your labour or local prices."];
    return { paragraphs, items, notes, sources: [], expert: true };
  },

  terms() {
    const items = Object.values(TERMS).map(([name, text]) => `${name}: ${text}`);
    return { paragraphs: ["Words used on this page:"], items };
  },

  talk() {
    return {
      paragraphs: [
        "Your county extension agent works with your state's land-grant university and can answer questions about your own fields, often at no cost.",
        "NRCS helps with soil, water and conservation plans, and with cost-share programs. A USDA Service Center has NRCS and Farm Service Agency staff in one office.",
      ],
      links: ["extension", "nrcs", "serviceCenter"],
    };
  },

  limits() {
    return {
      paragraphs: ["What the data can and cannot say:"],
      items: [
        "The crop list is written for Central Texas. Elsewhere in the US, treat the options as rough ideas.",
        "The yellow box on the map is about 1 km around your point. It is not your field boundary.",
        "The crop map reads one 30 m square a year from satellite images, and a square can be mislabelled.",
        "Soil values are averages for a mapped soil area, not a test of your field.",
        "Climate trends come from NASA POWER, about 50 km wide, so they describe your region.",
        "The 2030–2049 outlook is a range of possible futures, not a forecast.",
        "Scores are a guide, not a yield model. They have no prices, equipment or labour in them.",
        "Farm weather alerts are suggestions worked out from the NWS forecast.",
      ],
      sources: ["See \"Data and limitations\" at the bottom of the field summary"],
      links: ["extension"],
    };
  },
};

// ----- small helpers ---------------------------------------------------------------------------

export function linkFor(key) {
  return LINKS[key] || null;
}

function bestStrategy(rotation) {
  const list = rotation.strategies || [];
  return list.find((s) => s.best_fit) || list.find((s) => !s.is_current) || null;
}

function whySources(s) {
  const out = (s.why || []).flatMap((w) => (w.evidence || []).map(evidenceText)).filter(Boolean);
  return [...new Set(out)].slice(0, 4);
}

function indicator(t, id) {
  return (t.indicators || []).find((i) => i.id === id) || null;
}

function trendLine(t, id) {
  const i = indicator(t, id);
  if (!i || i.first_decade_avg == null || i.last_decade_avg == null) return null;
  const start = Number(String(i.years || t.period || "").slice(0, 4));
  const first = start ? `${start}–${start + 9}` : "the first ten years";
  return `${i.label}: ${round(i.first_decade_avg)} a year in ${first}, ${round(i.last_decade_avg)} a year in the last ten years. ${changeWords(i, unitWord(i.units))}`;
}

function changeWords(i, unit) {
  if (i.per_decade == null) return "";
  const n = Math.abs(round(i.per_decade, 1));
  const dir = i.per_decade > 0 ? "more" : i.per_decade < 0 ? "fewer" : null;
  const what = !dir || n === 0
    ? "No change per decade."
    : unit === "mm" ? `About ${n} mm ${i.per_decade > 0 ? "more" : "less"} per decade.` : `About ${n} ${dir} ${unit} per decade.`;
  return `${what} ${i.clear ? "This is a clear change." : "This could still be normal ups and downs."}`;
}

function outlookLine(o, id) {
  const i = (o.indicators || []).find((x) => x.id === id);
  if (!i?.future_value) return null;
  const v = i.future_value;
  if (id === "rain_total") {
    return `${i.label || "Yearly rain"}: about ${round(v.mid)} mm (${inches(v.mid / 25.4)} in) a year, range ${round(v.low)} to ${round(v.high)} mm${i.baseline_avg != null ? `, against ${round(i.baseline_avg)} mm in ${o.recent}` : ""}.`;
  }
  return `${i.label}: about ${round(v.mid)} a year (range ${round(v.low)} to ${round(v.high)})${i.baseline_avg != null ? `, against ${round(i.baseline_avg)} in ${o.recent}` : ""}.`;
}

function pctWords(p) {
  if (p < 10) return "very dry";
  if (p < 20) return "dry";
  if (p <= 80) return "near normal";
  if (p <= 90) return "wet";
  return "very wet";
}

function unitWord(units) {
  const u = String(units || "");
  if (u.startsWith("nights")) return "nights";
  if (u.startsWith("days")) return "days";
  return u;
}

function groupYears(history) {
  const out = [];
  for (const h of [...history].sort((a, b) => a.year - b.year)) {
    const last = out[out.length - 1];
    if (last && last.category === h.category && last.to === h.year - 1) last.to = h.year;
    else out.push({ category: h.category || "not mapped", from: h.year, to: h.year });
  }
  return out.map((g) => ({ category: g.category, years: g.from === g.to ? `${g.from}` : `${g.from}–${g.to}` }));
}

function hydroText(group) {
  const g = String(group || "").toUpperCase().charAt(0);
  const text = {
    A: "rain soaks in fast, so there is little runoff.",
    B: "rain soaks in at a moderate rate.",
    C: "rain soaks in slowly, so heavy rain can run off.",
    D: "rain soaks in very slowly, so heavy rain runs off.",
  }[g] || "how fast rain soaks in is not clear.";
  return String(group).includes("/") ? `${text} (The first letter applies when the field is drained.)` : text;
}

function floodText(value) {
  const v = lower(value);
  const text = {
    none: "Flooding: the soil survey does not expect floods here.",
    "very rare": "Flooding: very rare (less than about once in 500 years).",
    rare: "Flooding: rare (about 1 to 5 times in 100 years).",
    occasional: "Flooding: occasional (about 5 to 50 times in 100 years).",
    frequent: "Flooding: frequent (more than 50 times in 100 years).",
    "very frequent": "Flooding: very frequent (floods in most years, often for long periods).",
  }[v];
  return text || `Flooding: ${v}.`;
}

function soilSource(f, p) {
  const any = Object.values(f || {})[0];
  const res = any?.resolution_m || p?.resolution_m;
  return `USDA NRCS SSURGO soil survey${res ? `, about ${res} m` : ""} (map-unit average)`;
}

function powerSource(t) {
  return `NASA POWER daily data, about ${Math.round((t.resolution_m || 50000) / 1000)} km, ${t.period || "1981 onward"}`;
}

function unavailable(what, part) {
  return `${what} is not available right now${part?.reason ? `: ${part.reason}` : "."}`;
}

function when(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

function lower(v) {
  return String(v ?? "").toLowerCase();
}

function round(v, digits = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function inches(v) {
  return round(v, 1);
}
