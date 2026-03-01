import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SearchCourses from '../../../components/ClassBuilderComponents/SearchCourses';
import type { AddedCourse, CourseSection } from '../../../types/classItem';

vi.mock('../../../api/http-api-client', () => ({
    api: { get: vi.fn() },
}));
import { api } from '../../../api/http-api-client';
const mockApiGet = api.get as ReturnType<typeof vi.fn>;

const defaultProps = {
    addedCourses: [] as AddedCourse[],
    setAddedCourses: vi.fn(),
};

describe('SearchCourses', () => {
    it('renders the component title', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Search & Add Courses')).toBeInTheDocument();
    });

    it('renders semester selection label', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Select Semester')).toBeInTheDocument();
    });

    it('renders search input label', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Search for Courses')).toBeInTheDocument();
    });

    it('renders semester select dropdown with correct default', () => {
        render(<SearchCourses {...defaultProps} />);
        const select = screen.getByDisplayValue('Summer 2025');
        expect(select).toBeInTheDocument();
        expect(select).toBeInstanceOf(HTMLSelectElement);
    });

    it('has correct default semester value', () => {
        render(<SearchCourses {...defaultProps} />);
        const select = screen.getByDisplayValue('Summer 2025') as HTMLSelectElement;
        expect(select.value).toBe('summer-2025');
    });

    it('renders search input field', () => {
        render(<SearchCourses {...defaultProps} />);
        const input = screen.getByPlaceholderText('Search by course code or name...');
        expect(input).toBeInTheDocument();
        expect(input).toBeInstanceOf(HTMLInputElement);
    });

    it('renders dropdown chevron icon', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__select-icon')).toBeInTheDocument();
    });

    it('renders search icon', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__search-icon')).toBeInTheDocument();
    });

    it('has correct CSS class on card container', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card')).toBeInTheDocument();
    });

    it('has correct CSS class on select wrapper', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__select-wrapper')).toBeInTheDocument();
    });

    it('has correct CSS class on search wrapper', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__search-wrapper')).toBeInTheDocument();
    });

    it('renders both input groups', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelectorAll('.search-courses-card__group').length).toBe(2);
    });

    it('search input has correct placeholder', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByPlaceholderText('Search by course code or name...').getAttribute('placeholder'))
            .toBe('Search by course code or name...');
    });

    it('labels are proper HTMLLabelElements', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Select Semester')).toBeInstanceOf(HTMLLabelElement);
        expect(screen.getByText('Search for Courses')).toBeInstanceOf(HTMLLabelElement);
    });

    it('renders style tag', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('style')).toBeInTheDocument();
    });

    it('select has correct CSS class', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__select')).toBeInTheDocument();
    });

    it('input has correct CSS class', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__input')).toBeInTheDocument();
    });

    it('icons are marked as aria-hidden', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBe(2);
    });

    it('renders all three semester options for academic year 2025', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('option[value="summer-2025"]')?.textContent).toBe('Summer 2025');
        expect(container.querySelector('option[value="fall-2025"]')?.textContent).toBe('Fall 2025');
        expect(container.querySelector('option[value="winter-2026"]')?.textContent).toBe('Winter 2026');
    });

    it('renders a Search button', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('Search button is disabled when input is empty', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Search')).toBeDisabled();
    });
});

const makeSection = (overrides: Partial<CourseSection> = {}): CourseSection => ({
    courseID: "1", termCode: "2251", session: "1", subject: "COMP", catalog: "352",
    section: "AA", componentCode: "LEC", componentDescription: "Lecture",
    classNumber: "1001", classAssociation: "1", courseTitle: "DATA STRUCTURES",
    topicID: "", topicDescription: "", classStatus: "Active",
    locationCode: "SGW", instructionModeCode: "P", instructionModeDescription: "In Person",
    meetingPatternNumber: "1", roomCode: "H637", buildingCode: "H", room: "H-637",
    classStartTime: "08.45.00", classEndTime: "10.00.00",
    modays: "Y", tuesdays: "N", wednesdays: "N", thursdays: "N",
    fridays: "N", saturdays: "N", sundays: "N",
    classStartDate: "06/01/2025", classEndDate: "15/04/2025",
    career: "UGRD", departmentCode: "COMP", departmentDescription: "Computer Science",
    facultyCode: "ECS", facultyDescription: "Engineering",
    enrollmentCapacity: "100", currentEnrollment: "50",
    waitlistCapacity: "0", currentWaitlistTotal: "0", hasSeatReserved: "",
    ...overrides,
});

describe('SearchCourses – input interaction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('Search button becomes enabled when input has a value', () => {
        render(<SearchCourses {...defaultProps} />);
        const input = screen.getByPlaceholderText('Search by course code or name...');
        fireEvent.change(input, { target: { value: 'COMP 352' } });
        expect(screen.getByText('Search')).not.toBeDisabled();
    });

    it('Search button is disabled again after input is cleared', () => {
        render(<SearchCourses {...defaultProps} />);
        const input = screen.getByPlaceholderText('Search by course code or name...');
        fireEvent.change(input, { target: { value: 'COMP 352' } });
        expect(screen.getByText('Search')).not.toBeDisabled();
        fireEvent.change(input, { target: { value: '' } });
        expect(screen.getByText('Search')).toBeDisabled();
    });

    it('Search button is disabled when input is only whitespace', () => {
        render(<SearchCourses {...defaultProps} />);
        const input = screen.getByPlaceholderText('Search by course code or name...');
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

    it('selecting each available semester option works', () => {
        render(<SearchCourses {...defaultProps} />);
        const select = screen.getByDisplayValue('Summer 2025') as HTMLSelectElement;
        ['summer-2025', 'fall-2025', 'winter-2026'].forEach(val => {
            fireEvent.change(select, { target: { value: val } });
            expect(select.value).toBe(val);
        });
    });
});

describe('SearchCourses – API and modals', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('shows "not found" modal when API returns empty array', async () => {
        mockApiGet.mockResolvedValueOnce([]);
        render(<SearchCourses {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 999' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(screen.getByText('Course Not Found')).toBeInTheDocument();
        });
    });

    it('"not found" modal body names the searched course', async () => {
        mockApiGet.mockResolvedValueOnce([]);
        render(<SearchCourses {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 999' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(screen.getByText(/COMP 999/)).toBeInTheDocument();
        });
    });

    it('shows "not offered" modal when API returns sections but none match active term', async () => {
        mockApiGet.mockResolvedValueOnce([makeSection({ termCode: "9999" })]);
        render(<SearchCourses {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 352' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(screen.getByText('Course Not Available')).toBeInTheDocument();
        });
    });

    it('"not offered" modal mentions the selected semester', async () => {
        mockApiGet.mockResolvedValueOnce([makeSection({ termCode: "9999" })]);
        render(<SearchCourses {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 352' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(screen.getByText(/Summer 2025/)).toBeInTheDocument();
        });
    });

    it('shows "duplicate" modal when the course is already in addedCourses', async () => {
        const existing: AddedCourse[] = [
            { code: "COMP 352", title: "DATA STRUCTURES", sections: [] },
        ];
        render(<SearchCourses addedCourses={existing} setAddedCourses={vi.fn()} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 352' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(screen.getByText('Course Already Added')).toBeInTheDocument();
        });
        expect(mockApiGet).not.toHaveBeenCalled();
    });

    it('dismisses modal when "Got it" button is clicked', async () => {
        mockApiGet.mockResolvedValueOnce([]);
        render(<SearchCourses {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 999' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => expect(screen.getByText('Course Not Found')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Got it'));
        expect(screen.queryByText('Course Not Found')).not.toBeInTheDocument();
    });

    it('dismisses modal when overlay is clicked', async () => {
        mockApiGet.mockResolvedValueOnce([]);
        render(<SearchCourses {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 999' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => expect(screen.getByText('Course Not Found')).toBeInTheDocument());

        const overlay = document.querySelector('.sc-modal-overlay') as HTMLElement;
        fireEvent.click(overlay);
        expect(screen.queryByText('Course Not Found')).not.toBeInTheDocument();
    });

    it('calls setAddedCourses with the new course on success', async () => {
        const setAddedCourses = vi.fn();
        mockApiGet.mockResolvedValueOnce([
            makeSection({ termCode: "2251", classStatus: "Active", courseTitle: "DATA STRUCTURES" }),
        ]);

        render(<SearchCourses addedCourses={[]} setAddedCourses={setAddedCourses} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 352' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(setAddedCourses).toHaveBeenCalledTimes(1);
        });

        const [newList] = setAddedCourses.mock.calls[0];
        expect(newList).toHaveLength(1);
        expect(newList[0].code).toBe('COMP 352');
        expect(newList[0].title).toBe('DATA STRUCTURES');
    });

    it('clears the input after a successful search', async () => {
        mockApiGet.mockResolvedValueOnce([
            makeSection({ termCode: "2251", classStatus: "Active" }),
        ]);

        render(<SearchCourses addedCourses={[]} setAddedCourses={vi.fn()} />);
        const input = screen.getByPlaceholderText('Search by course code or name...') as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'COMP 352' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(input.value).toBe('');
        });
    });

    it('shows "Searching…" label while loading', async () => {
        mockApiGet.mockReturnValueOnce(new Promise(() => { }));
        render(<SearchCourses {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 352' } });

        act(() => { fireEvent.click(screen.getByText('Search')); });

        expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('button is disabled while loading', async () => {
        mockApiGet.mockReturnValueOnce(new Promise(() => { }));
        render(<SearchCourses {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 352' } });

        act(() => { fireEvent.click(screen.getByText('Search')); });

        expect(screen.getByText('Searching...')).toBeDisabled();
    });

    it('pressing Enter in the input triggers a search', async () => {
        mockApiGet.mockResolvedValueOnce([]);
        render(<SearchCourses {...defaultProps} />);

        const input = screen.getByPlaceholderText('Search by course code or name...');
        fireEvent.change(input, { target: { value: 'COMP 352' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            expect(mockApiGet).toHaveBeenCalledTimes(1);
        });
    });

    it('pressing a non-Enter key does not trigger a search', async () => {
        render(<SearchCourses {...defaultProps} />);
        const input = screen.getByPlaceholderText('Search by course code or name...');
        fireEvent.change(input, { target: { value: 'COMP 352' } });
        fireEvent.keyDown(input, { key: 'a' });
        expect(mockApiGet).not.toHaveBeenCalled();
    });

    it('API is called with the correct subject and catalog extracted from input', async () => {
        mockApiGet.mockResolvedValueOnce([]);
        render(<SearchCourses {...defaultProps} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'soen 341' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(1));
        expect(mockApiGet).toHaveBeenCalledWith(
            expect.stringContaining('subject=SOEN'),
            expect.anything()
        );
        expect(mockApiGet).toHaveBeenCalledWith(
            expect.stringContaining('catalog=341'),
            expect.anything()
        );
    });

    it('filters out non-Active sections even when termCode matches', async () => {
        mockApiGet.mockResolvedValueOnce([
            makeSection({ termCode: "2251", classStatus: "Cancelled Section" }),
        ]);

        const setAddedCourses = vi.fn();
        render(<SearchCourses addedCourses={[]} setAddedCourses={setAddedCourses} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 352' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(screen.getByText('Course Not Available')).toBeInTheDocument();
        });
        expect(setAddedCourses).not.toHaveBeenCalled();
    });

    it('appends the new course to the existing list on success', async () => {
        const existing: AddedCourse[] = [
            { code: "SOEN 341", title: "SOFTWARE PROCESS", sections: [] },
        ];
        const setAddedCourses = vi.fn();
        mockApiGet.mockResolvedValueOnce([
            makeSection({ termCode: "2251", classStatus: "Active", subject: "COMP", catalog: "352", courseTitle: "DATA STRUCTURES" }),
        ]);

        render(<SearchCourses addedCourses={existing} setAddedCourses={setAddedCourses} />);

        fireEvent.change(screen.getByPlaceholderText('Search by course code or name...'), { target: { value: 'COMP 352' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => expect(setAddedCourses).toHaveBeenCalledTimes(1));

        const [newList] = setAddedCourses.mock.calls[0];
        expect(newList).toHaveLength(2);
        expect(newList[0].code).toBe('SOEN 341');
        expect(newList[1].code).toBe('COMP 352');
    });
});