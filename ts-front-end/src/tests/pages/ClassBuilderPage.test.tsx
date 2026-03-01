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

describe('ClassBuilderPage', () => {
    it('renders the page title', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByText('Class Builder')).toBeInTheDocument();
    });

    it('renders the page description', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByText('Create and visualize student schedules to identify conflicts')).toBeInTheDocument();
    });

    it('does not render the Export Schedule button (currently commented out)', () => {
        render(<ClassBuilderPage />);
        expect(screen.queryByText('Export Schedule')).not.toBeInTheDocument();
    });

    it('renders WeeklySchedule component', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
    });

    it('renders ScheduleStats component', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByText('Total Hours')).toBeInTheDocument();
        expect(screen.getByText('Enrolled Courses')).toBeInTheDocument();
        expect(screen.getByText('Conflicts')).toBeInTheDocument();
    });

    it('renders ScheduledCourses component', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByText('Scheduled Courses')).toBeInTheDocument();
    });

    it('renders SearchCourses component', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByText('Search & Add Courses')).toBeInTheDocument();
    });

    it('initializes with empty course list', () => {
        render(<ClassBuilderPage />);
        expect(screen.queryByText('COMP 352')).not.toBeInTheDocument();
        expect(screen.queryByText('COMP 346')).not.toBeInTheDocument();
        expect(screen.queryByText('SOEN 341')).not.toBeInTheDocument();
    });

    it('displays initial stat values for empty schedule', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByText('0 hours/week')).toBeInTheDocument();
        expect(screen.getByText('0 courses')).toBeInTheDocument();
    });

    it('shows empty state message in scheduled courses sidebar', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByText('No courses added yet.')).toBeInTheDocument();
    });

    it('has correct layout structure', () => {
        const { container } = render(<ClassBuilderPage />);
        expect(container.querySelector('main')).toHaveClass('flex-1', 'overflow-auto');
    });

    it('has responsive padding classes', () => {
        const { container } = render(<ClassBuilderPage />);
        expect(container.querySelector('.p-4.sm\\:p-8')).toBeInTheDocument();
    });

    it('has max-width container', () => {
        const { container } = render(<ClassBuilderPage />);
        expect(container.querySelector('.max-w-7xl')).toBeInTheDocument();
    });

    it('has correct grid layout for schedule and sidebar', () => {
        const { container } = render(<ClassBuilderPage />);
        expect(container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-4')).toBeInTheDocument();
    });

    it('schedule takes 3 columns on large screens', () => {
        const { container } = render(<ClassBuilderPage />);
        expect(container.querySelector('.lg\\:col-span-3')).toBeInTheDocument();
    });

    it('sidebar has space-y-6 class', () => {
        const { container } = render(<ClassBuilderPage />);
        expect(container.querySelector('.space-y-6')).toBeInTheDocument();
    });

    it('header has responsive layout classes', () => {
        const { container } = render(<ClassBuilderPage />);
        expect(container.querySelector('.flex.flex-col.sm\\:flex-row')).toBeInTheDocument();
    });

    it('renders all days of the week in schedule', () => {
        render(<ClassBuilderPage />);
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            expect(screen.getByText(day)).toBeInTheDocument();
        });
    });

    it('renders semester selector with Summer 2025 as default', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByDisplayValue('Summer 2025')).toBeInTheDocument();
    });

    it('renders search input', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByPlaceholderText('Search by course code or name...')).toBeInTheDocument();
    });

    it('renders no delete buttons in empty sidebar', () => {
        render(<ClassBuilderPage />);
        expect(screen.queryByLabelText(/Remove/)).not.toBeInTheDocument();
    });
});

describe('ClassBuilderPage configuration system', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const injectCourses = (courses: unknown[]) => {
        (window as unknown as { __injectCourses: unknown[] }).__injectCourses = courses;
        fireEvent.click(screen.getByTestId('inject-courses'));
    };

    it('stats update when a course with sections is added', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByText('0 hours/week')).toBeInTheDocument();

        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [makeSection({ modays: "Y", wednesdays: "N", classStartTime: "09.00.00", classEndTime: "11.00.00" })],
            }]);
        });

        // 1 section × 1 day × 2 hours = 2 hours/week
        expect(screen.getByText('2 hours/week')).toBeInTheDocument();
        expect(screen.getByText('1 course')).toBeInTheDocument();
    });

    it('totalConfigs > 1 when course has multiple LEC sections', () => {
        render(<ClassBuilderPage />);

        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [
                    makeSection({ classNumber: "1001", section: "AA", classAssociation: "1", componentCode: "LEC", modays: "Y", wednesdays: "N" }),
                    makeSection({ classNumber: "1002", section: "AB", classAssociation: "2", componentCode: "LEC", modays: "N", tuesdays: "Y" }),
                ],
            }]);
        });

        // 2 separate associations → 2 configurations → nav arrows should appear
        expect(screen.getByLabelText('Previous configuration')).toBeInTheDocument();
        expect(screen.getByLabelText('Next configuration')).toBeInTheDocument();
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it('goToNext advances the config index', () => {
        render(<ClassBuilderPage />);

        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [
                    makeSection({ classNumber: "1001", section: "AA", classAssociation: "1", componentCode: "LEC" }),
                    makeSection({ classNumber: "1002", section: "AB", classAssociation: "2", componentCode: "LEC" }),
                ],
            }]);
        });

        expect(screen.getByText('1 / 2')).toBeInTheDocument();

        act(() => { fireEvent.click(screen.getByLabelText('Next configuration')); });
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });

    it('goToPrev decrements the config index', () => {
        render(<ClassBuilderPage />);

        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [
                    makeSection({ classNumber: "1001", section: "AA", classAssociation: "1", componentCode: "LEC" }),
                    makeSection({ classNumber: "1002", section: "AB", classAssociation: "2", componentCode: "LEC" }),
                ],
            }]);
        });

        act(() => { fireEvent.click(screen.getByLabelText('Next configuration')); });
        expect(screen.getByText('2 / 2')).toBeInTheDocument();

        act(() => { fireEvent.click(screen.getByLabelText('Previous configuration')); });
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it('prev button is disabled at the first configuration', () => {
        render(<ClassBuilderPage />);

        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [
                    makeSection({ classNumber: "1001", classAssociation: "1", componentCode: "LEC" }),
                    makeSection({ classNumber: "1002", classAssociation: "2", componentCode: "LEC" }),
                ],
            }]);
        });

        expect(screen.getByLabelText('Previous configuration')).toBeDisabled();
    });

    it('next button is disabled at the last configuration', () => {
        render(<ClassBuilderPage />);

        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [
                    makeSection({ classNumber: "1001", classAssociation: "1", componentCode: "LEC" }),
                    makeSection({ classNumber: "1002", classAssociation: "2", componentCode: "LEC" }),
                ],
            }]);
        });

        act(() => { fireEvent.click(screen.getByLabelText('Next configuration')); });
        expect(screen.getByLabelText('Next configuration')).toBeDisabled();
    });

    it('togglePin pins a cell (turns it green) when clicked', () => {
        const { container } = render(<ClassBuilderPage />);

        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [makeSection({ classNumber: "1001", modays: "Y", wednesdays: "N" })],
            }]);
        });

        expect(container.querySelectorAll('.class-cell--pinned').length).toBe(0);

        act(() => {
            const cell = container.querySelector('.class-cell') as HTMLElement;
            fireEvent.click(cell);
        });

        expect(container.querySelectorAll('.class-cell--pinned').length).toBeGreaterThan(0);
    });

    it('togglePin unpins a pinned cell when clicked again', () => {
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

    it('handleSetAddedCourses prunes pins for removed courses', () => {
        const { container } = render(<ClassBuilderPage />);

        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [makeSection({ classNumber: "1001", modays: "Y", wednesdays: "N" })],
            }]);
        });

        act(() => {
            const cell = container.querySelector('.class-cell') as HTMLElement;
            fireEvent.click(cell);
        });
        expect(container.querySelectorAll('.class-cell--pinned').length).toBeGreaterThan(0);

        act(() => { injectCourses([]); });

        expect(container.querySelectorAll('.class-cell--pinned').length).toBe(0);
        expect(screen.getByText('0 hours/week')).toBeInTheDocument();
    });

    it('online sections (classStartTime 00.00.00) are not shown on the grid', () => {
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

    it('cartesian product generates correct number of configurations for LEC+TUT', () => {
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

    it('safeConfigIndex clamps when configs shrink after pin filters', () => {
        render(<ClassBuilderPage />);

        act(() => {
            injectCourses([{
                code: "COMP 352", title: "DATA STRUCTURES",
                sections: [
                    makeSection({ classNumber: "1001", classAssociation: "1", componentCode: "LEC" }),
                    makeSection({ classNumber: "1002", classAssociation: "2", componentCode: "LEC" }),
                ],
            }]);
        });

        act(() => { fireEvent.click(screen.getByLabelText('Next configuration')); });
        expect(screen.getByText('2 / 2')).toBeInTheDocument();

        act(() => {
            const cells = screen.getAllByTitle(/Click to pin/);
            fireEvent.click(cells[0]);
        });

        expect(screen.getByText('1 / 1')).toBeInTheDocument();
    });
});