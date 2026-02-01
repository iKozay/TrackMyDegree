import React from "react";

const SearchCourses: React.FC = () => {
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
                    position: relative;
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
                }

                .search-courses-card__input::placeholder {
                    color: var(--color-slate-400);
                }

                .search-courses-card__input:focus {
                    border-color: var(--ring);
                    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
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
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        className="search-courses-card__select-icon" aria-hidden="true">
                        <path d="m6 9 6 6 6-6"></path>
                    </svg>
                </div>
            </div>

            <div className="search-courses-card__group">
                <label className="search-courses-card__label">Search for Courses</label>
                <div className="search-courses-card__search-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        className="search-courses-card__search-icon" aria-hidden="true">
                        <path d="m21 21-4.34-4.34"></path>
                        <circle cx="11" cy="11" r="8"></circle>
                    </svg>
                    <input
                        className="search-courses-card__input"
                        placeholder="Search by course code or name..."
                    />
                </div>
            </div>
        </div>
    );
};

export default SearchCourses;