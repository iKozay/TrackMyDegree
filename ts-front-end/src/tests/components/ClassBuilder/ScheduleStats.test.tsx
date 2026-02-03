import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import ScheduleStats from '../../../components/ClassBuilderComponents/ScheduleStats';
import type { ClassItem } from '../../../pages/ClassBuilderPage';

describe('ScheduleStats', () => {
    const mockClasses: ClassItem[] = [
        { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
        { name: "COMP 352", section: "Sec A", room: "H-637", day: 3, startTime: 9, endTime: 11 },
        { name: "COMP 346", section: "Sec B", room: "MB-2.210", day: 2, startTime: 10, endTime: 12 },
        { name: "COMP 346", section: "Sec B", room: "MB-2.210", day: 4, startTime: 10, endTime: 12 },
        { name: "SOEN 341", section: "Sec C", room: "H-537", day: 1, startTime: 13, endTime: 15 },
        { name: "SOEN 341", section: "Sec C", room: "H-537", day: 3, startTime: 13, endTime: 15 },
    ];

    it('renders all three stat cards', () => {
        render(<ScheduleStats classes={mockClasses} />);
        expect(screen.getByText('Total Hours')).toBeInTheDocument();
        expect(screen.getByText('Enrolled Courses')).toBeInTheDocument();
        expect(screen.getByText('Conflicts')).toBeInTheDocument();
    });

    it('calculates total hours correctly', () => {
        render(<ScheduleStats classes={mockClasses} />);
        // 6 classes × 2 hours each = 12 hours
        expect(screen.getByText('12 hours/week')).toBeInTheDocument();
    });

    it('counts unique courses correctly', () => {
        render(<ScheduleStats classes={mockClasses} />);
        // 3 unique courses: COMP 352 Sec A, COMP 346 Sec B, SOEN 341 Sec C
        expect(screen.getByText('3 courses')).toBeInTheDocument();
    });

    it('displays singular "course" for one course', () => {
        const singleCourse: ClassItem[] = [
            { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 }
        ];
        render(<ScheduleStats classes={singleCourse} />);
        expect(screen.getByText('1 course')).toBeInTheDocument();
    });

    it('detects no conflicts when classes do not overlap', () => {
        render(<ScheduleStats classes={mockClasses} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('detects conflicts when classes overlap on the same day', () => {
        const conflictingClasses: ClassItem[] = [
            { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
            { name: "COMP 346", section: "Sec B", room: "MB-2.210", day: 1, startTime: 10, endTime: 12 },
        ];
        render(<ScheduleStats classes={conflictingClasses} />);
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('applies red color to conflicts count when conflicts exist', () => {
        const conflictingClasses: ClassItem[] = [
            { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
            { name: "COMP 346", section: "Sec B", room: "MB-2.210", day: 1, startTime: 10, endTime: 12 },
        ];
        const { container } = render(<ScheduleStats classes={conflictingClasses} />);
        const conflictValue = container.querySelector('.stat-card__value--conflict');
        expect(conflictValue).toBeInTheDocument();
    });

    it('handles empty classes array', () => {
        render(<ScheduleStats classes={[]} />);
        expect(screen.getByText('0 hours/week')).toBeInTheDocument();
        expect(screen.getByText('0 courses')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('detects multiple conflicts correctly', () => {
        const multipleConflicts: ClassItem[] = [
            { name: "CLASS 1", section: "A", room: "R1", day: 1, startTime: 9, endTime: 11 },
            { name: "CLASS 2", section: "B", room: "R2", day: 1, startTime: 10, endTime: 12 },
            { name: "CLASS 3", section: "C", room: "R3", day: 1, startTime: 10, endTime: 12 },
        ];
        render(<ScheduleStats classes={multipleConflicts} />);
        // CLASS 1 conflicts with CLASS 2, CLASS 1 conflicts with CLASS 3, CLASS 2 conflicts with CLASS 3 = 3 conflicts
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('does not count same class on different days as conflict', () => {
        const sameCoursesDifferentDays: ClassItem[] = [
            { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
            { name: "COMP 352", section: "Sec A", room: "H-637", day: 3, startTime: 9, endTime: 11 },
        ];
        render(<ScheduleStats classes={sameCoursesDifferentDays} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('calculates hours for classes with different durations', () => {
        const variedDurations: ClassItem[] = [
            { name: "SHORT", section: "A", room: "R1", day: 1, startTime: 9, endTime: 10 }, // 1 hour
            { name: "LONG", section: "B", room: "R2", day: 2, startTime: 10, endTime: 13 }, // 3 hours
        ];
        render(<ScheduleStats classes={variedDurations} />);
        expect(screen.getByText('4 hours/week')).toBeInTheDocument();
    });

    it('distinguishes courses with same name but different sections', () => {
        const sameName: ClassItem[] = [
            { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
            { name: "COMP 352", section: "Sec B", room: "H-637", day: 2, startTime: 9, endTime: 11 },
        ];
        render(<ScheduleStats classes={sameName} />);
        expect(screen.getByText('2 courses')).toBeInTheDocument();
    });

    it('detects edge-touching classes as non-conflicting', () => {
        const edgeTouching: ClassItem[] = [
            { name: "CLASS 1", section: "A", room: "R1", day: 1, startTime: 9, endTime: 11 },
            { name: "CLASS 2", section: "B", room: "R2", day: 1, startTime: 11, endTime: 13 },
        ];
        render(<ScheduleStats classes={edgeTouching} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders stat card icons', () => {
        const { container } = render(<ScheduleStats classes={mockClasses} />);
        const icons = container.querySelectorAll('.stat-card__icon');
        expect(icons.length).toBe(3);
    });

    it('applies correct icon classes for each stat', () => {
        const { container } = render(<ScheduleStats classes={mockClasses} />);
        expect(container.querySelector('.stat-card__icon--hours')).toBeInTheDocument();
        expect(container.querySelector('.stat-card__icon--courses')).toBeInTheDocument();
        expect(container.querySelector('.stat-card__icon--conflicts')).toBeInTheDocument();
    });
});