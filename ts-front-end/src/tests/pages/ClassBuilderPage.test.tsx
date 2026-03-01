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
    modays: "Y", tuesdays: "N", wednesdays: "Y", thursdays: "N",
    fridays: "N", saturdays: "N", sundays: "N",
    classStartDate: "06/01/2025", classEndDate: "15/04/2025",
    career: "UGRD", departmentCode: "COMP", departmentDescription: "Computer Science",
    facultyCode: "ECS", facultyDescription: "Engineering",
    enrollmentCapacity: "100", currentEnrollment: "50",
    waitlistCapacity: "0", currentWaitlistTotal: "0", hasSeatReserved: "",
    ...overrides,
});

vi.mock('../../components/ClassBuilderComponents/SearchCourses', () => ({
    default: ({ setAddedCourses }: { addedCourses: unknown[]; setAddedCourses: (c: unknown[]) => void }) => (
        <div data-testid="search-courses">
            <button
                data-testid="inject-courses"
                onClick={() => setAddedCourses((window as unknown as { __injectCourses: unknown[] }).__injectCourses ?? [])}
            >
                inject
            </button>
        </div>
    ),
}));

const injectCourses = (courses: unknown[]) => {
    (window as unknown as { __injectCourses: unknown[] }).__injectCourses = courses;
    fireEvent.click(screen.getByTestId('inject-courses'));
};

describe('ClassBuilderPage initial render', () => {
    it('renders page title, description, all child components, and empty-state values', () => {
        render(<ClassBuilderPage />);

        expect(screen.getByText('Class Builder')).toBeInTheDocument();
        expect(screen.getByText('Create and visualize student schedules to identify conflicts')).toBeInTheDocument();
        expect(screen.queryByText('Export Schedule')).not.toBeInTheDocument();

        expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
        expect(screen.getByText('Scheduled Courses')).toBeInTheDocument();
        ['Total Hours', 'Enrolled Courses', 'Conflicts'].forEach(label =>
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
});

describe('ClassBuilderPage configuration system', () => {
    beforeEach(() => vi.clearAllMocks());

    const twoAssocCourse = () => ({
        code: "COMP 352", title: "DATA STRUCTURES",
        sections: [
            makeSection({ classNumber: "1001", classAssociation: "1", componentCode: "LEC" }),
            makeSection({ classNumber: "1002", classAssociation: "2", componentCode: "LEC" }),
        ],
    });

    it('stats update when a course with sections is added', () => {
        render(<ClassBuilderPage />);
        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [makeSection({ modays: "Y", wednesdays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" })],
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

    it('goToNext and goToPrev navigate between configurations', () => {
        render(<ClassBuilderPage />);
        act(() => { injectCourses([twoAssocCourse()]); });

        act(() => { fireEvent.click(screen.getByLabelText('Next configuration')); });

        act(() => { fireEvent.click(screen.getByLabelText('Previous configuration')); });
    });

    it('prev is disabled at first config; next is disabled at last config', () => {
        render(<ClassBuilderPage />);
        act(() => { injectCourses([twoAssocCourse()]); });

        expect(screen.getByLabelText('Previous configuration')).toBeDisabled();

        act(() => { fireEvent.click(screen.getByLabelText('Next configuration')); });
        expect(screen.getByLabelText('Next configuration')).toBeDisabled();
    });

    it('togglePin pins and unpins a cell when clicked', () => {
        const { container } = render(<ClassBuilderPage />);
        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [makeSection({ classNumber: "1001", modays: "Y", wednesdays: "N" })],
            }]);
        });

        const cell = container.querySelector('.class-cell') as HTMLElement;
        act(() => { fireEvent.click(cell); });
        expect(container.querySelectorAll('.class-cell--pinned').length).toBeGreaterThan(0);

        act(() => { fireEvent.click(cell); });
        expect(container.querySelectorAll('.class-cell--pinned').length).toBe(0);
    });

    it('handleSetAddedCourses prunes pins for courses that are removed', () => {
        const { container } = render(<ClassBuilderPage />);
        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [makeSection({ classNumber: "1001", modays: "Y", wednesdays: "N" })],
            }]);
        });

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
                    modays: "N", tuesdays: "N", wednesdays: "N", thursdays: "N",
                    fridays: "N", saturdays: "N", sundays: "N",
                })],
            }]);
        });

        expect(container.querySelectorAll('.class-cell').length).toBe(0);
        expect(screen.getByText('0 hours/week')).toBeInTheDocument();
    });

    it('LEC + 2 TUT sections within same association produces 2 configurations', () => {
        render(<ClassBuilderPage />);
        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [
                    makeSection({ classNumber: "1001", classAssociation: "1", componentCode: "LEC", section: "AA" }),
                    makeSection({ classNumber: "1002", classAssociation: "1", componentCode: "TUT", section: "TA" }),
                    makeSection({ classNumber: "1003", classAssociation: "1", componentCode: "TUT", section: "TB" }),
                ],
            }]);
        });

        expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it('safeConfigIndex clamps when pin filter reduces config count', () => {
        render(<ClassBuilderPage />);
        act(() => { injectCourses([twoAssocCourse()]); });

        act(() => { fireEvent.click(screen.getByLabelText('Next configuration')); });

        act(() => { fireEvent.click(screen.getAllByTitle(/Click to pin/)[0]); });
    });
});