import { useEffect, useId, useRef, useState } from "react";
import Markdown from "./Markdown.jsx";
import { farmBrief } from "./farmBrief.js";

/**
 * "Ask about this field": a floating button that opens a chat panel.
 * Questions go to the backend's /api/chat, which answers with SerpApi (Google AI Mode, plus
 * Google Maps for "near me" questions), using a short description of this field from the page.
 * Suggested questions are one tap, so nobody has to know what to type.
 *
 * Props:
 *   place          { lat, lon, label } or null (the button only shows once a spot is chosen)
 *   rotation       the /api/rotation answer for this place, or null while it loads
 *   weather        the useWeather() result ({ status, data })
 */

// One tap each. Written the way a farmer would ask, not the way a scientist would.
export const SUGGESTIONS = [
  { group: "Planting", items: [
    "What can I plant here this month?",
    "When is the last spring frost here?",
    "What cover crop would help my soil?",
  ] },
  { group: "Soil and water", items: [
    "How do I get my soil tested?",
    "How do I stop my soil from washing away?",
    "How can I save water in a dry spell?",
  ] },
  { group: "Weather", items: [
    "Is this week good for planting?",
    "How do I protect my crops from frost?",
  ] },
  { group: "Help near me", items: [
    "Where is the extension office near me?",
    "Where can I buy seed near me?",
    "Are there USDA programs that can help my farm?",
  ] },
];
const ALL = SUGGESTIONS.flatMap((g) => g.items);
const MAX_CHARS = 500;

export default function FieldHelper({ place, rotation, weather }) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState([]); // [{ key, role: "user"|"assistant"|"error", text, sources }]
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [ready, setReady] = useState(null); // null = checking, true/false = SerpApi key set or not
  const buttonRef = useRef(null);
  const headingRef = useRef(null);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const counter = useRef(0);
  const request = useRef(null);
  const id = useId().replace(/:/g, "");

  // Voice (ElevenLabs): one answer plays at a time; the microphone records one question at a time.
  const [speaking, setSpeaking] = useState(null); // { key, status: "loading" | "playing" } or null
  const [mic, setMic] = useState("idle"); // "idle" | "asking" (permission) | "recording" | "transcribing"
  const [seconds, setSeconds] = useState(0);
  const audioRef = useRef(null);
  const audioUrls = useRef({}); // answer key -> object URL, so replays are instant and free
  const recorder = useRef(null);
  const micTimer = useRef(null);

  function stopAudio() {
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeaking(null);
  }

  function stopRecording(send = true) {
    clearInterval(micTimer.current);
    const r = recorder.current;
    if (!r) return;
    r.sendWhenStopped = send;
    if (r.state !== "inactive") r.stop();
  }

  // A new spot starts a fresh conversation, so old answers never sit under a new place name.
  useEffect(() => {
    request.current?.abort();
    stopAudio();
    stopRecording(false);
    setLog([]);
    setBusy(false);
    setShowAll(false);
  }, [place?.lat, place?.lon]);

  // Closing the panel or leaving the page stops any voice.
  useEffect(() => {
    if (open) return undefined;
    stopAudio();
    stopRecording(false);
    setMic("idle");
    return undefined;
  }, [open]);
  useEffect(() => () => {
    stopAudio();
    stopRecording(false);
    Object.values(audioUrls.current).forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // When the panel opens, check whether the chat has its SerpApi key yet.
  useEffect(() => {
    if (!open) return;
    fetch("/api/chat/status").then((r) => r.json()).then((d) => setReady(!!d.ready)).catch(() => setReady(null));
  }, [open]);

  // Opening moves focus into the panel; Escape closes it and returns focus to the button.
  useEffect(() => {
    if (!open) return undefined;
    headingRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = bodyRef.current?.querySelector(`[data-key="${log[log.length - 1]?.key}"]`);
    el?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, [log, busy]);

  if (!place) return null;

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function add(entry) {
    counter.current += 1;
    setLog((l) => [...l, { key: `m${counter.current}`, sources: [], ...entry }]);
  }

  async function ask(question) {
    const message = question.replace(/\s+/g, " ").trim();
    if (!message || busy) return;
    setTyped("");
    setShowAll(false);
    const history = log.filter((m) => m.role !== "error").slice(-4).map((m) => ({ role: m.role, content: m.text }));
    add({ role: "user", text: message });
    setBusy(true);
    const ctrl = new AbortController();
    request.current = ctrl;
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          message,
          history,
          place: { lat: place.lat, lon: place.lon, label: place.label },
          brief: farmBrief({ place, rotation, weather: weather?.status === "loaded" ? weather.data : null }),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 503) setReady(false);
        throw new Error(data.detail || "Something went wrong. Please try again.");
      }
      setReady(true);
      add({ role: "assistant", text: data.reply, sources: data.sources || [] });
    } catch (e) {
      if (e.name === "AbortError") return;
      add({ role: "error", text: e.message === "Failed to fetch" ? "Can't reach the app's server. Check that it is running, then try again." : e.message });
    } finally {
      if (request.current === ctrl) {
        setBusy(false);
        request.current = null;
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  }

  function submit(e) {
    e.preventDefault();
    ask(typed);
  }

  // ---- 🔊 Listen: read one answer aloud --------------------------------------------------------
  async function listen(m) {
    if (speaking?.key === m.key) return stopAudio(); // second tap stops it
    stopAudio();
    setSpeaking({ key: m.key, status: "loading" });
    try {
      let url = audioUrls.current[m.key];
      if (!url) {
        const r = await fetch("/api/speech/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: m.text }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.detail || "Couldn't read this answer aloud. Please try again.");
        }
        url = URL.createObjectURL(await r.blob());
        audioUrls.current[m.key] = url;
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { if (audioRef.current === audio) stopAudio(); };
      await audio.play();
      if (audioRef.current === audio) setSpeaking({ key: m.key, status: "playing" });
    } catch (e) {
      setSpeaking(null);
      if (e.name !== "AbortError") add({ role: "error", text: e.message === "Failed to fetch" ? "Can't reach the app's server. Check that it is running, then try again." : e.message });
    }
  }

  // ---- 🎤 Microphone: tap to talk, tap again to send ---------------------------------------------
  async function toggleMic() {
    if (mic === "recording") return stopRecording(true);
    if (mic !== "idle" || busy) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      add({ role: "error", text: "This browser can't record from a microphone. Try Chrome, Edge or Safari, or type your question." });
      return;
    }
    let stream;
    setMic("asking"); // the browser may show a permission pop-up first
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setMic("idle");
      add({ role: "error", text: e.name === "NotAllowedError"
        ? "The microphone is blocked. Allow microphone access for this site in your browser, then tap 🎤 again."
        : "No microphone was found. Plug one in, or type your question." });
      return;
    }
    stopAudio();
    const type = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
    const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    r.sendWhenStopped = true;
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (recorder.current === r) recorder.current = null;
      if (!r.sendWhenStopped || !chunks.length) return setMic("idle");
      setMic("transcribing");
      try {
        const blob = new Blob(chunks, { type: (r.mimeType || type || "audio/webm").split(";")[0] });
        const res = await fetch("/api/speech/transcribe", { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.detail || "Couldn't understand the recording. Please try again.");
        setMic("idle");
        ask(d.text);
      } catch (e) {
        setMic("idle");
        add({ role: "error", text: e.message === "Failed to fetch" ? "Can't reach the app's server. Check that it is running, then try again." : e.message });
      }
    };
    recorder.current = r;
    r.start();
    setSeconds(0);
    setMic("recording");
    const started = Date.now();
    micTimer.current = setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000);
      setSeconds(s);
      if (s >= 45) stopRecording(true); // keep questions short (and cheap)
    }, 250);
  }

  const asked = new Set(log.filter((m) => m.role === "user").map((m) => m.text));
  const next = ALL.filter((q) => !asked.has(q)).slice(0, 3);
  const started = log.length > 0;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`helper-fab${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span aria-hidden="true">💬</span> {open ? "Close chat" : "Ask about this field"}
      </button>

      {open && (
        <section id={`${id}-panel`} className="helper-panel chat-panel" role="dialog" aria-modal="false" aria-labelledby={`${id}-title`}>
          <header className="helper-head">
            <div>
              <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="helper-title">Ask about this field</h2>
              <p className="helper-sub">{place.label} · answers from a Google search for this spot</p>
            </div>
            <button type="button" className="helper-close" onClick={close} aria-label="Close chat">✕</button>
          </header>

          <div className="helper-body" ref={bodyRef}>
            {ready === false && (
              <p className="chat-setup" role="status">
                The chat isn't switched on yet. It needs a SerpApi key in the app's <code>.env</code> file.
              </p>
            )}

            {!started && (
              <div className="chat-welcome">
                <p className="chat-hello">Hi! Ask me anything about farming this spot.</p>
                <p className="helper-hint">Tap a question below to start, or type your own in plain words. There are no wrong questions.</p>
              </div>
            )}

            <div role="log" aria-live="polite" aria-relevant="additions" className="helper-log">
              {log.map((m) => (
                <article key={m.key} data-key={m.key} className="helper-turn">
                  {m.role === "user" && <p className="helper-q">{m.text}</p>}
                  {m.role === "error" && <p className="helper-a chat-error" role="alert">{m.text}</p>}
                  {m.role === "assistant" && (
                    <div className="helper-a chat-answer">
                      <button
                        type="button"
                        className={`chat-listen${speaking?.key === m.key ? " is-on" : ""}`}
                        onClick={() => listen(m)}
                        aria-pressed={speaking?.key === m.key}
                      >
                        <span aria-hidden="true">{speaking?.key === m.key && speaking.status === "playing" ? "⏹" : "🔊"}</span>
                        {speaking?.key !== m.key ? "Listen" : speaking.status === "loading" ? "Getting voice ready…" : "Stop"}
                      </button>
                      <Markdown text={m.text} />
                      {m.sources.length > 0 && (
                        <details className="chat-sources">
                          <summary>Where this came from ({m.sources.length})</summary>
                          <ol>
                            {m.sources.map((s) => (
                              <li key={s.url}>
                                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
                                {s.source && <span className="chat-source-site"> · {s.source}</span>}
                              </li>
                            ))}
                          </ol>
                        </details>
                      )}
                      <p className="helper-note chat-disclaimer">Check with your local extension office before big decisions.</p>
                    </div>
                  )}
                </article>
              ))}
              {busy && (
                <p className="helper-a chat-typing" role="status">
                  <span className="chat-dots" aria-hidden="true"><span /><span /><span /></span>
                  Looking that up for your field… this can take up to 30 seconds.
                </p>
              )}
            </div>

            {(!started || showAll) ? (
              <div className="helper-questions">
                {SUGGESTIONS.map((g) => (
                  <div key={g.group} className="helper-group" role="group" aria-label={g.group}>
                    <p className="helper-group-title">{g.group}</p>
                    <div className="helper-chips">
                      {g.items.map((q) => (
                        <button key={q} type="button" className="helper-chip" disabled={busy} onClick={() => ask(q)}>{q}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : !busy && (
              <div className="helper-questions">
                <p className="helper-group-title">You could also ask</p>
                <div className="helper-chips">
                  {next.map((q) => (
                    <button key={q} type="button" className="helper-chip" onClick={() => ask(q)}>{q}</button>
                  ))}
                  <button type="button" className="helper-link-btn chat-more" onClick={() => setShowAll(true)}>See all questions</button>
                </div>
              </div>
            )}
          </div>

          <form className="helper-form" onSubmit={submit}>
            <label htmlFor={`${id}-input`} className="visually-hidden">Type your question</label>
            <input
              ref={inputRef}
              id={`${id}-input`}
              type="text"
              value={mic === "recording" ? "" : typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={mic === "recording" ? `Listening… ${seconds}s · tap ⏹ when you're done`
                : mic === "transcribing" ? "Writing down what you said…"
                : mic === "asking" ? "Tap \"Allow\" on the microphone pop-up…" : "Type or tap 🎤 to talk…"}
              autoComplete="off"
              maxLength={MAX_CHARS}
              disabled={busy || mic !== "idle"}
            />
            <button
              type="button"
              className={`chat-mic${mic === "recording" ? " is-recording" : ""}`}
              onClick={toggleMic}
              disabled={busy || mic === "transcribing" || mic === "asking"}
              aria-label={mic === "recording" ? "Stop recording and send" : "Talk: ask your question out loud"}
              title={mic === "recording" ? "Stop and send" : "Tap and talk"}
            >
              <span aria-hidden="true">{mic === "recording" ? "⏹" : mic === "transcribing" ? "…" : "🎤"}</span>
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || mic !== "idle" || !typed.trim()}>
              {busy ? "Wait…" : "Ask"}
            </button>
          </form>
        </section>
      )}
    </>
  );
}
