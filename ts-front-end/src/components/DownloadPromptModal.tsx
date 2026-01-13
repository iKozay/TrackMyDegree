import "../styles/coopSequencePlanner.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onDownloadAnyway: () => void;
  onValidateFirst: () => void;
};

export function DownloadPromptModal({ open, onClose, onDownloadAnyway, onValidateFirst }: Props) {
  if (!open) return null;

  return (
    <div className="csp-modalOverlay" role="dialog" aria-modal="true">
      <div className="csp-modal">
        <div className="csp-modalHeader">
          <div>
            <div className="csp-modalTitle">Sequence Not Validated</div>
            <div className="csp-modalSubtitle">
              Your sequence has not been validated yet. Would you like to validate it before downloading?
            </div>
          </div>
          <button className="csp-iconBtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="csp-modalFooter">
          <button className="csp-btn" onClick={onDownloadAnyway}>
            Download Anyway
          </button>
          <button className="csp-btn csp-btnPrimary" onClick={onValidateFirst}>
            Validate First
          </button>
        </div>
      </div>
    </div>
  );
}
