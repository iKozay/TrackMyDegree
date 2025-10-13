/* eslint-disable prettier/prettier */
import { useState, useEffect } from 'react';

export const CourseScheduleModal = ({ title, hidden }) => {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        return () => {
            setSections([]);
            setLoading(false);
            setError(null);
        };
    }, [title]);

    const parseCourseCode = () => {
        const match = title.match(/^([A-Z]+)\s+(\d+)/);
        if (!match) {
            throw new Error('Invalid course title format');
        }
        return {
            subject: match[1],
            catalog: match[2]
        };
    };

    const groupByTerm = (sections) => {
        return sections.reduce((acc, section) => {
            const term = section.termCode;
            if (!acc[term]) acc[term] = [];
            acc[term].push(section);
            return acc;
        }, {});
    };

    const translateTermCode = (termCode) => {
        const seasonCodes = {
            '1': 'Summer',
            '2': 'Fall',
            '3': 'Fall/Winter',
            '4': 'Winter',
            '5': 'Spring (CCCE)',
            '6': 'Summer (CCCE)'
        };

        const yearDigits = termCode.substring(1, 3);
        const academicYearStart = 2000 + parseInt(yearDigits);
        const seasonCode = termCode[3];
        const season = seasonCodes[seasonCode] || 'Unknown';

        if (['3', '4'].includes(seasonCode)) {
            return `${season} ${academicYearStart}-${academicYearStart + 1}`;
        }
        return `${season} ${academicYearStart}`;
    };

    const getTwoMonthsAgo = () => {
        const date = new Date();
        date.setMonth(date.getMonth() - 2);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const parseDate = (dateString) => {
        const [day, month, year] = dateString.split('/');
        return new Date(year, month - 1, day);
    };

    const formatEnrollment = (section) => {
        return `${section.currentEnrollment}/${section.enrollmentCapacity}` +
            (section.waitlistCapacity > 0 ?
                ` (Waitlist: ${section.currentWaitlistTotal}/${section.waitlistCapacity})` : '');
    };

    const fetchSections = async () => {
        let isMounted = true;
        const abortController = new AbortController();

        try {
            setLoading(true);
            setError(null);
            setIsOpen(true);
            setSections([]);

            const { subject, catalog } = parseCourseCode();

            const response = await fetch(
                // eslint-disable-next-line no-undef
                `${process.env.REACT_APP_SERVER}/section/schedule?subject=${subject}&catalog=${catalog}`,
                {
                    signal: abortController.signal,
                    headers: {
                        'Content-Type': 'application/json'
                        // Authorization header removed - handle it in backend if needed
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch sections');

            const data = await response.json();
            const filtered = data.filter(section => {
                const startDate = parseDate(section.classStartDate);
                return startDate >= getTwoMonthsAgo();
            });

            if (isMounted) setSections(filtered);
        } catch (err) {
            if (isMounted && err.name !== 'AbortError') {
                setError(err.message);
            }
        } finally {
            if (isMounted) setLoading(false);
        }
    };


    return (
        <div>
            <button className={`show-course-button${!hidden ? " hidden" : ""}`} onClick={fetchSections} disabled={loading}>
                {loading ? 'Loading...' : 'Show Course Schedule'}
            </button>

            {isOpen && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2>Course Schedule</h2>
                            <button onClick={() => setIsOpen(false)}>×</button>
                        </div>

                        {loading ? (
                            <div className="loading-placeholder">
                                <div className="loading-spinner"></div>
                                <p>Loading course sections...</p>
                            </div>
                        ) : (
                            <>
                                {error && <p className="error-message">Error: {error}</p>}

                                {!loading && sections.length === 0 && !error && (
                                    <p>No upcoming sections found</p>
                                )}

                                {Object.entries(groupByTerm(sections)).map(([termCode, termSections]) => (
                                    <div key={termCode} className="term-group">
                                        <h3>{translateTermCode(termCode)}</h3>
                                        <div className="schedule-table">
                                            <div className="table-header">
                                                <div>Session</div>
                                                <div>Section</div>
                                                <div>Component</div>
                                                <div>Status</div>
                                                <div>Mode</div>
                                                <div>Dates</div>
                                                <div>Enrollment</div>
                                            </div>
                                            {termSections.map(section => (
                                                <div key={section.classNumber} className="table-row">
                                                    <div>{section.session}</div>
                                                    <div>{section.section}</div>
                                                    <div>{section.componentDescription}</div>
                                                    <div>{section.classStatus}</div>
                                                    <div>{section.instructionModeDescription}</div>
                                                    <div>{section.classStartDate} - {section.classEndDate}</div>
                                                    <div>{formatEnrollment(section)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }

                .modal-card {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    max-width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .modal-header button {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0 8px;
                }

                .term-group {
                    margin-bottom: 25px;
                }

                .term-group h3 {
                    margin: 15px 0;
                    color: #2c3e50;
                }

                .schedule-table {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 1px;
                    background: #ddd;
                }

                .table-header, .table-row {
                    display: contents;
                }

                .table-header > div {
                    background: #f8f9fa;
                    padding: 12px;
                    font-weight: 600;
                    text-align: center;
                }

                .table-row > div {
                    background: white;
                    padding: 12px;
                    text-align: center;
                }

                .error-message {
                    color: #e74c3c;
                    margin: 15px 0;
                }

                .loading-placeholder {
                    text-align: center;
                    padding: 40px 20px;
                }

                .loading-spinner {
                    display: inline-block;
                    width: 40px;
                    height: 40px;
                    border: 3px solid #f3f3f3;
                    border-radius: 50%;
                    border-top-color: #3498db;
                    animation: spin 1s ease-in-out infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

