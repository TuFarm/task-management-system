import React from "react";
import "./ui.css";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible confirmation dialog used before destructive actions. */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="ui-modal-overlay" onClick={onCancel}>
      <div className="ui-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="ui-modal-title">{title}</h3>
        <p className="ui-modal-message">{message}</p>
        <div className="ui-modal-actions">
          <button className="ui-btn ui-btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`ui-btn ${danger ? "ui-btn-danger" : "ui-btn-primary"}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
