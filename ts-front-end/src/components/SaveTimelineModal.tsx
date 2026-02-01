import React, { useState } from "react";

interface SaveTimelineModalProps {
  timelineName: string;
  onSave: (timelineName: string) => void;
  onClose: () => void;
}

export const SaveTimelineModal: React.FC<SaveTimelineModalProps> = ({
  timelineName,
  onSave,
  onClose,
}) => {
  const [currentTimelineName, setCurrentTimelineName] = useState(timelineName);

  if (!open) return null;

  const handleSave = () => {
    if (currentTimelineName.trim()) {
      onSave(currentTimelineName.trim());
      setCurrentTimelineName("");
      onClose();
    }
  };

  return (
    <div>
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
  );
};
