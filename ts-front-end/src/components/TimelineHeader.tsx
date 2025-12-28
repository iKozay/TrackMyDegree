import React from "react";
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

interface HistoryControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const HistoryControls: React.FC<HistoryControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => (
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

    <button className="btn btn-secondary">
      <Share2 size={16} />
      Share
    </button>

    <button className="btn btn-secondary">
      <Download size={16} />
      Download
    </button>
  </div>
);

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
  onSave?: (open: boolean, type: string) => void;
}

const PrimaryActions: React.FC<PrimaryActionsProps> = ({
  onOpenModal,
  onSave,
}) => {
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
    if (onSave) onSave(true, "save");
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

      <button className="btn btn-secondary" onClick={handleSave}>
        <Save size={16} />
        Save Data
      </button>
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
  onSave,
}) => (
  <header className="app-header">
    <HistoryControls
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={onUndo}
      onRedo={onRedo}
    />

    <CreditsSummary earned={earnedCredits} total={totalCredits} />

    <PrimaryActions onOpenModal={onOpenModal} onSave={onSave} />
  </header>
);
