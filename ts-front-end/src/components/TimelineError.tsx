import React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

interface TimelineErrorProps {
  message?: string;
  onRetry?: () => void;
}

export const TimelineError: React.FC<TimelineErrorProps> = ({
  message = "Could not load timeline data.",
  onRetry,
}) => {
  return (
    <div className="planner-fullscreen">
      <div className="planner-card planner-card-error">
        <div className="planner-icon-error">
          <AlertTriangle size={32} />
        </div>

        <h2 className="planner-title">Something went wrong</h2>
        <p className="planner-subtitle">{message}</p>

        {onRetry && (
          <button
            className="btn btn-secondary planner-retry-btn"
            onClick={onRetry}>
            <RotateCw size={16} />
            <span>Try again</span>
          </button>
        )}
      </div>
    </div>
  );
};
