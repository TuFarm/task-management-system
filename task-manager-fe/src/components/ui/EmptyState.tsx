import React from "react";
import "./ui.css";

const EmptyState: React.FC<{ title?: string; message?: string; icon?: string }> = ({
  title = "Nothing here",
  message = "No data found.",
  icon = "📭",
}) => (
  <div className="ui-empty">
    <div className="ui-empty-icon">{icon}</div>
    <div className="ui-empty-title">{title}</div>
    <div className="ui-empty-message">{message}</div>
  </div>
);

export default EmptyState;
