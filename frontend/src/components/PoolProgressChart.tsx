import React, { useState } from "react";
import { CourseTooltip } from "./CourseTooltip";
import "../styles/components/PoolProgressChart.css";

type PoolProgressChartProps = {
  poolName: string;
  creditsRequired: number;
  creditsTaken: number;
  takenCourses: string[];
  remainingCourses: string[];
};

const COLORS = {
  completed: "#912338",
  remaining: "#d3d3d3",
};

export const PoolProgressChart: React.FC<PoolProgressChartProps> = ({
  poolName,
  creditsRequired,
  creditsTaken,
  takenCourses,
  remainingCourses,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const percentage =
    creditsRequired > 0 ? Math.round((creditsTaken / creditsRequired) * 100) : 0;

  const handleTooltipClose = () => {
    setShowTooltip(false);
  };

  return (
    <div className="insights-pool-progress-container">
      <h3 className="insights-pool-progress-title">{poolName}</h3>
      <div
        className="insights-pool-chart-container"
        onMouseLeave={() => setShowTooltip(false)}>
        <svg
          viewBox="0 0 100 100"
          className="insights-pool-chart"
          onMouseEnter={() => setShowTooltip(true)}
          aria-hidden>
          <circle
            cx="50"
            cy="50"
            r="34"
            fill="transparent"
            className="insights-pool-center-hit"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={COLORS.remaining}
            strokeWidth="10"
            strokeLinecap="round"
            className="insights-pool-background-circle"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={COLORS.completed}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
            strokeDashoffset="62.75"
            transform="rotate(-90 50 50)"
            className="insights-pool-progress-circle"
          />
        </svg>
        <div className="insights-pool-percentage">{percentage}%</div>

        {showTooltip && (
          <CourseTooltip
            takenCourses={takenCourses}
            remainingCourses={remainingCourses}
            creditsTaken={creditsTaken}
            creditsRequired={creditsRequired}
            onClose={handleTooltipClose}
          />
        )}
      </div>
      <p className="insights-pool-credits">
        {creditsTaken} / {creditsRequired} credits
      </p>
    </div>
  );
};
