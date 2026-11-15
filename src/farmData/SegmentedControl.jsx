import { useRef } from "react";

/**
 * Pill-shaped switch between views, built as an ARIA tab list:
 * - Tab moves into the control (only the selected option is in the Tab order)
 * - Left/Right arrows move to and select the previous/next option, Home/End jump to the ends
 * - Screen readers hear which option is selected
 *
 * options: [{ id, label }], value: selected id, onChange(id), idPrefix: unique prefix for ids.
 * The content area must have id `${idPrefix}-panel`.
 */
export default function SegmentedControl({ label, options, value, onChange, idPrefix }) {
  const buttons = useRef({});

  function onKeyDown(e) {
    const n = options.length;
    const i = options.findIndex((o) => o.id === value);
    let next = null;
    if (e.key === "ArrowRight") next = (i + 1) % n;
    else if (e.key === "ArrowLeft") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    const id = options[next].id;
    onChange(id);
    buttons.current[id]?.focus();
  }

  return (
    <div className="segmented" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <button
            key={o.id}
            ref={(el) => (buttons.current[o.id] = el)}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${o.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
