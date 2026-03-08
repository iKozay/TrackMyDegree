import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import ScheduleStats from '../../../components/ClassBuilderComponents/ScheduleStats';
import type { ClassItem } from '../../../types/classItem';

describe('ScheduleStats', () => {
    const mockClasses: ClassItem[] = [
        { classNumber: "1001", name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
        { classNumber: "1001", name: "COMP 352", section: "Sec A", room: "H-637", day: 3, startTime: 9, endTime: 11 },
        { classNumber: "1002", name: "COMP 346", section: "Sec B", room: "MB-2.210", day: 2, startTime: 10, endTime: 12 },
        { classNumber: "1002", name: "COMP 346", section: "Sec B", room: "MB-2.210", day: 4, startTime: 10, endTime: 12 },
        { classNumber: "1003", name: "SOEN 341", section: "Sec C", room: "H-537", day: 1, startTime: 13, endTime: 15 },
        { classNumber: "1003", name: "SOEN 341", section: "Sec C", room: "H-537", day: 3, startTime: 13, endTime: 15 },
    ];

    it('renders all three stat cards', () => {
        render(<ScheduleStats classes={mockClasses} />);
        expect(screen.getByText('Total Hours')).toBeInTheDocument();
        expect(screen.getByText('Enrolled Courses')).toBeInTheDocument();
    });

    it('calculates total hours correctly', () => {
        render(<ScheduleStats classes={mockClasses} />);
        expect(screen.getByText('12 hours/week')).toBeInTheDocument();
    });

    it('counts unique courses correctly', () => {
        render(<ScheduleStats classes={mockClasses} />);
        expect(screen.getByText('3 courses')).toBeInTheDocument();
    });

    it('displays singular "course" for one course', () => {
        const singleCourse: ClassItem[] = [
            { classNumber: "2001", name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 }
        ];
        render(<ScheduleStats classes={singleCourse} />);
        expect(screen.getByText('1 course')).toBeInTheDocument();
    });

    it('handles empty classes array', () => {
        render(<ScheduleStats classes={[]} />);
        expect(screen.getByText('0 hours/week')).toBeInTheDocument();
        expect(screen.getByText('0 courses')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('calculates hours for classes with different durations', () => {
        const variedDurations: ClassItem[] = [
            { classNumber: "6001", name: "SHORT", section: "A", room: "R1", day: 1, startTime: 9, endTime: 10 },
            { classNumber: "6002", name: "LONG", section: "B", room: "R2", day: 2, startTime: 10, endTime: 13 },
        ];
        render(<ScheduleStats classes={variedDurations} />);
        expect(screen.getByText('4 hours/week')).toBeInTheDocument();
    });

    it('distinguishes courses with same name but different sections', () => {
        const sameName: ClassItem[] = [
            { classNumber: "7001", name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
            { classNumber: "7002", name: "COMP 352", section: "Sec B", room: "H-637", day: 2, startTime: 9, endTime: 11 },
        ];
        render(<ScheduleStats classes={sameName} />);
        expect(screen.getByText('2 courses')).toBeInTheDocument();
    });

    it('renders stat card icons', () => {
        const { container } = render(<ScheduleStats classes={mockClasses} />);
        expect(container.querySelectorAll('.stat-card__icon').length).toBe(3);
    });

    it('applies correct icon classes for each stat', () => {
        const { container } = render(<ScheduleStats classes={mockClasses} />);
        expect(container.querySelector('.stat-card__icon--hours')).toBeInTheDocument();
        expect(container.querySelector('.stat-card__icon--courses')).toBeInTheDocument();
    });
});