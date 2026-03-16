import React, { useMemo, useState } from "react";
import type { CourseMap, Pool } from "../types/timeline.types";
import { OverallProgressBar } from "./OverallProgressBar";
import { PoolProgressChart } from "./PoolProgressChart";
import { CoopValidationModal } from "./CoopValidationModal";
import "../styles/components/InsightsModal.css";

type InsightsModalProps = {
  open: boolean;
  pools: Pool[];
  courses: CourseMap;
  onClose: () => void;
  onOpenDegreeAudit?: () => void;
};

type PoolProgress = {
  poolName: string;
  creditsRequired: number;
  creditsTaken: number;
  takenCourses: string[];
  remainingCourses: string[];
};

export const InsightsModal: React.FC<InsightsModalProps> = ({
  open,
  pools,
  courses,
  onClose,
  onOpenDegreeAudit,
}) => {
  const [activeTab, setActiveTab] = useState<"quick" | "coop" | "degree">(
    "quick",
  );

  const poolProgress = useMemo((): PoolProgress[] => {
    // Filter out exemptions pool
    const nonExemptionPools = pools.filter((pool) => {
      const id = pool._id.toLowerCase();
      return !id.includes("exemption") && id !== "used-unused-credits";
    });

    // Get exemption courses to exclude from progress
    const exemptionPool = pools.find((pool) =>
      pool._id.toLowerCase().includes("exemption"),
    );
    const exemptionCourseIds = new Set(exemptionPool?.courses || []);

    // Get courses that are planned or completed (excluding exemptions)
    const activeCourses = Object.entries(courses).filter(
      ([courseId, course]) =>
        !exemptionCourseIds.has(courseId) &&
        (course.status?.status === "planned" ||
          course.status?.status === "completed"),
    );

    return nonExemptionPools.map((pool) => {
      // Get course IDs in this pool
      const poolCourseIds = new Set(pool.courses.map((courseId) => courseId));

      // Calculate credits taken from this pool
      let creditsTaken = 0;
      const takenCourses: string[] = [];

      activeCourses.forEach(([courseId, course]) => {
        if (poolCourseIds.has(courseId)) {
          creditsTaken += course.credits || 0;
          takenCourses.push(courseId);
        }
      });

      // Get remaining courses (courses in pool not yet taken)
      const takenCourseSet = new Set(takenCourses);
      const remainingCourses = pool.courses.filter(
        (courseId) => !takenCourseSet.has(courseId),
      );

      return {
        poolName: pool.name,
        creditsRequired: pool.creditsRequired,
        creditsTaken,
        takenCourses,
        remainingCourses,
      };
    });
  }, [pools, courses]);

  const { totalTaken, totalRequired } = useMemo(
    () => ({
      totalTaken: poolProgress.reduce(
        (sum, pool) => sum + pool.creditsTaken,
        0,
      ),
      totalRequired: poolProgress.reduce(
        (sum, pool) => sum + pool.creditsRequired,
        0,
      ),
    }),
    [poolProgress],
  );

  if (!open) return null;

  return (
    <div className="insights-modal-backdrop">
      <div className="insights-modal-content">
        <button
          className="insights-modal-close"
          onClick={onClose}
          aria-label="Close insights modal">
          ×
        </button>
        <h2 className="insights-modal-title">Insights</h2>

        <div className="insights-layout">
          <aside className="insights-side-panel">
            <button
              className={`insights-panel-btn ${activeTab === "quick" ? "active" : ""}`}
              onClick={() => setActiveTab("quick")}>
              Quick Assessment
            </button>
            <button
              className={`insights-panel-btn ${activeTab === "degree" ? "active" : ""}`}
              onClick={() => setActiveTab("degree")}>
              Degree Audit
            </button>
            <button
              className={`insights-panel-btn ${activeTab === "coop" ? "active" : ""}`}
              onClick={() => setActiveTab("coop")}>
              Co-op Validation
            </button>
          </aside>

          <section className="insights-main-content">
            {activeTab === "quick" && (
              <>
                <OverallProgressBar
                  totalTaken={totalTaken}
                  totalRequired={totalRequired}
                />

                <div className="insights-pools-grid">
                  {poolProgress.map((progress) => (
                    <PoolProgressChart
                      key={progress.poolName}
                      poolName={progress.poolName}
                      creditsRequired={progress.creditsRequired}
                      creditsTaken={progress.creditsTaken}
                      takenCourses={progress.takenCourses}
                      remainingCourses={progress.remainingCourses}
                    />
                  ))}
                </div>
              </>
            )}

            {activeTab === "degree" && (
              <div className="insights-degree-audit">
                <p>Run a full degree audit on your current timeline.</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    onOpenDegreeAudit?.();
                  }}>
                  Open Degree Audit
                </button>
              </div>
            )}

            {activeTab === "coop" && <CoopValidationModal />}
          </section>
        </div>
      </div>
    </div>
  );
};
