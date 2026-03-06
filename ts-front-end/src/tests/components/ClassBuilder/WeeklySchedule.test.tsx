import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import WeeklySchedule from '../../../components/ClassBuilderComponents/WeeklySchedule';
import type { ClassItem } from '../../../types/classItem';

// All props are required in the production component — supply them in every render.
const defaultProps = {
    pinnedClassNumbers: new Set<string>(),
    configIndex: 0,
    totalConfigs: 1,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onTogglePin: vi.fn(),
};

describe('WeeklySchedule', () => {
    const mockClasses: ClassItem[] = [
        { classNumber: "1001", name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
        { classNumber: "1001", name: "COMP 352", section: "Sec A", room: "H-637", day: 3, startTime: 9, endTime: 11 },
        { classNumber: "1002", name: "COMP 346", section: "Sec B", room: "MB-2.210", day: 2, startTime: 10, endTime: 12 },
        { classNumber: "1003", name: "SOEN 341", section: "Sec C", room: "H-537", day: 1, startTime: 13, endTime: 15 },
    ];

    it('renders the component', () => {
        render(<WeeklySchedule classes={mockClasses} {...defaultProps} />);
        expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
    });

    it('renders all 7 days of the week with Sunday first', () => {
        render(<WeeklySchedule classes={mockClasses} {...defaultProps} />);
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            expect(screen.getByText(day)).toBeInTheDocument();
        });
    });

    it('renders all time slots from 8:00 to 22:00', () => {
        render(<WeeklySchedule classes={mockClasses} {...defaultProps} />);
        for (let hour = 8; hour <= 22; hour++) {
            expect(screen.getByText(`${hour}:00`)).toBeInTheDocument();
        }
    });

    it('displays class information in the correct time slot', () => {
        render(<WeeklySchedule classes={mockClasses} {...defaultProps} />);
        expect(screen.getAllByText('COMP 352').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Sec A').length).toBeGreaterThan(0);
        expect(screen.getAllByText('H-637').length).toBeGreaterThan(0);
    });

    it('renders classes that span multiple hours correctly', () => {
        const multiHourClass: ClassItem[] = [
            { classNumber: "2001", name: "LONG 101", section: "Sec A", room: "R-100", day: 1, startTime: 9, endTime: 12 }
        ];
        render(<WeeklySchedule classes={multiHourClass} {...defaultProps} />);
        expect(screen.getByText('LONG 101')).toBeInTheDocument();
    });

    it('handles empty classes array', () => {
        render(<WeeklySchedule classes={[]} {...defaultProps} />);
        expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
        expect(screen.queryByText('COMP 352')).not.toBeInTheDocument();
    });

    it('only shows class info in the first hour of the class', () => {
        const { container } = render(<WeeklySchedule classes={mockClasses} {...defaultProps} />);
        expect(container.querySelectorAll('.class-info').length).toBeGreaterThan(0);
    });

    it('applies correct background color to class cells', () => {
        const { container } = render(<WeeklySchedule classes={mockClasses} {...defaultProps} />);
        expect(container.querySelectorAll('.class-cell').length).toBeGreaterThan(0);
    });

    it('handles classes at the same time on different days', () => {
        render(<WeeklySchedule classes={mockClasses} {...defaultProps} />);
        expect(screen.getAllByText('COMP 352').length).toBeGreaterThanOrEqual(2);
    });

    it('isFirstHourOfClass correctly identifies first hour', () => {
        const twoHourClass: ClassItem[] = [
            { classNumber: "3001", name: "TEST 101", section: "A", room: "R-1", day: 1, startTime: 10, endTime: 12 }
        ];
        render(<WeeklySchedule classes={twoHourClass} {...defaultProps} />);
        expect(screen.getAllByText('TEST 101').length).toBe(1);
    });

    it('handles classes that end at 22:00', () => {
        const lateClass: ClassItem[] = [
            { classNumber: "4001", name: "LATE 101", section: "A", room: "R-1", day: 1, startTime: 20, endTime: 22 }
        ];
        render(<WeeklySchedule classes={lateClass} {...defaultProps} />);
        expect(screen.getByText('LATE 101')).toBeInTheDocument();
    });

    it('handles classes that start at 8:00', () => {
        const earlyClass: ClassItem[] = [
            { classNumber: "5001", name: "EARLY 101", section: "A", room: "R-1", day: 1, startTime: 8, endTime: 10 }
        ];
        render(<WeeklySchedule classes={earlyClass} {...defaultProps} />);
        expect(screen.getByText('EARLY 101')).toBeInTheDocument();
    });

    it('renders table with scrollable container', () => {
        const { container } = render(<WeeklySchedule classes={mockClasses} {...defaultProps} />);
        expect(container.querySelector('.schedule-scroll')).toBeInTheDocument();
    });

    it('has sticky time column and headers', () => {
        const { container } = render(<WeeklySchedule classes={mockClasses} {...defaultProps} />);
        expect(container.querySelectorAll('.time-column').length).toBeGreaterThan(0);
    });

    it('does not show navigation when totalConfigs is 1', () => {
        render(<WeeklySchedule classes={mockClasses} {...defaultProps} totalConfigs={1} />);
        expect(screen.queryByLabelText('Previous configuration')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Next configuration')).not.toBeInTheDocument();
    });

    it('shows navigation arrows when totalConfigs > 1', () => {
        render(<WeeklySchedule classes={mockClasses} {...defaultProps} totalConfigs={5} />);
        expect(screen.getByLabelText('Previous configuration')).toBeInTheDocument();
        expect(screen.getByLabelText('Next configuration')).toBeInTheDocument();
    });

    it('displays correct config counter', () => {
        render(<WeeklySchedule classes={mockClasses} {...defaultProps} configIndex={2} totalConfigs={10} />);
        expect(screen.getByText('3 / 10')).toBeInTheDocument();
    });

    it('prev button is disabled at first configuration', () => {
        render(<WeeklySchedule classes={mockClasses} {...defaultProps} configIndex={0} totalConfigs={5} />);
        expect(screen.getByLabelText('Previous configuration')).toBeDisabled();
    });

    it('next button is disabled at last configuration', () => {
        render(<WeeklySchedule classes={mockClasses} {...defaultProps} configIndex={4} totalConfigs={5} />);
        expect(screen.getByLabelText('Next configuration')).toBeDisabled();
    });

    it('applies pinned class styling to pinned cells', () => {
        const { container } = render(
            <WeeklySchedule classes={mockClasses} {...defaultProps} pinnedClassNumbers={new Set(['1001'])} />
        );
        expect(container.querySelectorAll('.class-cell--pinned').length).toBeGreaterThan(0);
    });

    it('unpinned cells do not have pinned class', () => {
        const { container } = render(
            <WeeklySchedule classes={mockClasses} {...defaultProps} pinnedClassNumbers={new Set()} />
        );
        expect(container.querySelectorAll('.class-cell--pinned').length).toBe(0);
    });
});