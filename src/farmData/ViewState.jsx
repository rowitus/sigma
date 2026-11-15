/**
 * What a view shows when it has no facts to display.
 *   kind="loading"  placeholder blocks while the request runs
 *   kind="empty"    the source answered but has nothing for this spot
 *   kind="error"    the source (or the whole request) failed; shows the reason and a retry button
 *   kind="idle"     no location chosen yet
 */
export default function ViewState({ kind, message, onRetry }) {
  if (kind === "loading") {
    return (
      <div className="view-state" aria-busy="true">
        <p className="view-state-text">{message || "Loading…"}</p>
        <div className="skeleton" style={{ width: "70%" }} />
        <div className="skeleton tall" />
        <div className="skeleton" style={{ width: "50%" }} />
      </div>
    );
  }
  if (kind === "error") {
    return (
      <div className="view-state view-state-error">
        <p>{message}</p>
        {onRetry && (
          <button type="button" className="btn btn-primary btn-small" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="view-state">
      <p className="view-state-text">{message}</p>
    </div>
  );
}
