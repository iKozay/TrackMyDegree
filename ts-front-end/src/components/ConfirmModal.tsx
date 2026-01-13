import "../styles/coopSequencePlanner.css";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="csp-modalOverlay" role="dialog" aria-modal="true">
      <div className="csp-modal">
        <div className="csp-modalHeader">
          <div>
            <div className="csp-modalTitle">{title}</div>
            {description ? <div className="csp-modalSubtitle">{description}</div> : null}
          </div>
          <button className="csp-iconBtn" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="csp-modalFooter">
          <button className="csp-btn" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="csp-btn csp-btnPrimary" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
