import React, { useState } from "react";

import {
  Undo2,
  Redo2,
  Share2,
  Download,
  BarChart3,
  AlertTriangle,
  Plus,
  Save,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { downloadTimelinePdf } from "../utils/timelineUtils";

interface HistoryControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

function shareTimeline(
  setShow: React.Dispatch<React.SetStateAction<boolean>>
): void {
  // copy current url in browser to clipboard
  navigator.clipboard
    .writeText(globalThis.location.href)
    .then(() => {
      console.log("Timeline URL copied to clipboard");
    })
    .catch((err) => {
      console.error("Failed to copy timeline URL: ", err);
    });
  setShow(true);
  setTimeout(() => setShow(false), 2000);
}

function downloadTimeline(): void {
  downloadTimelinePdf().catch((err) => {
    console.error("Failed to load PDF libraries:", err);
  });
}

const HistoryControls: React.FC<HistoryControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const [show, setShow] = useState(false);

  return (
    <div className="share-download-group">
      <button
        className="btn btn-tertiary"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo last change">
        <Undo2 size={16} />
      </button>

      <button
        className="btn btn-tertiary"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo">
        <Redo2 size={16} />
      </button>

      <button
        className="btn btn-secondary"
        onClick={() => shareTimeline(setShow)}>
        <Share2 size={16} />
        {show ? "Copied" : "Share"}
      </button>

      <button className="btn btn-secondary" onClick={downloadTimeline}>
        <Download size={16} />
        Download
      </button>
    </div>
  );
};

interface CreditsSummaryProps {
  earned: number;
  total: number;
}

const CreditsSummary: React.FC<CreditsSummaryProps> = ({ earned, total }) => (
  <h2 className="credits-header">
    Total Credits Earned: {earned} / {total}
  </h2>
);

interface PrimaryActionsProps {
  onOpenModal?: (open: boolean, type: string) => void;
}

const PrimaryActions: React.FC<PrimaryActionsProps> = ({ onOpenModal }) => {
  const { isAuthenticated } = useAuth();
  // TODO: merge all as one method handleModal(type: string)
  const handleInsights = () => {
    if (onOpenModal) onOpenModal(true, "insights");
  };
  const handleExemption = () => {
    if (onOpenModal) onOpenModal(true, "exemption");
  };
  const handleDeficiency = () => {
    if (onOpenModal) onOpenModal(true, "deficiency");
  };
  const handleSave = () => {
    if (onOpenModal) onOpenModal(true, "save");
  };
  return (
    <div className="header-actions">
      <button className="btn btn-success" onClick={handleInsights}>
        <BarChart3 size={16} />
        Show Insights
      </button>

      <button className="btn btn-tertiary" onClick={handleDeficiency}>
        <AlertTriangle size={16} />
        Add Deficiency
      </button>

      <button className="btn btn-tertiary" onClick={handleExemption}>
        <Plus size={16} />
        Add Exemption
      </button>

      {isAuthenticated && (
        <button className="btn btn-secondary" onClick={handleSave}>
          <Save size={16} />
          Save Data
        </button>
      )}
    </div>
  );
};

interface TimelineHeaderProps
  extends HistoryControlsProps,
    PrimaryActionsProps {
  earnedCredits: number;
  totalCredits: number;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  earnedCredits,
  totalCredits,
  onOpenModal,
}) => (
  <header className="app-header">
    <HistoryControls
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={onUndo}
      onRedo={onRedo}
    />

    <CreditsSummary earned={earnedCredits} total={totalCredits} />

    <PrimaryActions onOpenModal={onOpenModal} />
  </header>
);
