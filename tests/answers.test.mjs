// Checks for the field helper's answers (frontend/src/helper/answers.js).
// Run from frontend/: node --test tests/
// The fixtures are real /api/rotation and /api/weather answers for Webberwood Ranch (2026-11-15).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QUESTIONS, answer, answerTerm, matchQuestion, noMatch } from "../src/helper/answers.js";

const load = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8"));
const rotation = load("rotation_webberwood.json");
const weather = load("weather_webberwood.json");
const ready = { rotation, rotationState: "ready", weather, weatherState: "ready" };

const text = (a) => [...a.paragraphs, ...a.items, ...(a.notes || [])].join(" ");

test("every question gives a non-empty answer for the demo farm", () => {
  for (const q of QUESTIONS) {
    const a = answer(q.id, ready);
    assert.ok(a, q.id);
    assert.equal(a.question, q.label);
    assert.ok(text(a).length > 20, `${q.id} answer is too short`);
    assert.ok(!/undefined|NaN|\[object Object\]/.test(text(a)), `${q.id} has a broken value: ${text(a)}`);
  }
});

test("data answers name their source", () => {
  for (const q of QUESTIONS.filter((x) => x.needs !== "none" && x.id !== "confidence")) {
    const a = answer(q.id, ready);
    assert.ok(a.sources.length > 0, `${q.id} has no source`);
  }
});

test("answers use the real numbers from the data", () => {
  assert.match(text(answer("soil", ready)), /Hydrologic group D/);
  assert.match(text(answer("soil", ready)), /2\.5 %/);
  assert.match(text(answer("flood", ready)), /occasional/);
  assert.match(text(answer("erosion", ready)), /0\.24/);
  assert.match(text(answer("history", ready)), /2018–\d{4}: Grass\/Pasture/);
  assert.match(text(answer("hotter", ready)), /This is a clear change/);
  assert.match(text(answer("outlook", ready)), /2030-2049/);
  assert.match(text(answer("alerts", ready)), /Storms likely/);
  assert.match(text(answer("rain_wind", ready)), /91 %/);
  assert.match(text(answer("excluded", ready)), /Corn/);
});

test("decision answers point to a person", () => {
  for (const id of ["best", "compare", "risks", "excluded", "confidence"]) assert.equal(answer(id, ready).expert, true, id);
  assert.deepEqual(answer("talk", ready).links, ["extension", "nrcs", "serviceCenter"]);
});

test("while data loads, field questions wait and help questions still answer", () => {
  const loading = { rotation: null, rotationState: "loading", weather: null, weatherState: "loading" };
  assert.match(text(answer("soil", loading)), /Still working/);
  assert.match(text(answer("week", loading)), /still loading/);
  assert.ok(answer("talk", loading).links.length === 3);
  const failed = { rotationState: "error", rotationError: "Boom.", weatherState: "error" };
  assert.match(text(answer("best", failed)), /could not load: Boom/);
  assert.match(text(answer("alerts", failed)), /could not be reached/);
});

test("missing parts say so instead of inventing values", () => {
  const empty = {
    ...rotation,
    soil_facts: {}, soil_profile: { status: "unavailable" },
    trends: { status: "unavailable", reason: "NASA POWER did not answer." },
    outlook: { status: "not_loaded" },
    current_rotation: null, exclusions: [], not_suggested: [],
  };
  const ctx = { ...ready, rotation: empty, weather: { forecast: { status: "unavailable", reason: "No grid." }, alerts: { status: "unavailable" } } };
  assert.match(text(answer("soil", ctx)), /did not answer/);
  assert.match(text(answer("flood", ctx)), /did not answer/);
  assert.match(text(answer("hotter", ctx)), /not available right now: NASA POWER did not answer/);
  assert.match(text(answer("outlook", ctx)), /not loaded/);
  assert.match(text(answer("history", ctx)), /did not answer/);
  assert.match(text(answer("excluded", ctx)), /No crop in the table was ruled out/);
  assert.match(text(answer("week", ctx)), /not available right now: No grid/);
});

test("typed words find the right question or term", () => {
  const cases = {
    "will it flood": "flood",
    "is my field too wet": "flood",
    "any frost warning?": "alerts",
    "is it getting hotter": "hotter",
    "what should i plant": "best",
    "why not corn": "excluded",
    "who can I call": "talk",
    "weather this week": "week",
    "future climate 2040": "outlook",
    "is my well running low": "groundwater",
    "groundwater": "groundwater",
  };
  for (const [typed, id] of Object.entries(cases)) assert.deepEqual(matchQuestion(typed), { kind: "question", id }, typed);
  assert.deepEqual(matchQuestion("what is NDVI"), { kind: "term", id: "ndvi" });
  assert.deepEqual(matchQuestion("what does drainage class mean"), { kind: "term", id: "drainage_class" });
  assert.equal(matchQuestion("banana smoothie recipe"), null);
  assert.equal(matchQuestion(""), null);
  assert.match(answerTerm("ndvi").paragraphs[0], /greenness/i);
  assert.ok(noMatch("x").links.includes("extension"));
});

test("groundwater answer uses the GRACE percentiles and flags a dry year", () => {
  const water = {
    status: "ok",
    groundwater: { status: "ok", latest: { date: "2026-08-31", pct: 19.2 }, last_12m_avg: 14.6 },
    root_zone: { status: "ok", latest: { date: "2026-08-31", pct: 9.4 }, last_12m_avg: 30.1 },
  };
  const a = answer("groundwater", { ...ready, rotation: { ...rotation, water } });
  assert.match(text(a), /Groundwater: 19 in the week of 2026-08-31 \(dry\); 15 on average/);
  assert.match(text(a), /Root-zone soil moisture: 9 .*very dry/);
  assert.match(text(a), /low for a year/);
  assert.equal(a.expert, true);
  const missing = answer("groundwater", { ...ready, rotation: { ...rotation, water: { status: "unavailable", reason: "no login" } } });
  assert.match(text(missing), /not available right now: no login/);
});
