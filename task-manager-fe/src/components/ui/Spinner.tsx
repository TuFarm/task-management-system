import React from "react";
import "./ui.css";

/** Pure-CSS loading spinner (no external library). */
const Spinner: React.FC<{ label?: string; size?: number }> = ({ label, size = 36 }) => (
  <div className="ui-spinner-wrap">
    <div
      className="ui-spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label={label || "Loading"}
    />
    {label && <div className="ui-spinner-label">{label}</div>}
  </div>
);

export default Spinner;
