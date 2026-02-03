import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ScheduledCourses from '../../../components/ClassBuilderComponents/ScheduledCourses';
import type { ClassItem } from '../../../pages/ClassBuilderPage';

describe('ScheduledCourses', () => {
    const mockSetClasses = vi.fn();

    const mockClasses: ClassItem[] = [
        { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
        { name: "COMP 352", section: "Sec A", room: "H-637", day: 3, startTime: 9, endTime: 11 },
        { name: "COMP 346", section: "Sec B", room: "MB-2.210", day: 2, startTime: 10, endTime: 12 },
        { name: "SOEN 341", section: "Sec C", room: "H-537", day: 1, startTime: 13, endTime: 15 },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the component title', () => {
        render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        expect(screen.getByText('Scheduled Courses')).toBeInTheDocument();
    });

    it('groups classes correctly by course, section, room, and time', () => {
        render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        // COMP 352 appears on Mon and Wed, should be grouped
        const comp352Elements = screen.getAllByText('COMP 352');
        // Should appear once as a grouped course
        expect(comp352Elements.length).toBe(1);
    });

    it('displays course name', () => {
        render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        expect(screen.getByText('COMP 352')).toBeInTheDocument();
        expect(screen.getByText('COMP 346')).toBeInTheDocument();
        expect(screen.getByText('SOEN 341')).toBeInTheDocument();
    });

    it('displays course section', () => {
        render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        expect(screen.getByText('Sec A')).toBeInTheDocument();
        expect(screen.getByText('Sec B')).toBeInTheDocument();
        expect(screen.getByText('Sec C')).toBeInTheDocument();
    });

    it('displays course room', () => {
        render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        expect(screen.getByText('H-637')).toBeInTheDocument();
        expect(screen.getByText('MB-2.210')).toBeInTheDocument();
        expect(screen.getByText('H-537')).toBeInTheDocument();
    });

    it('formats time correctly', () => {
        render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        expect(screen.getByText(/Mon, Wed 09:00-11:00/)).toBeInTheDocument();
        expect(screen.getByText(/Tue 10:00-12:00/)).toBeInTheDocument();
    });

    it('formats single-digit hours with leading zero', () => {
        const earlyClass: ClassItem[] = [
            { name: "EARLY", section: "A", room: "R1", day: 1, startTime: 8, endTime: 9 }
        ];
        render(<ScheduledCourses classes={earlyClass} setClasses={mockSetClasses} />);
        expect(screen.getByText(/08:00-09:00/)).toBeInTheDocument();
    });

    it('displays day names correctly', () => {
        render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        // COMP 352 is on Mon and Wed
        expect(screen.getByText(/Mon, Wed/)).toBeInTheDocument();
        // COMP 346 is on Tue
        expect(screen.getByText(/Tue/)).toBeInTheDocument();
    });

    it('renders delete button for each course', () => {
        render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        const deleteButtons = screen.getAllByLabelText(/Remove/);
        expect(deleteButtons.length).toBe(3); // 3 unique courses
    });

    it('calls setClasses when delete button is clicked', () => {
        render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        const deleteButton = screen.getByLabelText('Remove COMP 352');
        fireEvent.click(deleteButton);
        expect(mockSetClasses).toHaveBeenCalledTimes(1);
    });

    it('removes correct course when delete is clicked', () => {
        render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        const deleteButton = screen.getByLabelText('Remove COMP 352');
        fireEvent.click(deleteButton);

        const callArg = mockSetClasses.mock.calls[0][0];
        // Should have removed both COMP 352 entries (Mon and Wed)
        expect(callArg.filter((c: ClassItem) => c.name === 'COMP 352').length).toBe(0);
        // Should still have COMP 346 and SOEN 341
        expect(callArg.length).toBe(2);
    });

    it('handles empty classes array', () => {
        render(<ScheduledCourses classes={[]} setClasses={mockSetClasses} />);
        expect(screen.getByText('Scheduled Courses')).toBeInTheDocument();
        expect(screen.queryByText('COMP 352')).not.toBeInTheDocument();
    });

    it('groups multiple days for the same course correctly', () => {
        const multiDay: ClassItem[] = [
            { name: "MULTI", section: "A", room: "R1", day: 1, startTime: 9, endTime: 10 },
            { name: "MULTI", section: "A", room: "R1", day: 2, startTime: 9, endTime: 10 },
            { name: "MULTI", section: "A", room: "R1", day: 3, startTime: 9, endTime: 10 },
        ];
        render(<ScheduledCourses classes={multiDay} setClasses={mockSetClasses} />);
        expect(screen.getByText(/Mon, Tue, Wed/)).toBeInTheDocument();
    });

    it('does not group courses with different times', () => {
        const differentTimes: ClassItem[] = [
            { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
            { name: "COMP 352", section: "Sec A", room: "H-637", day: 3, startTime: 10, endTime: 12 },
        ];
        render(<ScheduledCourses classes={differentTimes} setClasses={mockSetClasses} />);
        const comp352Elements = screen.getAllByText('COMP 352');
        expect(comp352Elements.length).toBe(2);
    });

    it('does not group courses with different rooms', () => {
        const differentRooms: ClassItem[] = [
            { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
            { name: "COMP 352", section: "Sec A", room: "H-638", day: 3, startTime: 9, endTime: 11 },
        ];
        render(<ScheduledCourses classes={differentRooms} setClasses={mockSetClasses} />);
        const comp352Elements = screen.getAllByText('COMP 352');
        expect(comp352Elements.length).toBe(2);
    });

    it('does not group courses with different sections', () => {
        const differentSections: ClassItem[] = [
            { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
            { name: "COMP 352", section: "Sec B", room: "H-637", day: 3, startTime: 9, endTime: 11 },
        ];
        render(<ScheduledCourses classes={differentSections} setClasses={mockSetClasses} />);
        const comp352Elements = screen.getAllByText('COMP 352');
        expect(comp352Elements.length).toBe(2);
    });

    it('renders course items with correct CSS classes', () => {
        const { container } = render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        const courseItems = container.querySelectorAll('.course-item');
        expect(courseItems.length).toBe(3);
    });

    it('renders all icons for each course', () => {
        const { container } = render(<ScheduledCourses classes={mockClasses} setClasses={mockSetClasses} />);
        const rows = container.querySelectorAll('.course-item__row');
        // Each course should have 3 rows (section, time, room)
        expect(rows.length).toBe(9); // 3 courses × 3 rows each
    });

    it('handles courses on Sunday correctly', () => {
        const sundayClass: ClassItem[] = [
            { name: "SUN", section: "A", room: "R1", day: 0, startTime: 9, endTime: 10 }
        ];
        render(<ScheduledCourses classes={sundayClass} setClasses={mockSetClasses} />);
        expect(screen.getByText(/Sun/)).toBeInTheDocument();
    });

    it('handles courses on Saturday correctly', () => {
        const saturdayClass: ClassItem[] = [
            { name: "SAT", section: "A", room: "R1", day: 6, startTime: 9, endTime: 10 }
        ];
        render(<ScheduledCourses classes={saturdayClass} setClasses={mockSetClasses} />);
        expect(screen.getByText(/Sat/)).toBeInTheDocument();
    });

    it('removes all instances of a course when delete is clicked', () => {
        const duplicateCourse: ClassItem[] = [
            { name: "DUP", section: "A", room: "R1", day: 1, startTime: 9, endTime: 10 },
            { name: "DUP", section: "A", room: "R1", day: 2, startTime: 9, endTime: 10 },
            { name: "DUP", section: "A", room: "R1", day: 3, startTime: 9, endTime: 10 },
            { name: "OTHER", section: "B", room: "R2", day: 4, startTime: 10, endTime: 11 },
        ];
        render(<ScheduledCourses classes={duplicateCourse} setClasses={mockSetClasses} />);
        const deleteButton = screen.getByLabelText('Remove DUP');
        fireEvent.click(deleteButton);

        const callArg = mockSetClasses.mock.calls[0][0];
        expect(callArg.filter((c: ClassItem) => c.name === 'DUP').length).toBe(0);
        expect(callArg.length).toBe(1);
    });
});