import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads rotation options for a location and the farmer's choices from our backend (/api/rotation).
 *
 * inputs = { priorities: [...], irrigation: "yes"|"no", livestock: "yes"|"no"|"unknown",
 *            no_till: "yes"|"no", current: crop id or "" }
 *
 * Returns { status, data, error, refreshing, retry }:
 *   status      "idle" | "loading" (first load for this location) | "loaded" | "error"
 *   data        the backend response (kept on screen while a new answer loads)
 *   refreshing  true while new choices are being applied to an already loaded result
 *   retry()     asks again
 *
 * Changing priorities waits 300 ms before asking, so clicking several toggles in a row
 * sends one request. A newer request cancels the older one, so only the newest answer shows.
 */
export default function useRotation(lat, lon, inputs) {
  const [state, setState] = useState({ status: "idle", data: null, error: null, refreshing: false });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);
  const shownLocation = useRef(null);

  const query = buildQuery(lat, lon, inputs);

  useEffect(() => {
    if (lat == null || lon == null) {
      setState({ status: "idle", data: null, error: null, refreshing: false });
      return undefined;
    }
    const sameLocation = shownLocation.current === `${lat},${lon}`;
    const requestId = ++latest.current;
    const controller = new AbortController();
    const isCurrent = () => requestId === latest.current && !controller.signal.aborted;

    // New location: show the loading state. Same location, new choices: keep the cards and dim them.
    setState((s) =>
      sameLocation && s.data
        ? { ...s, refreshing: true, error: null }
        : { status: "loading", data: null, error: null, refreshing: false }
    );

    const timer = setTimeout(() => {
      fetch(`/api/rotation?${query}`, { signal: controller.signal })
        .then(async (r) => {
          let body = null;
          try {
            body = await r.json();
          } catch {
            // not JSON; handled below
          }
          if (!isCurrent()) return;
          if (!r.ok || !body?.strategies) {
            const message = body?.detail || `The rotation service answered with an error (${r.status}).`;
            setState((s) => failed(s, sameLocation, message));
            return;
          }
          shownLocation.current = `${lat},${lon}`;
          setState({ status: "loaded", data: body, error: null, refreshing: false });
        })
        .catch((err) => {
          if (err?.name === "AbortError" || !isCurrent()) return;
          const message = "Could not reach the rotation service. Check that the backend is running on port 8010.";
          setState((s) => failed(s, sameLocation, message));
        });
    }, sameLocation ? 300 : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // query already includes lat, lon and every input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

/** After a failed request: keep the cards already shown for this location, with the message. */
function failed(s, sameLocation, message) {
  if (sameLocation && s.data) return { ...s, refreshing: false, error: message };
  return { status: "error", data: null, error: message, refreshing: false };
}

function buildQuery(lat, lon, inputs) {
  const p = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (inputs.priorities?.length) p.set("priorities", [...inputs.priorities].sort().join(","));
  p.set("irrigation", inputs.irrigation || "no");
  p.set("livestock", inputs.livestock || "unknown");
  p.set("no_till", inputs.no_till || "no");
  if (inputs.current) p.set("current", inputs.current);
  return p.toString();
}
