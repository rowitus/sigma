import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads the National Weather Service forecast and alerts for a location from our backend
 * (/api/weather). The frontend never calls weather.gov itself.
 *
 * Returns { status, data, error, retry }: status is "idle", "loading", "loaded" or "error".
 * "error" means our own backend could not be reached or rejected the input; a weather.gov
 * problem still comes back as "loaded" with the failing part marked unavailable.
 * A newer location cancels the older request, so only the newest answer shows.
 */
export default function useWeather(lat, lon) {
  const [state, setState] = useState({ status: "idle", data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (lat == null || lon == null) {
      setState({ status: "idle", data: null, error: null });
      return undefined;
    }
    const id = ++latest.current;
    const controller = new AbortController();
    const current = () => id === latest.current && !controller.signal.aborted;
    setState({ status: "loading", data: null, error: null });

    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    fetch(`/api/weather?${params}`, { signal: controller.signal })
      .then(async (r) => {
        let body = null;
        try {
          body = await r.json();
        } catch {
          // not JSON; handled below
        }
        if (!current()) return;
        if (!r.ok || !body?.forecast) {
          setState({ status: "error", data: null, error: body?.detail || "Could not reach the weather service." });
          return;
        }
        setState({ status: "loaded", data: body, error: null });
      })
      .catch((err) => {
        if (err?.name === "AbortError" || !current()) return;
        setState({ status: "error", data: null, error: "Could not reach the weather service." });
      });
    return () => controller.abort();
  }, [lat, lon, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
