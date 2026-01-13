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
    const [hoveredSection, setHoveredSection] = useState<{
        poolName: string;
        section: "completed" | "remaining";
    } | null>(null);

    const percentage = creditsRequired > 0 ? Math.round((creditsTaken / creditsRequired) * 100) : 0;

    const handleSectionHover = (section: "completed" | "remaining") => {
        setHoveredSection({ poolName, section });
    };

    const handleTooltipClose = () => {
        setHoveredSection(null);
    };

    return (
        <div className="insights-pool-progress-container">
            <h3 className="insights-pool-progress-title">{poolName}</h3>
            <div className="insights-pool-chart-container">
                <svg viewBox="0 0 100 100" className="insights-pool-chart">
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={COLORS.remaining}
                        strokeWidth="10"
                        className="insights-pool-background-circle"
                        onMouseEnter={() => handleSectionHover("remaining")}
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={COLORS.completed}
                        strokeWidth="10"
                        strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
                        strokeDashoffset="62.75"
                        transform="rotate(-90 50 50)"
                        className="insights-pool-progress-circle"
                        onMouseEnter={() => handleSectionHover("completed")}
                    />
                </svg>
                <div className="insights-pool-percentage">{percentage}%</div>
            </div>
            <p className="insights-pool-credits">
                {creditsTaken} / {creditsRequired} credits
            </p>

            {hoveredSection?.poolName === poolName && hoveredSection?.section && (
                <CourseTooltip
                    section={hoveredSection.section}
                    takenCourses={takenCourses}
                    remainingCourses={remainingCourses}
                    creditsTaken={creditsTaken}
                    creditsRequired={creditsRequired}
                    onClose={handleTooltipClose}
                />
            )}
        </div>
    );
};