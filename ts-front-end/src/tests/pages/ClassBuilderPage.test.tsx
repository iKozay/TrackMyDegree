import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClassBuilderPage from '../../pages/ClassBuilderPage';
import type { CourseSection } from '../../types/classItem';

const makeSection = (overrides: Partial<CourseSection> = {}): CourseSection => ({
    courseID: "1", termCode: "2251", session: "1", subject: "COMP", catalog: "352",
    section: "AA", componentCode: "LEC", componentDescription: "Lecture",
    classNumber: "1001", classAssociation: "1", courseTitle: "DATA STRUCTURES",
    topicID: "", topicDescription: "", classStatus: "Active",
    locationCode: "SGW", instructionModeCode: "P", instructionModeDescription: "In Person",
    meetingPatternNumber: "1", roomCode: "H637", buildingCode: "H", room: "H-637",
    classStartTime: "08.45.00", classEndTime: "10.00.00",
    mondays: "Y", tuesdays: "N", wednesdays: "Y", thursdays: "N",
    fridays: "N", saturdays: "N", sundays: "N",
    classStartDate: "06/01/2025", classEndDate: "15/04/2025",
    career: "UGRD", departmentCode: "COMP", departmentDescription: "Computer Science",
    facultyCode: "ECS", facultyDescription: "Engineering",
    enrollmentCapacity: "100", currentEnrollment: "50",
    waitlistCapacity: "0", currentWaitlistTotal: "0", hasSeatReserved: "",
    ...overrides,
});

vi.mock('../../components/ClassBuilderComponents/SearchCourses', () => ({
    default: ({
        setAddedCourses,
        onSemesterChange,
    }: {
        addedCourses: unknown[];
        setAddedCourses: (c: unknown[]) => void;
        onSemesterChange?: () => void;
    }) => (
        <div data-testid="search-courses">
            <button
                data-testid="inject-courses"
                onClick={() => setAddedCourses((window as unknown as { __injectCourses: unknown[] }).__injectCourses ?? [])}
            >
                inject
            </button>
            <button
                data-testid="change-semester"
                onClick={() => onSemesterChange?.()}
            >
                change semester
            </button>
        </div>
    ),
}));

const injectCourses = (courses: unknown[]) => {
    (window as unknown as { __injectCourses: unknown[] }).__injectCourses = courses;
    fireEvent.click(screen.getByTestId('inject-courses'));
};

// ─── Shared course factories ──────────────────────────────────────────────────

const singleLecCourse = (overrides: Partial<CourseSection> = {}) => ({
    code: "COMP 352", title: "DATA STRUCTURES",
    sections: [makeSection({ classNumber: "1001", mondays: "Y", wednesdays: "N", ...overrides })],
});

// Two independent associations → two configurations
const twoAssocCourse = () => ({
    code: "COMP 352", title: "DATA STRUCTURES",
    sections: [
        makeSection({ classNumber: "1001", classAssociation: "1", componentCode: "LEC" }),
        makeSection({ classNumber: "1002", classAssociation: "2", componentCode: "LEC" }),
    ],
});

// Course whose only section conflicts with the provided time range
const conflictingCourse = (classNumber: string, startTime: string, endTime: string) => ({
    code: "COMP 474", title: "AI",
    sections: [makeSection({ classNumber, mondays: "Y", wednesdays: "N", classStartTime: startTime, classEndTime: endTime })],
});

// ─── Initial render ───────────────────────────────────────────────────────────

describe('ClassBuilderPage initial render', () => {
    it('renders page title, description, all child components, and empty-state values', () => {
        render(<ClassBuilderPage />);

        expect(screen.getByText('Class Builder')).toBeInTheDocument();
        expect(screen.getByText('Create and visualize student schedules to identify conflicts')).toBeInTheDocument();
        expect(screen.queryByText('Export Schedule')).not.toBeInTheDocument();

        expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
        expect(screen.getByText('Scheduled Courses')).toBeInTheDocument();
        ['Total Hours', 'Enrolled Courses'].forEach(label =>
            expect(screen.getByText(label)).toBeInTheDocument()
        );

        expect(screen.getByText('0 hours/week')).toBeInTheDocument();
        expect(screen.getByText('0 courses')).toBeInTheDocument();
        expect(screen.getByText('No courses added yet.')).toBeInTheDocument();
        expect(screen.queryByLabelText(/Remove/)).not.toBeInTheDocument();

        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day =>
            expect(screen.getByText(day)).toBeInTheDocument()
        );
    });

    it('does not show nav arrows when no courses are added', () => {
        render(<ClassBuilderPage />);
        expect(screen.queryByLabelText('Previous configuration')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Next configuration')).not.toBeInTheDocument();
    });
});

// ─── Configuration system ─────────────────────────────────────────────────────

describe('ClassBuilderPage configuration system', () => {
    beforeEach(() => vi.clearAllMocks());

    it('stats update when a course with sections is added', () => {
        render(<ClassBuilderPage />);
        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [makeSection({ mondays: "Y", wednesdays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" })],
            }]);
        });

        expect(screen.getByText('2 hours/week')).toBeInTheDocument();
        expect(screen.getByText('1 course')).toBeInTheDocument();
    });

    it('navigation arrows and counter appear when course has multiple configurations', () => {
        render(<ClassBuilderPage />);
        act(() => { injectCourses([twoAssocCourse()]); });

        expect(screen.getByLabelText('Previous configuration')).toBeInTheDocument();
        expect(screen.getByLabelText('Next configuration')).toBeInTheDocument();
    });

    it('prev is disabled at first config; next is disabled at last config', () => {
        render(<ClassBuilderPage />);
        act(() => { injectCourses([twoAssocCourse()]); });

        expect(screen.getByLabelText('Previous configuration')).toBeDisabled();

        act(() => { fireEvent.click(screen.getByLabelText('Next configuration')); });
        expect(screen.getByLabelText('Next configuration')).toBeDisabled();
    });

    it('counter shows correct position as user navigates', () => {
        render(<ClassBuilderPage />);
        act(() => { injectCourses([twoAssocCourse()]); });

        expect(screen.getByText('1 / 2')).toBeInTheDocument();

        act(() => { fireEvent.click(screen.getByLabelText('Next configuration')); });
        expect(screen.getByText('2 / 2')).toBeInTheDocument();

        act(() => { fireEvent.click(screen.getByLabelText('Previous configuration')); });
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it('togglePin pins and unpins a cell when clicked', () => {
        const { container } = render(<ClassBuilderPage />);
        act(() => { injectCourses([singleLecCourse()]); });

        const cell = container.querySelector('.class-cell') as HTMLElement;
        act(() => { fireEvent.click(cell); });
        expect(container.querySelectorAll('.class-cell--pinned').length).toBeGreaterThan(0);

        act(() => { fireEvent.click(cell); });
        expect(container.querySelectorAll('.class-cell--pinned').length).toBe(0);
    });

    it('handleSetAddedCourses prunes pins for courses that are removed', () => {
        const { container } = render(<ClassBuilderPage />);
        act(() => { injectCourses([singleLecCourse()]); });

        act(() => { fireEvent.click(container.querySelector('.class-cell') as HTMLElement); });
        expect(container.querySelectorAll('.class-cell--pinned').length).toBeGreaterThan(0);

        act(() => { injectCourses([]); });
        expect(container.querySelectorAll('.class-cell--pinned').length).toBe(0);
        expect(screen.getByText('0 hours/week')).toBeInTheDocument();
    });

    it('online sections (classStartTime 00.00.00) are not rendered on the grid', () => {
        const { container } = render(<ClassBuilderPage />);
        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [makeSection({
                    classNumber: "9001", classStartTime: "00.00.00", classEndTime: "00.00.00",
                    mondays: "N", tuesdays: "N", wednesdays: "N", thursdays: "N",
                    fridays: "N", saturdays: "N", sundays: "N",
                })],
            }]);
        });

        expect(container.querySelectorAll('.class-cell').length).toBe(0);
        expect(screen.getByText('0 hours/week')).toBeInTheDocument();
    });
});

// ─── Conflict filtering ───────────────────────────────────────────────────────

describe('ClassBuilderPage conflict filtering', () => {
    beforeEach(() => vi.clearAllMocks());

    it('a single course with no overlapping sections renders normally', () => {
        const { container } = render(<ClassBuilderPage />);
        act(() => { injectCourses([singleLecCourse()]); });

        expect(container.querySelectorAll('.class-cell').length).toBeGreaterThan(0);
        expect(screen.queryByText('No Valid Schedules')).not.toBeInTheDocument();
    });

    it('two courses that do not overlap both appear on the schedule', () => {
        const { container } = render(<ClassBuilderPage />);
        act(() => {
            injectCourses([
                // Monday 08:00–10:00
                { code: "COMP 352", title: "DATA STRUCTURES", sections: [makeSection({ classNumber: "1001", mondays: "Y", wednesdays: "N", classStartTime: "08.00.00", classEndTime: "10.00.00" })] },
                // Monday 11:00–13:00 — no overlap
                { code: "COMP 474", title: "AI", sections: [makeSection({ classNumber: "2001", mondays: "Y", wednesdays: "N", classStartTime: "11.00.00", classEndTime: "13.00.00" })] },
            ]);
        });

        expect(container.querySelectorAll('.class-cell').length).toBeGreaterThan(0);
        expect(screen.queryByText('No Valid Schedules')).not.toBeInTheDocument();
    });

    it('two courses that fully overlap produce no valid configs and show the modal', () => {
        render(<ClassBuilderPage />);
        act(() => {
            injectCourses([
                // Monday 09:00–11:00
                { code: "COMP 352", title: "DATA STRUCTURES", sections: [makeSection({ classNumber: "1001", mondays: "Y", wednesdays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" })] },
                // Monday 09:00–11:00 — exact same slot
                conflictingCourse("2001", "09.00.00", "11.00.00"),
            ]);
        });

        expect(screen.getByText('No Valid Schedules')).toBeInTheDocument();
    });

    it('two courses that partially overlap also produce no valid configs', () => {
        render(<ClassBuilderPage />);
        act(() => {
            injectCourses([
                // Monday 09:00–11:00
                { code: "COMP 352", title: "DATA STRUCTURES", sections: [makeSection({ classNumber: "1001", mondays: "Y", wednesdays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" })] },
                // Monday 10:00–12:00 — one hour overlap
                conflictingCourse("2001", "10.00.00", "12.00.00"),
            ]);
        });

        expect(screen.getByText('No Valid Schedules')).toBeInTheDocument();
    });

    it('the schedule is blank (no class cells) when there are no valid configs', () => {
        const { container } = render(<ClassBuilderPage />);
        act(() => {
            injectCourses([
                { code: "COMP 352", title: "DATA STRUCTURES", sections: [makeSection({ classNumber: "1001", mondays: "Y", wednesdays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" })] },
                conflictingCourse("2001", "09.00.00", "11.00.00"),
            ]);
        });

        expect(container.querySelectorAll('.class-cell').length).toBe(0);
    });

    it('stats show 0 hours and 0 courses when there are no valid configs', () => {
        render(<ClassBuilderPage />);
        act(() => {
            injectCourses([
                { code: "COMP 352", title: "DATA STRUCTURES", sections: [makeSection({ classNumber: "1001", mondays: "Y", wednesdays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" })] },
                conflictingCourse("2001", "09.00.00", "11.00.00"),
            ]);
        });

        expect(screen.getByText('0 hours/week')).toBeInTheDocument();
        expect(screen.getByText('0 courses')).toBeInTheDocument();
    });

    it('nav arrows are hidden when there are no valid configs', () => {
        render(<ClassBuilderPage />);
        act(() => {
            injectCourses([
                { code: "COMP 352", title: "DATA STRUCTURES", sections: [makeSection({ classNumber: "1001", mondays: "Y", wednesdays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" })] },
                conflictingCourse("2001", "09.00.00", "11.00.00"),
            ]);
        });

        expect(screen.queryByLabelText('Previous configuration')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Next configuration')).not.toBeInTheDocument();
    });

    it('two courses on different days with the same time do not conflict', () => {
        const { container } = render(<ClassBuilderPage />);
        act(() => {
            injectCourses([
                // Monday only 09:00–11:00
                { code: "COMP 352", title: "DATA STRUCTURES", sections: [makeSection({ classNumber: "1001", mondays: "Y", tuesdays: "N", wednesdays: "N", thursdays: "N", fridays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" })] },
                // Tuesday only 09:00–11:00
                { code: "COMP 474", title: "AI", sections: [makeSection({ classNumber: "2001", mondays: "N", tuesdays: "Y", wednesdays: "N", thursdays: "N", fridays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" })] },
            ]);
        });

        expect(container.querySelectorAll('.class-cell').length).toBeGreaterThan(0);
        expect(screen.queryByText('No Valid Schedules')).not.toBeInTheDocument();
    });

    it('when one association conflicts but another does not, valid configs still exist', () => {
        const { container } = render(<ClassBuilderPage />);
        act(() => {
            injectCourses([
                // Course A: two associations — assoc 1 conflicts with Course B, assoc 2 does not
                {
                    code: "COMP 352", title: "DATA STRUCTURES",
                    sections: [
                        makeSection({ classNumber: "1001", classAssociation: "1", mondays: "Y", wednesdays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" }),
                        makeSection({ classNumber: "1002", classAssociation: "2", mondays: "Y", wednesdays: "N", classStartTime: "14.00.00", classEndTime: "16.00.00" }),
                    ],
                },
                // Course B: Monday 09:00–11:00 — conflicts with assoc 1 only
                conflictingCourse("2001", "09.00.00", "11.00.00"),
            ]);
        });

        expect(container.querySelectorAll('.class-cell').length).toBeGreaterThan(0);
        expect(screen.queryByText('No Valid Schedules')).not.toBeInTheDocument();
    });
});

// ─── No-valid-configs modal ───────────────────────────────────────────────────

describe('ClassBuilderPage no-valid-configs modal', () => {
    beforeEach(() => vi.clearAllMocks());

    const injectConflict = () => {
        injectCourses([
            { code: "COMP 352", title: "DATA STRUCTURES", sections: [makeSection({ classNumber: "1001", mondays: "Y", wednesdays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" })] },
            conflictingCourse("2001", "09.00.00", "11.00.00"),
        ]);
    };

    it('shows the modal with the correct title and body when all configs conflict', () => {
        render(<ClassBuilderPage />);
        act(() => { injectConflict(); });

        expect(screen.getByText('No Valid Schedules')).toBeInTheDocument();
        expect(screen.getByText(/Every possible combination/)).toBeInTheDocument();
        expect(screen.getByText(/time conflict/)).toBeInTheDocument();
    });

    it('dismisses the modal when "Got it" is clicked', () => {
        render(<ClassBuilderPage />);
        act(() => { injectConflict(); });

        act(() => { fireEvent.click(screen.getByText('Got it')); });
        expect(screen.queryByText('No Valid Schedules')).not.toBeInTheDocument();
    });

    it('dismisses the modal when clicking the overlay background', () => {
        render(<ClassBuilderPage />);
        act(() => { injectConflict(); });

        act(() => { fireEvent.click(screen.getByRole('button', { name: /Previous|Next|Got it|inject|change/i, hidden: true })); });
        // click the overlay (first button wrapping the modal)
        const overlay = document.querySelector('.cb-conflict-overlay') as HTMLElement;
        act(() => { fireEvent.click(overlay); });
        expect(screen.queryByText('No Valid Schedules')).not.toBeInTheDocument();
    });

    it('re-shows the modal after dismissal if courses change and conflict remains', () => {
        render(<ClassBuilderPage />);
        act(() => { injectConflict(); });

        act(() => { fireEvent.click(screen.getByText('Got it')); });
        expect(screen.queryByText('No Valid Schedules')).not.toBeInTheDocument();

        // Remove all courses then re-inject a conflict — modal should reappear
        act(() => { injectCourses([]); });
        act(() => { injectConflict(); });
        expect(screen.getByText('No Valid Schedules')).toBeInTheDocument();
    });

    it('does not show modal when courses are removed and conflict is resolved', () => {
        render(<ClassBuilderPage />);
        act(() => { injectConflict(); });

        expect(screen.getByText('No Valid Schedules')).toBeInTheDocument();

        // Remove the conflicting courses entirely
        act(() => { injectCourses([]); });
        expect(screen.queryByText('No Valid Schedules')).not.toBeInTheDocument();
    });
});

// ─── ScheduledCourses panel ───────────────────────────────────────────────────

describe('ClassBuilderPage ScheduledCourses panel', () => {
    beforeEach(() => vi.clearAllMocks());

    it('shows course code and title after a course is added', () => {
        render(<ClassBuilderPage />);
        act(() => { injectCourses([singleLecCourse()]); });

        expect(screen.getByText('COMP 352')).toBeInTheDocument();
        expect(screen.getByText('DATA STRUCTURES')).toBeInTheDocument();
    });

    it('shows a remove button for each added course', () => {
        render(<ClassBuilderPage />);
        act(() => {
            injectCourses([
                singleLecCourse(),
                { code: "COMP 474", title: "AI", sections: [makeSection({ classNumber: "2001", mondays: "N", wednesdays: "Y" })] },
            ]);
        });

        expect(screen.getAllByLabelText(/Remove/).length).toBe(2);
    });

    it('removes a course and updates the schedule when its remove button is clicked', () => {
        render(<ClassBuilderPage />);
        act(() => { injectCourses([singleLecCourse()]); });

        expect(screen.getByText('COMP 352')).toBeInTheDocument();

        act(() => { fireEvent.click(screen.getByLabelText('Remove COMP 352')); });

        expect(screen.queryByText('COMP 352')).not.toBeInTheDocument();
        expect(screen.getByText('No courses added yet.')).toBeInTheDocument();
        expect(screen.getByText('0 hours/week')).toBeInTheDocument();
    });

    it('removing the conflicting course resolves the conflict and clears the modal', () => {
        render(<ClassBuilderPage />);
        act(() => {
            injectCourses([
                singleLecCourse(),
                conflictingCourse("2001", "08.00.00", "10.00.00"),
            ]);
        });

        expect(screen.getByText('No Valid Schedules')).toBeInTheDocument();

        act(() => { fireEvent.click(screen.getByLabelText('Remove COMP 474')); });

        expect(screen.queryByText('No Valid Schedules')).not.toBeInTheDocument();
        expect(screen.getByText('COMP 352')).toBeInTheDocument();
    });
});

// ─── Semester change ──────────────────────────────────────────────────────────

describe('ClassBuilderPage semester change', () => {
    it('clears all added courses when the semester changes', () => {
        render(<ClassBuilderPage />);
        act(() => { injectCourses([singleLecCourse()]); });

        expect(screen.getByText('COMP 352')).toBeInTheDocument();

        act(() => { fireEvent.click(screen.getByTestId('change-semester')); });

        expect(screen.queryByText('COMP 352')).not.toBeInTheDocument();
        expect(screen.getByText('No courses added yet.')).toBeInTheDocument();
    });
});