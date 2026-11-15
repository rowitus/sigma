import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 10000;

/**
 * The 2030-2049 climate outlook status for a location (/api/outlook), and a way to load it.
 *
 * Returns { status, reason, etaS, load }:
 *   status  "unknown" | "ready" | "not_loaded" | "loading" | "unavailable"
 *   load()  asks the backend to fetch the outlook in the background (about 90 s)
 *
 * While loading it checks every 10 s. When the outlook becomes ready it calls onReady(),
 * so the page can ask for the rotation again with the outlook included.
 */
export default function useOutlook(lat, lon, onReady) {
  const [state, setState] = useState({ status: "unknown", reason: null, etaS: null });
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const key = lat == null || lon == null ? null : `lat=${lat}&lon=${lon}`;

  const check = useCallback(
    async (signal) => {
      if (!key) return null;
      try {
        const r = await fetch(`/api/outlook?${key}`, { signal });
        const body = await r.json();
        if (!r.ok) return { status: "unavailable", reason: body?.detail || "the outlook status could not be read" };
        return { status: body.status, reason: body.reason || null, etaS: body.eta_s ?? null };
      } catch (err) {
        if (err?.name === "AbortError") return null;
        return { status: "unavailable", reason: "the backend could not be reached" };
      }
    },
    [key]
  );

  // First check for this location.
  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();
    setState({ status: "unknown", reason: null, etaS: null });
    check(controller.signal).then((s) => s && setState(s));
    return () => controller.abort();
  }, [key, check]);

  // Poll while loading; tell the page when it is ready.
  useEffect(() => {
    if (state.status !== "loading") return undefined;
    const controller = new AbortController();
    const timer = setInterval(async () => {
      const s = await check(controller.signal);
      if (!s) return;
      setState(s);
      if (s.status === "ready") onReadyRef.current?.();
    }, POLL_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [state.status, check]);

  const load = useCallback(async () => {
    if (!key) return;
    setState((s) => ({ ...s, status: "loading", reason: null }));
    try {
      const r = await fetch(`/api/outlook/load?${key}`, { method: "POST" });
      const body = await r.json();
      setState({ status: body.status, reason: body.reason || body.detail || null, etaS: body.eta_s ?? null });
      if (body.status === "ready") onReadyRef.current?.();
    } catch {
      setState({ status: "unavailable", reason: "the backend could not be reached", etaS: null });
    }
  }, [key]);

  return { ...state, load };
}
