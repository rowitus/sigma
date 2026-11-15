import { useId, useState } from "react";

/**
 * Search box: accepts a US street address or "lat, lon".
 * Calls the backend /api/geocode and passes the result to onFound.
 */
export default function LocationSearch({ onFound }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus("Searching…");
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(text)}`);
      const data = await r.json();
      if (!r.ok) {
        setStatus(data.detail || "Could not find that location.");
      } else {
        setStatus("");
        onFound(data);
      }
    } catch {
      setStatus("Backend not reachable. Is it running on port 8010?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="search" role="search">
      <label htmlFor={inputId}>Find a farm</label>
      <input
        id={inputId}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Address or lat, lon"
        autoComplete="street-address"
      />
      <button type="submit" className="btn btn-primary" disabled={busy || text.trim().length < 3}>
        Go
      </button>
      {/* Announced to screen readers when the search result or error changes. */}
      <span className="search-status" aria-live="polite">
        {status}
      </span>
    </form>
  );
}
