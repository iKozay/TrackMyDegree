import React, { useMemo } from "react";
import { Zap, Calendar, BookOpen, AlertCircle, CheckCircle } from "lucide-react";
import { optimizePath } from "../utils/graduationOptimizer";
import type { TimelineState } from "../types/timeline.types";

interface OptimizerModalProps {
  state: TimelineState;
  onApply: () => void;
  onClose: () => void;
}

export const OptimizerModal: React.FC<OptimizerModalProps> = ({
  state,
  onApply,
  onClose,
}) => {
  const result = useMemo(() => optimizePath(state), [state]);
  const hasAnythingToPlace = result.placedCount > 0;

  return (
    <div className="optimizer-modal">
      <div className="optimizer-modal__header">
        <Zap size={22} />
        <h2>Graduation Path Optimizer</h2>
      </div>
      <p className="optimizer-modal__description">
        Automatically fills your remaining semesters with incomplete courses,
        respecting prerequisites and course availability.
      </p>

      {hasAnythingToPlace ? (
        <>
          <div className="optimizer-modal__stats">
            <div className="optimizer-stat">
              <BookOpen size={18} />
              <span className="optimizer-stat__value">{result.placedCount}</span>
              <span className="optimizer-stat__label">
                course{result.placedCount !== 1 ? "s" : ""} will be placed
              </span>
            </div>
            <div className="optimizer-stat">
              <Calendar size={18} />
              <span className="optimizer-stat__value">{result.newSemesterCount}</span>
              <span className="optimizer-stat__label">
                new semester{result.newSemesterCount !== 1 ? "s" : ""} added
              </span>
            </div>
            {result.estimatedGraduation && (
              <div className="optimizer-stat optimizer-stat--highlight">
                <CheckCircle size={18} />
                <span className="optimizer-stat__value">{result.estimatedGraduation}</span>
                <span className="optimizer-stat__label">estimated graduation</span>
              </div>
            )}
          </div>
          {result.unplacedCount > 0 && (
            <div className="optimizer-modal__warning">
              <AlertCircle size={16} />
              <span>
                {result.unplacedCount} course{result.unplacedCount !== 1 ? "s" : ""} could not be placed
                automatically — check their prerequisites or offering seasons.
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="optimizer-modal__empty">
          <CheckCircle size={32} />
          <p>All courses are already placed or completed. Nothing to optimize!</p>
        </div>
      )}
    </div>
  );
};
