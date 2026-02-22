import React from "react";
import { useState, useMemo } from "react";
import { api } from "../../api/http-api-client.ts";
import type { CourseSection } from "src/types/classItem";

// termCode format: 2 YY S
// YY = last 2 digits of the calendar year the term starts in
// S  = season: 1=Summer, 2=Fall, 3=Fall/Winter, 4=Winter, 5=Spring(CCCE), 6=Summer(CCCE)
//
// Winter belongs to the *next* calendar year after the fall:
//   Summer 2025  → starts May 2025    → YY=25, code=2251
//   Fall 2025    → starts Sep 2025    → YY=25, code=2252
//   Winter 2026  → starts Jan 2026    → YY=25, code=2254  (same academic year as Fall 2025)
//
// The academic year rolls over on March 15th each calendar year.

interface Semester {
    value: string;
    label: string;
    termCode: string;
}

const getSemesters = (): Semester[] => {
    const today = new Date();
    const cutover = new Date(today.getFullYear(), 2, 15); // March 15th of current year

    const academicYearStart = today >= cutover ? today.getFullYear() : today.getFullYear() - 1;

    const yy = String(academicYearStart).slice(-2);

    return [
        {
            value: `summer-${academicYearStart}`,
            label: `Summer ${academicYearStart}`,
            termCode: `2${yy}1`,
        },
        {
            value: `fall-${academicYearStart}`,
            label: `Fall ${academicYearStart}`,
            termCode: `2${yy}2`,
        },
        {
            value: `winter-${academicYearStart + 1}`,
            label: `Winter ${academicYearStart + 1}`,
            termCode: `2${yy}4`,
        },
    ];
};

type ModalState =
    | { type: "not_found"; course: string }
    | { type: "not_offered"; course: string; semester: string }
    | null;

const SearchCourses: React.FC = () => {

    const semesters = useMemo(() => getSemesters(), []);

    const [courseId, setCourseId] = useState<string>("");
    const [semester, setSemester] = useState<string>(semesters[0].value);
    const [loading, setLoading] = useState<boolean>(false);
    const [modal, setModal] = useState<ModalState>(null);

    const parseCourseCode = (input: string) => {
        const match = input.trim().match(/^([A-Z]+)\s+(\d+)/i);
        if (!match) {
            throw new Error("Invalid course format. Please use a format like \"COMP 352\".");
        }
        return {
            subject: match[1].toUpperCase(),
            catalog: match[2],
        };
    };

    const getCourse = async () => {
        if (!courseId.trim()) return;

        let isMounted = true;
        const abortController = new AbortController();

        try {
            setLoading(true);

            const { subject, catalog } = parseCourseCode(courseId);
            const selectedSemester = semesters.find((s) => s.value === semester)!;

            const data = await api.get<CourseSection[]>(
                `/section/schedule?subject=${subject}&catalog=${catalog}`,
                { signal: abortController.signal }
            );

            // No results at all → the course code itself doesn't exist
            if (data.length === 0) {
                setModal({ type: "not_found", course: `${subject} ${catalog}` });
                return;
            }

            // Results exist but none are active in the selected term → offered elsewhere, just not this semester
            const filtered = data.filter(
                (section) => section.termCode === selectedSemester.termCode && section.classStatus === "Active"
            );

            if (filtered.length === 0) {
                setModal({ type: "not_offered", course: `${subject} ${catalog}`, semester: selectedSemester.label });
                return;
            }

            console.log("Course sections:", filtered);
        } catch (err: any) {
            if (err.name !== "AbortError") {
                alert(err.message ?? "Error fetching course from server. Please try again later.");
                console.error(err);
            }
        } finally {
            if (isMounted) setLoading(false);
        }

        return () => {
            isMounted = false;
            abortController.abort();
        };
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") getCourse();
    };

    return (
        <div className="search-courses-card">
            <style>{`
                .search-courses-card {
                    background-color: var(--card);
                    color: var(--card-foreground);
                    display: flex;
                    flex-direction: column;
                    border-radius: calc(var(--radius) + 4px);
                    border: 1px solid var(--border);
                    padding: 1.5rem;
                }

                .search-courses-card__title {
                    color: var(--color-slate-900);
                    margin-bottom: 1rem;
                }

                .search-courses-card__group {
                    margin-bottom: 1rem;
                }

                .search-courses-card__label {
                    display: block;
                    font-size: 0.875rem;
                    color: var(--color-slate-600);
                    margin-bottom: 0.5rem;
                }

                .search-courses-card__select {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.5rem;
                    width: 100%;
                    height: 2.25rem;
                    padding: 0 0.75rem;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    border-radius: calc(var(--radius) - 2px);
                    border: 1px solid var(--border);
                    background-color: var(--input-background);
                    color: var(--foreground);
                    cursor: pointer;
                    appearance: none;
                    outline: none;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }

                .search-courses-card__select:focus {
                    border-color: var(--ring);
                    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
                }

                .search-courses-card__select-wrapper {
                    position: relative;
                }

                .search-courses-card__select-icon {
                    position: absolute;
                    right: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 1rem;
                    height: 1rem;
                    color: var(--color-slate-400);
                    pointer-events: none;
                }

                .search-courses-card__search-wrapper {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }

                .search-courses-card__input-wrapper {
                    position: relative;
                    flex: 1;
                }

                .search-courses-card__search-icon {
                    position: absolute;
                    left: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 1rem;
                    height: 1rem;
                    color: var(--color-slate-400);
                    pointer-events: none;
                }

                .search-courses-card__input {
                    width: 100%;
                    height: 2.25rem;
                    padding: 0 0.75rem 0 2.25rem;
                    font-size: 0.875rem;
                    border-radius: calc(var(--radius) - 2px);
                    border: 1px solid var(--border);
                    background-color: var(--input-background);
                    color: var(--foreground);
                    outline: none;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                    box-sizing: border-box;
                }

                .search-courses-card__input::placeholder {
                    color: var(--color-slate-400);
                }

                .search-courses-card__input:focus {
                    border-color: var(--ring);
                    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
                }

                .search-courses-card__button {
                    height: 2.25rem;
                    padding: 0 0.875rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    white-space: nowrap;
                    border-radius: calc(var(--radius) - 2px);
                    border: none;
                    background-color: var(--color-rose-600, #e11d48);
                    color: #fff;
                    cursor: pointer;
                    transition: background-color 0.15s ease, opacity 0.15s ease;
                    flex-shrink: 0;
                }

                .search-courses-card__button:hover:not(:disabled) {
                    background-color: var(--color-rose-700, #be123c);
                }

                .search-courses-card__button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Modal shared styles */
                .sc-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .sc-modal {
                    background: var(--card, #fff);
                    border-radius: calc(var(--radius) + 4px);
                    border: 1px solid var(--border);
                    padding: 1.75rem;
                    max-width: 22rem;
                    width: calc(100% - 2rem);
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                }

                .sc-modal__icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 2.75rem;
                    height: 2.75rem;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .sc-modal__icon svg {
                    width: 1.375rem;
                    height: 1.375rem;
                }

                .sc-modal__icon--warning {
                    background-color: var(--color-rose-50, #fff1f2);
                }

                .sc-modal__icon--warning svg {
                    color: var(--color-rose-600, #e11d48);
                }

                .sc-modal__icon--info {
                    background-color: var(--color-slate-100, #f1f5f9);
                }

                .sc-modal__icon--info svg {
                    color: var(--color-slate-500, #64748b);
                }

                .sc-modal__title {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--color-slate-900);
                    margin: 0;
                }

                .sc-modal__body {
                    font-size: 0.875rem;
                    color: var(--color-slate-600);
                    margin: 0;
                    line-height: 1.5;
                }

                .sc-modal__body strong {
                    color: var(--color-slate-900);
                }

                .sc-modal__close {
                    align-self: flex-end;
                    height: 2.25rem;
                    padding: 0 1rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    border-radius: calc(var(--radius) - 2px);
                    border: 1px solid var(--border);
                    background: transparent;
                    color: var(--color-slate-700);
                    cursor: pointer;
                    transition: background-color 0.15s ease;
                }

                .sc-modal__close:hover {
                    background-color: var(--color-slate-100, #f1f5f9);
                }
            `}</style>

            <h2 className="search-courses-card__title">Search &amp; Add Courses</h2>

            <div className="search-courses-card__group">
                <label className="search-courses-card__label">Select Semester</label>
                <div className="search-courses-card__select-wrapper">
                    <select
                        className="search-courses-card__select"
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                    >
                        {semesters.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="search-courses-card__select-icon" aria-hidden="true">
                        <path d="m6 9 6 6 6-6"></path>
                    </svg>
                </div>
            </div>

            <div className="search-courses-card__group">
                <label className="search-courses-card__label">Search for Courses</label>
                <div className="search-courses-card__search-wrapper">
                    <div className="search-courses-card__input-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className="search-courses-card__search-icon" aria-hidden="true">
                            <path d="m21 21-4.34-4.34"></path>
                            <circle cx="11" cy="11" r="8"></circle>
                        </svg>
                        <input
                            className="search-courses-card__input"
                            placeholder="Search by course code or name..."
                            value={courseId}
                            onChange={(e) => setCourseId(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <button
                        className="search-courses-card__button"
                        onClick={getCourse}
                        disabled={loading || !courseId.trim()}
                    >
                        {loading ? "Searching..." : "Search"}
                    </button>
                </div>
            </div>

            {modal && (
                <div className="sc-modal-overlay" onClick={() => setModal(null)}>
                    <div className="sc-modal" onClick={(e) => e.stopPropagation()}>

                        {modal.type === "not_found" ? (
                            <>
                                <div className="sc-modal__icon sc-modal__icon--warning">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        aria-hidden="true">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M12 8v4"></path>
                                        <path d="M12 16h.01"></path>
                                    </svg>
                                </div>
                                <p className="sc-modal__title">Course Not Found</p>
                                <p className="sc-modal__body">
                                    <strong>{modal.course}</strong> doesn't match any course in the system. Please double-check the course code and try again.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="sc-modal__icon sc-modal__icon--info">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        aria-hidden="true">
                                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
                                        <path d="M12 9v4"></path>
                                        <path d="M12 17h.01"></path>
                                    </svg>
                                </div>
                                <p className="sc-modal__title">Course Not Available</p>
                                <p className="sc-modal__body">
                                    <strong>{modal.course}</strong> is not offered in <strong>{modal.semester}</strong>. Try selecting a different semester.
                                </p>
                            </>
                        )}

                        <button className="sc-modal__close" onClick={() => setModal(null)}>
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchCourses;