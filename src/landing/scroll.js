/**
 * Scroll to a section and move keyboard focus there.
 * Smooth only when the user has not asked to reduce motion; otherwise an instant jump.
 */
export function scrollToId(id, reducedMotion) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}
