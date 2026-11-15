/** First thing a keyboard user reaches: jumps past the landing straight to the map. */
export default function SkipLink({ targetId = "map-section" }) {
  function go(e) {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.focus({ preventScroll: true });
  }
  return (
    <a className="skip-link" href={`#${targetId}`} onClick={go}>
      Skip to the field map
    </a>
  );
}
