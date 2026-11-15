import { useEffect, useId, useRef, useState } from "react";
import { TERMS } from "./terms.js";

// The term table lives in terms.js (no React there); re-exported so existing imports keep working.
export { TERMS };

/**
 * A small "?" button next to a term. Pressing it (mouse, touch, Enter or Space) shows a short
 * explanation; Escape or clicking elsewhere closes it, and focus returns to the button.
 */
export default function TermInfo({ term }) {
  const entry = TERMS[term];
  const [open, setOpen] = useState(false);
  const id = useId().replace(/:/g, "");
  const wrap = useRef(null);
  const button = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e) => {
      if (!wrap.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onClick);
    };
  }, [open]);

  if (!entry) return null;
  const [name, text] = entry;
  return (
    <span className="term" ref={wrap}>
      <button
        ref={button}
        type="button"
        className="term-btn"
        aria-expanded={open}
        aria-controls={`${id}-tip`}
        onClick={() => setOpen((o) => !o)}
      >
        {name}
        <span className="term-q" aria-hidden="true">?</span>
      </button>
      {open && (
        <span id={`${id}-tip`} className="term-tip" role="note">
          {text}
        </span>
      )}
    </span>
  );
}
