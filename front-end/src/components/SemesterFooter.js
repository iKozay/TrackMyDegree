/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
// SemesterFooter.js

import { TrashButton } from './TrashButton'
export const SemesterFooter = ({ sumCredits, maxAllowed, isOver, onRemoveSemester, semesterName }) => {
    const creditClass = isOver ? 'semester-credit over-limit-warning' : 'semester-credit';

    return (
        <div className="semester-footer">
            <div className={creditClass}>
                Total Credit: {sumCredits} {isOver && <span><br /> Over the credit limit {maxAllowed}</span>}
            </div>
            <TrashButton onTrash={onRemoveSemester} id={semesterName} />
        </div>
    );
};
