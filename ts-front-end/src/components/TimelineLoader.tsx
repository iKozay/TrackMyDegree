import React from "react";
import { Loader2 } from "lucide-react";

export const TimelineLoader: React.FC = () => {
  return (
    <div className="planner-fullscreen">
      <div className="planner-card">
        <div className="planner-spinner-wrapper">
          <div className="planner-spinner-bg">
            <Loader2 className="planner-spinner-icon" />
          </div>
        </div>

        <h2 className="planner-title">Preparing your academic plan…</h2>
        <p className="planner-subtitle">
          We&apos;re fetching your courses, pools, and semesters.
        </p>

        <div className="planner-progress-bar">
          <div className="planner-progress-inner" />
        </div>
      </div>
    </div>
  );
};
