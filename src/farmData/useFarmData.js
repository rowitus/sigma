import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads climate, soil and crop history for a location from our backend (/api/farm-data).
 * The frontend never calls NASA or USDA directly.
 *
 * Returns { status, data, error, retry }:
 *   status  "idle" (no location) | "loading" | "loaded" | "error" (request itself failed)
 *   data    the backend response: { location, sources: { nasa_power, ssurgo, cdl } }
 *   error   a plain message when status is "error"
 *   retry() asks again for the current location
 *
 * When the location changes while a request is still running, the old request is
 * cancelled and its answer ignored, so the panel only ever shows the newest location.
 */
export default function useFarmData(lat, lon) {
  const [state, setState] = useState({ status: "idle", data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const latestRequest = useRef(0);

  useEffect(() => {
    if (lat == null || lon == null) {
      setState({ status: "idle", data: null, error: null });
      return undefined;
    }

    const requestId = ++latestRequest.current;
    const controller = new AbortController();
    const isCurrent = () => requestId === latestRequest.current && !controller.signal.aborted;

    setState({ status: "loading", data: null, error: null });

    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    fetch(`/api/farm-data?${params}`, { signal: controller.signal })
      .then(async (r) => {
        let body = null;
        try {
          body = await r.json();
        } catch {
          // non-JSON body; handled below
        }
        if (!isCurrent()) return;
        if (!r.ok || !body?.sources) {
          const message = body?.detail || `The farm data service answered with an error (${r.status}).`;
          setState({ status: "error", data: null, error: message });
          return;
        }
        setState({ status: "loaded", data: body, error: null });
      })
      .catch((err) => {
        if (err?.name === "AbortError" || !isCurrent()) return;
        setState({
          status: "error",
          data: null,
          error: "Could not reach the farm data service. Check that the backend is running on port 8010.",
        });
      });

    return () => controller.abort();
  }, [lat, lon, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
