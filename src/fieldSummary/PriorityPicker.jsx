import { useId } from "react";
import { PRIORITIES } from "./labels.js";

/**
 * What matters to the farmer (toggle buttons) and the farm's constraints (radio groups).
 * Priorities make the linked scores count double in the ranking. Constraints change the rules:
 * irrigation lifts the rain limit, "no livestock" removes the grazing options.
 *
 * inputs / onChange(next): { priorities, irrigation, livestock, no_till, current }
 * crops: the crop lookup from the API, for the "what do you grow now" picker
 * currentUnknown: true when the crop map could not tell what grows here
 */
export default function PriorityPicker({ inputs, onChange, crops, currentUnknown }) {
  const id = useId().replace(/:/g, "");
  const set = (patch) => onChange({ ...inputs, ...patch });
  const toggle = (pid) => {
    const has = inputs.priorities.includes(pid);
    set({ priorities: has ? inputs.priorities.filter((p) => p !== pid) : [...inputs.priorities, pid] });
  };
  const cropList = Object.entries(crops || {}).sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <section className="summary-card picker" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="card-title">What matters to you</h3>
      <p className="small-print">Pick any. The scores you pick count double when the options are ranked.</p>
      <div className="toggle-row" role="group" aria-label="Your priorities">
        {PRIORITIES.map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn toggle"
            aria-pressed={inputs.priorities.includes(p.id)}
            onClick={() => toggle(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="constraints">
        <Radio name={`${id}-irr`} legend="Can you irrigate?" value={inputs.irrigation}
          options={[["no", "No"], ["yes", "Yes"]]} onChange={(v) => set({ irrigation: v })} />
        <Radio name={`${id}-live`} legend="Do you keep livestock?" value={inputs.livestock}
          options={[["unknown", "Not sure"], ["yes", "Yes"], ["no", "No"]]} onChange={(v) => set({ livestock: v })} />
        <Radio name={`${id}-till`} legend="Only suggest crops that can be planted without tilling?" value={inputs.no_till}
          options={[["no", "No"], ["yes", "Yes"]]} onChange={(v) => set({ no_till: v })} />
        <div className="field">
          <label htmlFor={`${id}-cur`} className="legend">
            What do you grow now?{currentUnknown && <span className="needs-input"> (the crop map could not tell)</span>}
          </label>
          <select id={`${id}-cur`} className="select" value={inputs.current} onChange={(e) => set({ current: e.target.value })}>
            <option value="">Use the USDA crop map</option>
            {cropList.map(([cid, c]) => (
              <option key={cid} value={cid}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

function Radio({ name, legend, value, options, onChange }) {
  return (
    <fieldset className="field">
      <legend className="legend">{legend}</legend>
      <div className="radio-row">
        {options.map(([v, label]) => (
          <label key={v} className="radio">
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
