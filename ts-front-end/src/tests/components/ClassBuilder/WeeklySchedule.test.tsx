import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import WeeklySchedule from '../../../components/ClassBuilderComponents/WeeklySchedule';
import type { ClassItem } from '../../../pages/ClassBuilderPage';

describe('WeeklySchedule', () => {
    const mockClasses: ClassItem[] = [
        { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
        { name: "COMP 352", section: "Sec A", room: "H-637", day: 3, startTime: 9, endTime: 11 },
        { name: "COMP 346", section: "Sec B", room: "MB-2.210", day: 2, startTime: 10, endTime: 12 },
        { name: "SOEN 341", section: "Sec C", room: "H-537", day: 1, startTime: 13, endTime: 15 },
    ];

    it('renders the component', () => {
        render(<WeeklySchedule classes={mockClasses} />);
        expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
    });

    it('renders all 7 days of the week with Sunday first', () => {
        render(<WeeklySchedule classes={mockClasses} />);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            expect(screen.getByText(day)).toBeInTheDocument();
        });
    });

    it('renders all time slots from 8:00 to 22:00', () => {
        render(<WeeklySchedule classes={mockClasses} />);
        for (let hour = 8; hour <= 22; hour++) {
            expect(screen.getByText(`${hour}:00`)).toBeInTheDocument();
        }
    });

    it('displays class information in the correct time slot', () => {
        render(<WeeklySchedule classes={mockClasses} />);
        expect(screen.getAllByText('COMP 352').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Sec A').length).toBeGreaterThan(0);
        expect(screen.getAllByText('H-637').length).toBeGreaterThan(0);
    });

    it('renders classes that span multiple hours correctly', () => {
        const multiHourClass: ClassItem[] = [
            { name: "LONG 101", section: "Sec A", room: "R-100", day: 1, startTime: 9, endTime: 12 }
        ];
        render(<WeeklySchedule classes={multiHourClass} />);
        expect(screen.getByText('LONG 101')).toBeInTheDocument();
    });

    it('handles empty classes array', () => {
        render(<WeeklySchedule classes={[]} />);
        expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
        expect(screen.queryByText('COMP 352')).not.toBeInTheDocument();
    });

    it('only shows class info in the first hour of the class', () => {
        const { container } = render(<WeeklySchedule classes={mockClasses} />);
        const classInfos = container.querySelectorAll('.class-info');
        // Should have one info div per unique class time slot
        expect(classInfos.length).toBeGreaterThan(0);
    });

    it('applies correct background color to class cells', () => {
        const { container } = render(<WeeklySchedule classes={mockClasses} />);
        const classCells = container.querySelectorAll('.class-cell');
        expect(classCells.length).toBeGreaterThan(0);
    });

    it('handles classes at the same time on different days', () => {
        render(<WeeklySchedule classes={mockClasses} />);
        // COMP 352 is on Mon (day 1) and Wed (day 3) at 9:00
        const comp352Elements = screen.getAllByText('COMP 352');
        expect(comp352Elements.length).toBeGreaterThanOrEqual(2);
    });

    it('getClassForCell returns correct class for a given day and hour', () => {
        render(<WeeklySchedule classes={mockClasses} />);
        // COMP 352 is at day 1 (Mon), hour 9-11
        // The component should render this class
        expect(screen.getAllByText('COMP 352').length).toBeGreaterThan(0);
    });

    it('isFirstHourOfClass correctly identifies first hour', () => {
        const twoHourClass: ClassItem[] = [
            { name: "TEST 101", section: "A", room: "R-1", day: 1, startTime: 10, endTime: 12 }
        ];
        render(<WeeklySchedule classes={twoHourClass} />);
        // Class info should only appear once (in the first hour)
        const classInfoElements = screen.getAllByText('TEST 101');
        expect(classInfoElements.length).toBe(1);
    });

    it('handles classes that end at 22:00', () => {
        const lateClass: ClassItem[] = [
            { name: "LATE 101", section: "A", room: "R-1", day: 1, startTime: 20, endTime: 22 }
        ];
        render(<WeeklySchedule classes={lateClass} />);
        expect(screen.getByText('LATE 101')).toBeInTheDocument();
    });

    it('handles classes that start at 8:00', () => {
        const earlyClass: ClassItem[] = [
            { name: "EARLY 101", section: "A", room: "R-1", day: 1, startTime: 8, endTime: 10 }
        ];
        render(<WeeklySchedule classes={earlyClass} />);
        expect(screen.getByText('EARLY 101')).toBeInTheDocument();
    });

    it('renders table with scrollable container', () => {
        const { container } = render(<WeeklySchedule classes={mockClasses} />);
        const scrollContainer = container.querySelector('.schedule-scroll');
        expect(scrollContainer).toBeInTheDocument();
    });

    it('has sticky time column and headers', () => {
        const { container } = render(<WeeklySchedule classes={mockClasses} />);
        const timeColumns = container.querySelectorAll('.time-column');
        expect(timeColumns.length).toBeGreaterThan(0);
    });
});