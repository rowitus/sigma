// Copy test for the landing text (design-merge-weather task 6.4, required).
// Run from frontend/:  node --test tests/
// It reads src/landing/copy.js directly, so nothing needs rendering.
// Feature: design-merge-weather, Properties 14-18.
import assert from "node:assert/strict";
import { test } from "node:test";
import copy, { LINKS, allCopyStrings } from "../src/landing/copy.js";

const strings = allCopyStrings();
const all = strings.map((s) => s.text).join(" \n ");
const groupText = (prefix) => strings.filter((s) => s.path.startsWith(prefix)).map((s) => s.text).join(" ");

test("Property 15: no unsourced digits (only 2030–2049 next to Open-Meteo)", () => {
  const bad = [];
  for (const { path, text } of strings) {
    let t = text;
    if (/Open-Meteo/.test(t)) t = t.replaceAll("2030–2049", "");
    if (/\d/.test(t)) bad.push(`${path}: ${text}`);
  }
  assert.deepEqual(bad, [], `digits without a cited source:\n${bad.join("\n")}`);
});

test("Property 15: no banned words or claims", () => {
  const rules = [
    [/serpapi/i, "mentions SerpApi"],
    [/underserved/i, "uses 'underserved' without a source"],
    [/guarantee/i, "promises a guarantee"],
    [/\breplace/i, "claims to replace local expertise"],
    [/(increase|boost|raise|higher|more)\s+(your\s+)?(yield|income|profit)/i, "promises yield or income"],
    [/\b(most|many|majority|half of|percent)\b[^.]*\bfarm/i, "states a statistic about farmers"],
  ];
  for (const [re, why] of rules) {
    const hits = strings.filter((s) => re.test(s.text)).map((s) => s.path);
    assert.deepEqual(hits, [], `${why}: ${hits.join(", ")}`);
  }
});

test("Requirement 14.4: never claims every address gets the outlook or satellite data", () => {
  const hits = strings.filter((s) => /\b(every|any (us )?address)\b/i.test(s.text) && /satellite|outlook/i.test(s.text));
  assert.deepEqual(hits.map((s) => s.path), []);
});

test("Property 16: covers the required message", () => {
  for (const theme of ["shifting temperatures", "changing rainfall", "water shortages", "extreme weather", "declining soil health"]) {
    assert.match(all, new RegExp(theme, "i"), `missing challenge theme: ${theme}`);
  }
  assert.match(all, /\bfree\b/i);
  assert.match(all, /no account/i);
  assert.match(all, /extension agent/i);
  assert.match(all, /Central Texas/);
  for (const group of ["hero", "depthStory", "howItWorks", "closingCta"]) {
    assert.match(groupText(group), /rural|independent/i, `${group} does not speak to rural or independent farmers`);
  }
  assert.equal(copy.ruralBenefits.heading, "Built for rural farms");
  assert.ok(copy.ruralBenefits.cards.length >= 3 && copy.ruralBenefits.cards.length <= 4);
  assert.equal(copy.depthSteps.length, 5);
  assert.equal(copy.howItWorks.steps.length, 3);
});

test("Property 14: depth story names only the app's own sources", () => {
  const allowed = ["NASA POWER", "USDA SSURGO", "USDA CDL", "Open-Meteo outlook", "MODIS NDVI", "National Weather Service"];
  for (const step of copy.depthSteps) {
    for (const src of step.sources.split(",").map((s) => s.trim())) {
      assert.ok(allowed.includes(src), `step ${step.id} names an unknown source: ${src}`);
    }
  }
});

test("Property 17: sentences stay short (22 words or fewer)", () => {
  const long = [];
  for (const { path, text } of strings) {
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const words = sentence.trim().split(/\s+/).filter(Boolean).length;
      if (words > 22) long.push(`${path} (${words} words): ${sentence}`);
    }
  }
  assert.deepEqual(long, [], long.join("\n"));
});

test("Property 18 (data part): links are https, labelled, and the verified URLs", () => {
  assert.equal(LINKS.extension.href, "https://www.nifa.usda.gov/land-grant-colleges-and-universities-partner-website-directory");
  assert.equal(LINKS.nrcs.href, "https://www.nrcs.usda.gov/");
  assert.equal(LINKS.serviceCenter.href, "https://www.farmers.gov/working-with-us/service-center-locator");
  for (const [name, link] of Object.entries(LINKS)) {
    assert.match(link.href, /^https:\/\//, `${name} is not https`);
    assert.ok(link.label.trim().length > 0, `${name} has no label`);
  }
});
