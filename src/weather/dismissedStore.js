// Which weather alerts the farmer closed, per place and per day, in browser storage.
// Pure helpers: the storage object is passed in, so tests can use a fake. They never throw:
// if storage is blocked or broken, closing still works for the page, it just is not remembered.

export const STORE_KEY = "fieldshift.alerts.dismissed.v1";

export function todayKey(now = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function placeKey(lat, lon, day) {
  return `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}|${day}`;
}

function read(storage) {
  try {
    const data = JSON.parse(storage?.getItem(STORE_KEY) || "{}");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function write(storage, data, day) {
  try {
    // Keep only today's entries, so the stored list never grows.
    const kept = Object.fromEntries(Object.entries(data).filter(([k]) => k.endsWith(`|${day}`)));
    storage?.setItem(STORE_KEY, JSON.stringify(kept));
  } catch {
    // storage full or blocked: nothing to do
  }
}

export function loadDismissed(storage, lat, lon, day = todayKey()) {
  const list = read(storage)[placeKey(lat, lon, day)];
  return Array.isArray(list) ? list : [];
}

export function addDismissed(storage, lat, lon, id, day = todayKey()) {
  const data = read(storage);
  const key = placeKey(lat, lon, day);
  const list = new Set(Array.isArray(data[key]) ? data[key] : []);
  list.add(id);
  data[key] = [...list];
  write(storage, data, day);
  return data[key];
}

export function clearDismissed(storage, lat, lon, day = todayKey()) {
  const data = read(storage);
  delete data[placeKey(lat, lon, day)];
  write(storage, data, day);
  return [];
}
