import { useState, useMemo } from "react";
import { api } from "../../api/http-api-client.ts";
import type { AddedCourse, CourseSection } from "src/types/classItem";
import "../../styles/components/classbuilder/SearchCoursesStyle.css"

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
    | { type: "duplicate"; course: string }
    | null;

interface SearchCoursesProps {
    addedCourses: AddedCourse[];
    setAddedCourses: (courses: AddedCourse[]) => void;
    onSemesterChange?: () => void;
}

const SearchCourses: React.FC<SearchCoursesProps> = ({ addedCourses, setAddedCourses, onSemesterChange }) => {

    const semesters = useMemo(() => getSemesters(), []);

    const [courseId, setCourseId] = useState<string>("");
    const [semester, setSemester] = useState<string>(semesters[0].value);
    const [loading, setLoading] = useState<boolean>(false);
    const [modal, setModal] = useState<ModalState>(null);

    const parseCourseCode = (input: string) => {
        const regex = /^([A-Z]+)\s+(\d+)/i;
        const match = regex.exec(input.trim())
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
            const courseCode = `${subject} ${catalog}`;
            const selectedSemester = semesters.find((s) => s.value === semester)!;

            // Guard: don't add a course that's already in the list
            if (addedCourses.some((c) => c.code === courseCode)) {
                setModal({ type: "duplicate", course: courseCode });
                return;
            }

            const data = await api.get<CourseSection[]>(
                `/section/schedule?subject=${subject}&catalog=${catalog}`,
                { signal: abortController.signal }
            );

            // No results at all → the course code itself doesn't exist
            if (data.length === 0) {
                setModal({ type: "not_found", course: courseCode });
                return;
            }

            // Results exist but none are active in the selected term
            const filtered = data.filter(
                (section) => section.termCode === selectedSemester.termCode && section.classStatus === "Active"
            );

            if (filtered.length === 0) {
                setModal({ type: "not_offered", course: courseCode, semester: selectedSemester.label });
                return;
            }

            // Add the course to the list
            const newCourse: AddedCourse = {
                code: courseCode,
                title: filtered[0].courseTitle,
                sections: filtered,
            };

            setAddedCourses([...addedCourses, newCourse]);
            setCourseId("");

        } catch (err: unknown) {
            if (err instanceof Error && err.name !== "AbortError") {
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

    const handleSemesterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSemester(e.target.value);
        onSemesterChange?.();
    };

    return (
        <div className="search-courses-card">

            <h2 className="search-courses-card__title">Search &amp; Add Courses</h2>

            <div className="search-courses-card__group">
                <label className="search-courses-card__label" htmlFor="semester-select">Select Semester</label>
                <div className="search-courses-card__select-wrapper">
                    <select
                        id="semester-select"
                        className="search-courses-card__select"
                        value={semester}
                        onChange={handleSemesterChange}
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
                <label className="search-courses-card__label" htmlFor="course-search-input">Search for Courses</label>
                <div className="search-courses-card__search-wrapper">
                    <div className="search-courses-card__input-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className="search-courses-card__search-icon" aria-hidden="true">
                            <path d="m21 21-4.34-4.34"></path>
                            <circle cx="11" cy="11" r="8"></circle>
                        </svg>
                        <input
                            id="course-search-input"
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
                <button className="sc-modal-overlay" onClick={() => setModal(null)}>
                    <button className="sc-modal" onClick={(e) => e.stopPropagation()}>

                        {modal.type === "not_found" && (
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
                        )}

                        {modal.type === "not_offered" && (
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

                        {modal.type === "duplicate" && (
                            <>
                                <div className="sc-modal__icon sc-modal__icon--info">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        aria-hidden="true">
                                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                                    </svg>
                                </div>
                                <p className="sc-modal__title">Course Already Added</p>
                                <p className="sc-modal__body">
                                    <strong>{modal.course}</strong> is already in your course list.
                                </p>
                            </>
                        )}

                        <button className="sc-modal__close" onClick={() => setModal(null)}>
                            Got it
                        </button>
                    </button>
                </button>
            )}
        </div>
    );
};

export default SearchCourses;
