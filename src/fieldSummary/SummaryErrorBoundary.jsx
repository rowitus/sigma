import { Component } from "react";

/**
 * If something in the field summary fails to draw, show a plain message there instead of
 * blanking the whole page, so the map and the farm data panel keep working.
 */
export default class SummaryErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev) {
    // A new location gets a fresh try.
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="summary">
        <div className="summary-inner">
          <p className="note error-note" role="alert">
            The field summary could not be shown for this location. The map and farm data above still work.{" "}
            <button type="button" className="btn btn-small" onClick={() => this.setState({ failed: false })}>
              Try again
            </button>
          </p>
        </div>
      </section>
    );
  }
}
