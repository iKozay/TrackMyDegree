import React from "react";
import { useState } from "react";
import { api } from "../../api/http-api-client.ts";

const SearchCourses: React.FC = () => {

    const [courseId, setCourseId] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

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

    const getTwoMonthsAgo = () => {
        const date = new Date();
        date.setMonth(date.getMonth() - 2);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const parseDate = (dateString: string) => {
        const [day, month, year] = dateString.split("/");
        return new Date(Number(year), Number(month) - 1, Number(day));
    };

    const getCourse = async () => {
        if (!courseId.trim()) return;

        let isMounted = true;
        const abortController = new AbortController();

        try {
            setLoading(true);

            const { subject, catalog } = parseCourseCode(courseId);

            const data = await api.get<any[]>(
                `/section/schedule?subject=${subject}&catalog=${catalog}`,
                { signal: abortController.signal }
            );

            const filtered = data.filter(section => {
                const startDate = parseDate(section.classStartDate);
                return startDate >= getTwoMonthsAgo();
            });

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
            `}</style>

            <h2 className="search-courses-card__title">Search &amp; Add Courses</h2>

            <div className="search-courses-card__group">
                <label className="search-courses-card__label">Select Semester</label>
                <div className="search-courses-card__select-wrapper">
                    <select className="search-courses-card__select" defaultValue="winter-2025">
                        <option value="winter-2025">Winter 2025</option>
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
        </div>
    );
};

export default SearchCourses;