/* eslint-disable prettier/prettier */
import { FaUndo, FaRedo, FaShareSquare } from "react-icons/fa";
import ShowInsights from "./ShowInsights";
import { Button } from "react-bootstrap";
import { exportTimelineToPDF } from '../utils/pdfutils';
import saveIcon from '../icons/saveIcon.png';
import downloadIcon from '../icons/download-icon.PNG';

export const TopBar = ({
    history,
    future,
    handleUndo,
    handleRedo,
    toggleShareDialog,
    totalCredits,
    deficiencyCredits,
    credsReq,
    exemptionCredits,
    coursePools,
    semesterCourses,
    courseInstanceMap,
    setShowDeficiencyModal,
    setShowExemptionsModal,
    setShowSaveModal,
}) => {

    console.log(deficiencyCredits);
    console.log(exemptionCredits);
    return (
        <div className="credits-display">
            {/* Left section: undo/redo/share/download */}
            <div className="timeline-buttons-container">
                <Button
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    className="icon-btn"
                >
                    <FaUndo size={25} />
                </Button>

                <Button
                    onClick={handleRedo}
                    disabled={future.length === 0}
                    className="icon-btn"
                >
                    <FaRedo size={25} />
                </Button>

                <button
                    className="download-timeline-button"
                    onClick={toggleShareDialog}
                >
                    <FaShareSquare />
                    <span className="button-text">Share</span>
                </button>

                <button
                    className="download-timeline-button"
                    onClick={exportTimelineToPDF}
                >
                    <img
                        src={downloadIcon}
                        alt="Download"
                        className="button-icon download-icon"
                    />
                    <span className="button-text">Download</span>
                </button>
            </div>

            {/* Middle: credits counter */}
            <h4>
                Total Credits Earned: {totalCredits + deficiencyCredits} /{" "}
                {credsReq + deficiencyCredits - exemptionCredits}
            </h4>

            {/* Right section: insights + other actions */}
            <div className="timeline-buttons-container">
                <div>
                    <ShowInsights
                        coursePools={coursePools}
                        semesterCourses={semesterCourses}
                        totalC={totalCredits}
                        deficiencyCredits={deficiencyCredits}
                        courseInstanceMap={courseInstanceMap}
                    />
                </div>

                <button
                    className="add-deficiencies-button"
                    onClick={() => setShowDeficiencyModal(true)}
                >
                    Add Deficiencies
                </button>

                <button
                    className="add-deficiencies-button"
                    onClick={() => setShowExemptionsModal(true)}
                >
                    Add Exemptions
                </button>

                <button
                    className="save-timeline-button"
                    onClick={() => setShowSaveModal(true)
                    }
                >
                    <img
                        src={saveIcon}
                        alt="Save"
                        className="button-icon save-icon"
                    />
                    <span className="button-text">Save Timeline</span>
                </button>
            </div>
        </div>
    );
};

