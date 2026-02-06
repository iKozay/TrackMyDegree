import React, {useState} from "react";

interface SaveTimelineModalProps {
  open: boolean;
  timelineName: string;
  onSave: (timelineName: string) => void;
  onClose: () => void;
}

export const SaveTimelineModal: React.FC<SaveTimelineModalProps> = ({
  open,
  timelineName,
  onSave,
  onClose,
}) => {
    // Initializes once per mount (modal opens)
    const [currentTimelineName, setCurrentTimelineName] = useState<string>(() =>
        timelineName?.trim() || `timeline-${Date.now()}`
    );

  if (!open) return null;

  const handleSave = () => {
    if (currentTimelineName.trim()) {
      onSave(currentTimelineName.trim());
      setCurrentTimelineName("");
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={handleBackdropClick}>
      <div
        className="modal-content"
        role="presentation"
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 8,
          minWidth: 320,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: 16 }}>Name Your Timeline</h2>
        <input
          type="text"
          placeholder="Timeline name"
          value={currentTimelineName}
          onChange={(e) => setCurrentTimelineName(e.target.value)}
          style={{
            width: "100%",
            padding: 8,
            marginBottom: 16,
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              background: "#eee",
            }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              background: "#007bff",
              color: "#fff",
            }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
