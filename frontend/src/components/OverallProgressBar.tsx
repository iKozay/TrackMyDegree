import React from "react";
import "../styles/components/OverallProgressBar.css";

type OverallProgressBarProps = {
    totalTaken: number;
    totalRequired: number;
};

export const OverallProgressBar: React.FC<OverallProgressBarProps> = ({
    totalTaken,
    totalRequired,
}) => {
    const overallPercentage = totalRequired > 0 ? Math.round((totalTaken / totalRequired) * 100) : 0;

    return (
        <div className="insights-overall-progress-container">
            <div className="insights-overall-progress-header">
                <h4 className="insights-overall-progress-title">Overall Progress</h4>
                <span className="insights-overall-progress-percentage">{overallPercentage}%</span>
            </div>
            <div className="insights-overall-progress-bar-container">
                <div 
                    className="insights-overall-progress-bar"
                    style={{ width: `${overallPercentage}%` }}
                />
            </div>
            <div className="insights-overall-progress-footer">
                <span>{totalTaken} credits completed / {totalRequired} credits total</span>
            </div>
        </div>
    );
};