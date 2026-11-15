// One-time download of the self-hosted fonts and the hero photo (design-merge-weather task 5.1).
// Run by hand from frontend/:  node scripts/fetch-assets.mjs
// The browser never contacts Google Fonts or Unsplash; it loads these copies from /fonts and /images.
//
// Steps (the same can be done by hand):
// 1. Ask https://fonts.googleapis.com/css2 for Fraunces 600/700 and Inter 400/500/600/700 with a modern
//    browser User-Agent, so the answer lists woff2 files.
// 2. For each weight take the "latin" woff2 URL and save it as public/fonts/<family>-<weight>.woff2.
// 3. Download the Unsplash photo photo-1500382017468-9049fed747ef to public/images/hero-field.jpg,
//    first at w=1600&q=70; if it is over HERO_MAX_BYTES, try smaller settings in order.
// Plain Node: built-in fetch and fs only.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, "..", "public");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const FONTS = [
  ["Fraunces", "fraunces", [600, 700]],
  ["Inter", "inter", [400, 500, 600, 700]],
];
const PHOTO = "https://images.unsplash.com/photo-1500382017468-9049fed747ef";
const HERO_MAX_BYTES = 300 * 1024;
const PHOTO_TRIES = ["w=1600&q=70", "w=1400&q=70", "w=1600&q=60", "w=1400&q=60"];

async function get(url, asText = false) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status} for ${url}`);
  return asText ? r.text() : Buffer.from(await r.arrayBuffer());
}

/** The woff2 URL of the latin subset for one weight, from a Google Fonts CSS answer. */
function latinUrl(css, weight) {
  // Blocks look like: /* latin */ @font-face { ... font-weight: 600; ... src: url(...) format('woff2'); ... }
  const blocks = css.split("/* ").slice(1);
  for (const b of blocks) {
    if (!b.startsWith("latin */")) continue;
    if (!new RegExp(`font-weight:\\s*${weight}\\b`).test(b)) continue;
    const m = /url\((https:[^)]+\.woff2)\)/.exec(b);
    if (m) return m[1];
  }
  throw new Error(`no latin woff2 for weight ${weight}`);
}

async function fonts() {
  await mkdir(join(PUBLIC, "fonts"), { recursive: true });
  for (const [family, slug, weights] of FONTS) {
    const css = await get(`https://fonts.googleapis.com/css2?family=${family}:wght@${weights.join(";")}&display=swap`, true);
    for (const w of weights) {
      const file = join(PUBLIC, "fonts", `${slug}-${w}.woff2`);
      const bytes = await get(latinUrl(css, w));
      await writeFile(file, bytes);
      console.log(`saved ${slug}-${w}.woff2 (${Math.round(bytes.length / 1024)} KB)`);
    }
  }
}

async function photo() {
  await mkdir(join(PUBLIC, "images"), { recursive: true });
  let smallest = null;
  for (const params of PHOTO_TRIES) {
    const bytes = await get(`${PHOTO}?${params}&fm=jpg&fit=crop`);
    if (!smallest || bytes.length < smallest.bytes.length) smallest = { params, bytes };
    if (bytes.length <= HERO_MAX_BYTES) {
      smallest = { params, bytes };
      break;
    }
  }
  await writeFile(join(PUBLIC, "images", "hero-field.jpg"), smallest.bytes);
  const kb = Math.round(smallest.bytes.length / 1024);
  console.log(`saved hero-field.jpg: ${kb} KB with ${smallest.params}`);
  if (smallest.bytes.length > HERO_MAX_BYTES) console.warn(`WARNING: over ${HERO_MAX_BYTES / 1024} KB even at the smallest setting`);
}

await fonts();
await photo();
