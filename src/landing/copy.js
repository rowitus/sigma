// All landing text in one place, so tests/copy.test.mjs can check it without rendering the page.
//
// Rules for this text (design-merge-weather Requirement 14 and the project's honest-data rule):
// - plain words, sentences of at most 22 words, every technical term explained;
// - no numbers, except the outlook period 2030–2049 written next to "Open-Meteo";
// - no statistics about farmers, no promise of yield or income, no claim to replace local experts;
// - only claim what the app really does: the outlook loads on request, and satellite greenness
//   is shown for the demo farm only; the crop list is written for Central Texas.

// Help links, checked in a real browser on 2026-11-15. Every external link uses one of these.
export const LINKS = {
  extension: {
    href: "https://www.nifa.usda.gov/land-grant-colleges-and-universities-partner-website-directory",
    label: "Find your state extension service (USDA NIFA directory)",
  },
  nrcs: {
    href: "https://www.nrcs.usda.gov/",
    label: "Natural Resources Conservation Service (NRCS)",
  },
  serviceCenter: {
    href: "https://www.farmers.gov/working-with-us/service-center-locator",
    label: "Find a USDA Service Center near you",
  },
};

export const hero = {
  kicker: "Free field data for rural farms",
  title: "Farmer Helper",
  lede:
    "For rural and independent farmers who may not have a crop advisor nearby. " +
    "Type one address and see your soil, your changing weather, and rotation ideas to talk over with your extension agent.",
  exploreLabel: "Go below the grass ↓",
  deskLabel: "Open the field desk ↗",
};

export const depthStory = {
  eyebrow: "Below the grass line",
  title: "What your field is telling you",
  lede:
    "Scroll down through the ground under one field. Each layer shows the free public data the app reads for a rural or independent farm.",
};

export const depthSteps = [
  {
    id: "grass",
    band: "Grass line",
    title: "Start with what grows on top",
    text:
      "USDA CDL, a crop map made from satellite pictures, shows what grew on your spot in recent years. " +
      "MODIS NDVI shows how green the demo farm looks from space.",
    sources: "USDA CDL, MODIS NDVI, National Weather Service",
    note: "The National Weather Service adds this week's forecast and farm alerts.",
  },
  {
    id: "topsoil",
    band: "Topsoil",
    title: "Read the soil your roots use",
    text:
      "USDA SSURGO, the national soil survey, describes the top layer: its texture, its organic matter, and how much water it holds.",
    sources: "USDA SSURGO",
    note: "Organic matter is the dark, crumbly part of soil that feeds plants and holds water.",
  },
  {
    id: "subsoil",
    band: "Subsoil",
    title: "See how water moves down",
    text:
      "The deeper layers decide how fast rain soaks in, and whether the field stays wet or floods after heavy storms.",
    sources: "USDA SSURGO",
    note: "Slow soaking soil sheds rain as runoff, so living cover matters more there.",
  },
  {
    id: "parent",
    band: "Parent material",
    title: "Know how deep the soil goes",
    text:
      "The soil survey lists each layer down to the bottom of the profile. The app draws them as a block you can turn.",
    sources: "USDA SSURGO",
    note: "Soil survey values are averages for a mapped area, not a test of your own field.",
  },
  {
    id: "bedrock",
    band: "Bedrock",
    title: "Plan for the weather that is arriving",
    text:
      "NASA POWER shows how heat, frost and rain have changed on your ground since the early eighties. " +
      "The Open-Meteo outlook for 2030–2049 can be loaded on request.",
    sources: "NASA POWER, Open-Meteo outlook",
    note: "Trends describe the past. They are not a forecast of any single year.",
  },
];

export const howItWorks = {
  eyebrow: "How it works",
  title: "From one address to a field plan",
  intro:
    "Rural and independent farms face shifting temperatures, changing rainfall, water shortages, extreme weather and declining soil health. " +
    "Field Shift helps you see what that looks like on your own ground.",
  steps: [
    {
      title: "Enter your address",
      text: "Type an address, click the map, or enter latitude and longitude. There is no account and no sign-up.",
    },
    {
      title: "See the facts for your field",
      text: "Any US address gets soil, crop history, climate history and trends, and this week's weather and alerts.",
    },
    {
      title: "Compare rotation options",
      text:
        "See rotation options scored for water, soil health, forage and income. Every score shows its reasons, so you can check them.",
    },
  ],
};

export const ruralBenefits = {
  eyebrow: "Why it helps",
  heading: "Built for rural farms",
  cards: [
    {
      title: "Free, no account",
      text: "The app costs nothing. You do not sign up, pay, or enter a key.",
    },
    {
      title: "One address, a clear field picture",
      text:
        "One US address brings together soil, crop history, and climate history and trends. " +
        "The crop list is written for Central Texas, so elsewhere the options are rough ideas.",
    },
    {
      title: "Alerts that say what to do",
      text:
        "Each farm alert names an action for frost, heat, storms, or wind too strong to spray. Each alert shows its source.",
    },
    {
      title: "Bring it to your extension agent",
      text:
        "Use what you see as a starting point for a talk with your county extension agent. They know your land and your area.",
    },
  ],
};

export const closingCta = {
  heading: "Your field is next",
  text:
    "Rural and independent farmers can start with one address. See what your field is telling you, " +
    "then take it to your extension agent or your NRCS office.",
  buttonLabel: "Open the field desk ↗",
  helpLead: "Need a person to talk to?",
};

export const dataLimitations = {
  helpLead: "For advice on your own land, talk to your local experts:",
};

const copy = { LINKS, hero, depthStory, depthSteps, howItWorks, ruralBenefits, closingCta, dataLimitations };
export default copy;

/** Every string above, with where it lives, so the copy test can read all of it. */
export function allCopyStrings() {
  const out = [];
  const walk = (value, path) => {
    if (typeof value === "string") {
      if (!path.endsWith(".href")) out.push({ path, text: value });
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(copy, "");
  return out;
}
