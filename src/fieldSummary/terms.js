// Plain-language meaning of the terms the findings use (Req 4.7). Keys match the backend's
// "terms" ids in findings.py. No React here, so the field helper and node tests can use it too.
export const TERMS = {
  hot_day: ["Hot day", "A day whose high temperature is above 35 °C (95 °F). Most crops slow down or get stressed above this."],
  warm_night: ["Warm night", "A night whose low stays above 24 °C (75 °F). Plants and animals cannot cool off and recover."],
  frost_day: ["Frost day", "A day whose low is 0 °C (32 °F) or colder. Frost can kill tender plants."],
  clear_change: ["Clear change", "A trend with less than a 5% chance of being just normal ups and downs between years (Mann–Kendall test, p < 0.05)."],
  climate_projection: ["Climate projection", "What climate models expect for a period of years under one emissions path. It is a range of possible averages, not a forecast for a given year."],
  hydrologic_group: ["Hydrologic soil group", "How fast rain soaks into the soil when it is wet: A is fastest (sandy), D is slowest (heavy clay), so D soils have the most runoff."],
  drainage_class: ["Drainage class", "How quickly water leaves the soil after rain, from excessively drained to very poorly drained. Wetter classes keep roots wet longer."],
  flooding_frequency: ["Flooding frequency", "How often the soil survey expects floods: none, very rare, rare, occasional (about 5 to 50 times in 100 years), frequent or very frequent."],
  k_factor: ["Erodibility (K factor)", "How easily the soil washes away, from about 0.02 (hardly) to 0.69 (very easily). Above about 0.3 is high."],
  organic_matter: ["Organic matter", "The share of the soil made of living and dead plant and animal material. It holds water and nutrients; more is usually better."],
  cover_crop: ["Cover crop", "A crop grown mainly to protect and feed the soil between cash crops, not for sale."],
  variation: ["Year-to-year variation", "How much a value swings from one year to the next, as a percentage of its average (coefficient of variation)."],
  ndvi: ["NDVI (greenness)", "How green the ground looks from space, from about 0.1 (bare soil) to 0.9 (thick growing plants). Below 0.25 counts as bare here."],
  soil_wetness: ["Root-zone soil wetness", "How wet the soil is where roots grow, from 0 (dry) to 1 (saturated), from NASA's model."],
  percentile: ["Percentile", "Where a value ranks among past records for the same week: 10 means only 10 out of 100 past weeks were drier, 90 means 90 out of 100 were drier."],
  grace: ["GRACE", "Twin NASA/German satellites that weigh the water in and under the ground by measuring tiny changes in Earth's gravity. They see a region hundreds of kilometres wide, not one field."],
};
