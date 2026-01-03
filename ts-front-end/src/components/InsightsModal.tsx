import React, { useMemo } from "react";
import type { CourseMap, Pool } from "../types/timeline.types";
import { OverallProgressBar } from "./OverallProgressBar";
import { PoolProgressChart } from "./PoolProgressChart";
import "../styles/components/InsightsModal.css";

type InsightsModalProps = {
  open: boolean;
  pools: Pool[];
  courses: CourseMap;
  onClose: () => void;
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
}) => {
  const poolProgress = useMemo((): PoolProgress[] => {
    // Get courses that are planned or completed
    const activeCourses = Object.entries(courses).filter(
      ([, course]) =>
        course.status?.status === "planned" ||
        course.status?.status === "completed" ||
        course.status?.status === "inprogress"
    );

    return pools.map((pool) => {
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
        (courseId) => !takenCourseSet.has(courseId)
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
        0
      ),
      totalRequired: poolProgress.reduce(
        (sum, pool) => sum + pool.creditsRequired,
        0
      ),
    }),
    [poolProgress]
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
        <h2 className="insights-modal-title">Progress Insights</h2>

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
      </div>
    </div>
  );
};
