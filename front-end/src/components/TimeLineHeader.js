/* eslint-disable prettier/prettier */
// TimelineHeader.js
export const TimelineHeader = ({ timelineName, addButtonText, onAddSemester }) => (
    <div className="timeline-header">
        <div className="timeline-title">
            <h2>{timelineName && timelineName !== 'null' ? timelineName : 'My Timeline'}</h2>
        </div>
        <button className="add-semester-button" onClick={onAddSemester}>
            {addButtonText}
        </button>
    </div>
);
