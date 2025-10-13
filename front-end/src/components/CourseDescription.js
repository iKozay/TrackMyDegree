/* eslint-disable prettier/prettier */

import { CourseScheduleModal } from "./CourseScheduleModal";

export const CourseDescription = ({
    selectedCourse,
    showCourseDescription,
    toggleCourseDescription,
}) => {
    const renderRequisites = (type) => {
        if (!selectedCourse?.requisites) return null;

        const filtered = selectedCourse.requisites.filter(
            (r) => r.type.toLowerCase() === type
        );

        if (filtered.length === 0) return null;

        const grouped = {};
        const nonGrouped = [];

        filtered.forEach((r) => {
            if (r.group_id) {
                if (!grouped[r.group_id]) grouped[r.group_id] = [];
                grouped[r.group_id].push(r.code2);
            } else {
                nonGrouped.push(r.code2);
            }
        });

        return (
            <>
                <strong>
                    {type === "pre" ? "Prerequisites:" : "Corequisites:"}
                </strong>
                <ul>
                    {Object.entries(grouped).map(([groupId, codes]) => (
                        <li key={groupId}>{codes.join(" or ")}</li>
                    ))}
                    {nonGrouped.map((code, i) => (
                        <li key={`${type}-${i}`}>{code}</li>
                    ))}
                </ul>
            </>
        );
    };

    return (
        <div className="description-and-button">
            <button
                className="right-toggle-button"
                onClick={toggleCourseDescription}
            >
                {showCourseDescription ? "▶" : "◀"}
            </button>

            <div
                className={`description-section ${showCourseDescription ? "" : "hidden"
                    }`}
            >
                {selectedCourse ? (
                    <div>
                        <h5>
                            <strong>{selectedCourse.title}</strong>
                        </h5>
                        <div>
                            <strong>Credits: </strong>
                            {selectedCourse.credits}
                        </div>

                        <div>
                            <strong>Offered In: </strong>
                            <p>
                                {Array.isArray(selectedCourse.offeredIn)
                                    ? selectedCourse.offeredIn.length > 0
                                        ? selectedCourse.offeredIn.join(", ")
                                        : <i>None</i>
                                    : typeof selectedCourse.offeredIn === "string" &&
                                        selectedCourse.offeredIn.trim()
                                        ? selectedCourse.offeredIn
                                        : <i>None</i>}
                            </p>
                        </div>

                        {selectedCourse.requisites ? (
                            <div>
                                {renderRequisites("pre")}
                                {renderRequisites("co")}
                                {selectedCourse.requisites.length === 0 && (
                                    <p>
                                        <i>No Requisites</i>
                                    </p>
                                )}
                            </div>
                        ) : null}

                        <CourseScheduleModal
                            title={selectedCourse.title}
                            hidden={showCourseDescription}
                        />

                        <strong>Description:</strong>
                        <p data-testid="course-description">
                            {selectedCourse.description}
                        </p>
                    </div>
                ) : (
                    <p data-testid="course-description">
                        Drag or click on a course to see its description here.
                    </p>
                )}
            </div>
        </div>
    );
};


