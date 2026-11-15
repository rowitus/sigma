// Turn the National Weather Service 12-hour periods into at most 7 day cards. Pure, no React.
//
// Each period: { name, start, is_day, temp_f, rain_pct, wind, wind_max_mph, short, detail }.
// A card shows the day's high (day period) and low (night period). Every number comes from a
// period: nothing is invented. A missing high or low stays null and the card shows "–".

export function groupDays(periods = []) {
  const days = new Map();
  for (const p of periods) {
    const date = String(p.start || "").slice(0, 10); // the NWS start time carries the local date
    if (!date) continue;
    if (!days.has(date)) days.set(date, { date, day: null, night: null });
    const d = days.get(date);
    if (p.is_day) d.day = d.day || p;
    else d.night = d.night || p;
  }
  return [...days.values()].slice(0, 7).map(({ date, day, night }) => {
    const both = [day, night].filter(Boolean);
    const windiest = both.reduce((a, b) => ((b.wind_max_mph || 0) > (a.wind_max_mph || 0) ? b : a));
    return {
      date,
      name: (day || night).name,
      high: day ? day.temp_f : null,
      low: night ? night.temp_f : null,
      rain_pct: Math.max(...both.map((p) => p.rain_pct || 0)),
      wind: windiest.wind,
      short: (day || night).short,
    };
  });
}
