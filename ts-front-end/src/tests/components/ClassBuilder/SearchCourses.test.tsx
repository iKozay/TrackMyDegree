import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SearchCourses from '../../../components/ClassBuilderComponents/SearchCourses';
import type { AddedCourse, CourseSection } from '../../../types/classItem';

vi.mock('../../../api/http-api-client', () => ({ api: { get: vi.fn() } }));
import { api } from '../../../api/http-api-client';
const mockApiGet = api.get as ReturnType<typeof vi.fn>;

const defaultProps = {
    addedCourses: [] as AddedCourse[],
    setAddedCourses: vi.fn(),
};

const makeSection = (overrides: Partial<CourseSection> = {}): CourseSection => ({
    courseID: "1", termCode: "2251", session: "1", subject: "COMP", catalog: "352",
    section: "AA", componentCode: "LEC", componentDescription: "Lecture",
    classNumber: "1001", classAssociation: "1", courseTitle: "DATA STRUCTURES",
    topicID: "", topicDescription: "", classStatus: "Active",
    locationCode: "SGW", instructionModeCode: "P", instructionModeDescription: "In Person",
    meetingPatternNumber: "1", roomCode: "H637", buildingCode: "H", room: "H-637",
    classStartTime: "08.45.00", classEndTime: "10.00.00",
    mondays: "Y", tuesdays: "N", wednesdays: "N", thursdays: "N",
    fridays: "N", saturdays: "N", sundays: "N",
    classStartDate: "06/01/2025", classEndDate: "15/04/2025",
    career: "UGRD", departmentCode: "COMP", departmentDescription: "Computer Science",
    facultyCode: "ECS", facultyDescription: "Engineering",
    enrollmentCapacity: "100", currentEnrollment: "50",
    waitlistCapacity: "0", currentWaitlistTotal: "0", hasSeatReserved: "",
    ...overrides,
});

const searchFor = (query: string) => {
    fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: query } });
    fireEvent.click(screen.getByText('Search'));
};


describe('SearchCourses rendering', () => {
    it('renders title, labels, semester select, search input, and Search button', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Search & Add Courses')).toBeInTheDocument();
        expect(screen.getByText('Select Semester')).toBeInstanceOf(HTMLLabelElement);
        expect(screen.getByText('Search for Courses')).toBeInstanceOf(HTMLLabelElement);
        expect(screen.getByDisplayValue('Summer 2025')).toBeInstanceOf(HTMLSelectElement);
        expect(screen.getByPlaceholderText('Search by course code or name...')).toBeInstanceOf(HTMLInputElement);
        expect(screen.getByText('Search')).toBeDisabled();
    });

    it('renders all semester options for the current academic year', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('option[value="summer-2025"]')?.textContent).toBe('Summer 2025');
        expect(container.querySelector('option[value="fall-2025"]')?.textContent).toBe('Fall 2025');
        expect(container.querySelector('option[value="winter-2026"]')?.textContent).toBe('Winter 2026');
    });

    it('renders two aria-hidden icons inside the card', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBe(2);
    });
});


describe('SearchCourses input interaction', () => {
    it('Search button enables on non-whitespace input and disables again on clear', () => {
        render(<SearchCourses {...defaultProps} />);
        const input = screen.getByPlaceholderText('Search by course code or name...');

        fireEvent.change(input, { target: { value: 'COMP 352' } });
        expect(screen.getByText('Search')).not.toBeDisabled();

        fireEvent.change(input, { target: { value: '   ' } });
        expect(screen.getByText('Search')).toBeDisabled();
    });

    it('typing updates the input value', () => {
        render(<SearchCourses {...defaultProps} />);
        const input = screen.getByPlaceholderText('Search by course code or name...') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'SOEN 341' } });
        expect(input.value).toBe('SOEN 341');
    });

    it('changing semester updates the select value', () => {
        render(<SearchCourses {...defaultProps} />);
        const select = screen.getByDisplayValue('Summer 2025') as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'fall-2025' } });
        expect(select.value).toBe('fall-2025');
    });

    it('pressing Enter triggers a search; non-Enter key does not', async () => {
        mockApiGet.mockResolvedValueOnce([]);
        render(<SearchCourses {...defaultProps} />);
        const input = screen.getByPlaceholderText('Search by course code or name...');
        fireEvent.change(input, { target: { value: 'COMP 352' } });

        fireEvent.keyDown(input, { key: 'a' });
        expect(mockApiGet).not.toHaveBeenCalled();

        fireEvent.keyDown(input, { key: 'Enter' });
        await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(1));
    });
});

describe('SearchCourses API and modals', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('shows "Course Not Found" when API returns empty array, naming the queried course', async () => {
        mockApiGet.mockResolvedValueOnce([]);
        render(<SearchCourses {...defaultProps} />);
        searchFor('COMP 999');

        await waitFor(() => expect(screen.getByText('Course Not Found')).toBeInTheDocument());
        expect(screen.getByText(/COMP 999/)).toBeInTheDocument();
    });

    it('shows "Course Not Available" when no sections match active term, mentioning the semester', async () => {
        mockApiGet.mockResolvedValueOnce([makeSection({ termCode: "9999" })]);
        render(<SearchCourses {...defaultProps} />);
        searchFor('COMP 352');

        await waitFor(() => expect(screen.getByText('Course Not Available')).toBeInTheDocument());
        expect(document.querySelector('.sc-modal__body')?.textContent).toMatch(/Summer 2025/);
    });

    it('shows "Course Already Added" modal without calling API for duplicate courses', async () => {
        const existing: AddedCourse[] = [{ code: "COMP 352", title: "DATA STRUCTURES", sections: [] }];
        render(<SearchCourses addedCourses={existing} setAddedCourses={vi.fn()} />);
        searchFor('COMP 352');

        await waitFor(() => expect(screen.getByText('Course Already Added')).toBeInTheDocument());
        expect(mockApiGet).not.toHaveBeenCalled();
    });

    it('dismisses modal via "Got it" button or overlay click', async () => {
        mockApiGet.mockResolvedValueOnce([]);
        render(<SearchCourses {...defaultProps} />);
        searchFor('COMP 999');

        await waitFor(() => expect(screen.getByText('Course Not Found')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Got it'));
        expect(screen.queryByText('Course Not Found')).not.toBeInTheDocument();

        mockApiGet.mockResolvedValueOnce([]);
        searchFor('COMP 999');
        await waitFor(() => expect(screen.getByText('Course Not Found')).toBeInTheDocument());
        fireEvent.click(document.querySelector('.sc-modal-overlay') as HTMLElement);
        expect(screen.queryByText('Course Not Found')).not.toBeInTheDocument();
    });

    it('shows "Searching…" and disables button while loading', async () => {
        mockApiGet.mockReturnValueOnce(new Promise(() => { }));
        render(<SearchCourses {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 352' } });

        act(() => { fireEvent.click(screen.getByText('Search')); });

        const btn = screen.getByText('Searching...');
        expect(btn).toBeInTheDocument();
        expect(btn).toBeDisabled();
    });

    it('calls API with correct subject/catalog, adds course, clears input, and filters inactive sections', async () => {
        const setAddedCourses = vi.fn();
        mockApiGet.mockResolvedValueOnce([
            makeSection({ termCode: "2251", classStatus: "Active", courseTitle: "DATA STRUCTURES" }),
            makeSection({ classNumber: "1002", termCode: "2251", classStatus: "Cancelled Section" }),
        ]);

        render(<SearchCourses addedCourses={[]} setAddedCourses={setAddedCourses} />);
        const input = screen.getByPlaceholderText('Search by course code or name...') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'comp 352' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => expect(setAddedCourses).toHaveBeenCalledTimes(1));

        expect(mockApiGet).toHaveBeenCalledWith(
            expect.stringMatching(/subject=COMP.*catalog=352|catalog=352.*subject=COMP/),
            expect.anything()
        );

        const [newList] = setAddedCourses.mock.calls[0];
        expect(newList).toHaveLength(1);
        expect(newList[0].code).toBe('COMP 352');
        expect(newList[0].title).toBe('DATA STRUCTURES');
        expect(newList[0].sections).toHaveLength(1);
        expect(input.value).toBe('');
    });

    it('appends new course to existing list', async () => {
        const existing: AddedCourse[] = [{ code: "SOEN 341", title: "SOFTWARE PROCESS", sections: [] }];
        const setAddedCourses = vi.fn();
        mockApiGet.mockResolvedValueOnce([
            makeSection({ termCode: "2251", classStatus: "Active", subject: "COMP", catalog: "352", courseTitle: "DATA STRUCTURES" }),
        ]);

        render(<SearchCourses addedCourses={existing} setAddedCourses={setAddedCourses} />);
        searchFor('COMP 352');

        await waitFor(() => expect(setAddedCourses).toHaveBeenCalledTimes(1));
        const [newList] = setAddedCourses.mock.calls[0];
        expect(newList).toHaveLength(2);
        expect(newList[0].code).toBe('SOEN 341');
        expect(newList[1].code).toBe('COMP 352');
    });

    it('shows "Course Not Available" when all sections are inactive for the matching term', async () => {
        mockApiGet.mockResolvedValueOnce([makeSection({ termCode: "2251", classStatus: "Cancelled Section" })]);
        const setAddedCourses = vi.fn();
        render(<SearchCourses addedCourses={[]} setAddedCourses={setAddedCourses} />);
        searchFor('COMP 352');

        await waitFor(() => expect(screen.getByText('Course Not Available')).toBeInTheDocument());
        expect(setAddedCourses).not.toHaveBeenCalled();
    });
});