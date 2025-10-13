/* eslint-disable prettier/prettier */
import { useState } from "react";

export const AddSemesterModal = ({ onClose, handleAddSemester }) => {
    const [selectedSeason, setSelectedSeason] = useState("Fall");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    if (!onClose) return null;

    const handleAddClick = () => {
        // Send selected values to parent
        let displayYear = selectedYear; // This will store YYYY-YY for name

        if (
            selectedSeason === 'Fall/Winter' &&
            !String(selectedYear).includes('-')
        ) {
            const startYear = parseInt(selectedYear, 10);
            displayYear = `${startYear}-${(startYear + 1) % 100}`;
        }

        const id = `${selectedSeason} ${selectedYear}`;
        const name = `${selectedSeason} ${displayYear}`;
        handleAddSemester(id, name);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button
                    className="close-button"
                    onClick={() => onClose(false)}
                >
                    ✕
                </button>

                <p>Add a semester</p>
                <hr style={{ marginBottom: '1rem' }} />

                {/* Container for the two selects */}
                <div
                    style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}
                >
                    {/* Term Select */}
                    <div className="select-container">
                        <label className="select-label">Term</label>
                        <select
                            value={selectedSeason}
                            onChange={(e) => setSelectedSeason(e.target.value)}
                        >
                            <option>Winter</option>
                            <option>Summer</option>
                            <option>Fall</option>
                            <option>Fall/Winter</option>
                        </select>
                    </div>

                    {/* Year Select */}
                    <div className="select-container">
                        <label className="select-label">Year</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            {Array.from({ length: 14 }).map((_, i) => {
                                const year = 2017 + i;
                                const displayYear =
                                    selectedSeason === 'Fall/Winter'
                                        ? `${year}-${(year + 1) % 100}`
                                        : year;

                                return (
                                    <option key={year} value={year}>
                                        {displayYear}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>
                <button className="TL-button" onClick={handleAddClick}>
                    Add new semester
                </button>
            </div>
        </div>
    );
}
