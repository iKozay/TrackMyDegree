import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ScheduledCourses from '../../../components/ClassBuilderComponents/ScheduledCourses';
import type { AddedCourse } from '../../../types/classItem';

describe('ScheduledCourses', () => {
    const mockSetAddedCourses = vi.fn();

    const mockCourses: AddedCourse[] = [
        { code: "COMP 352", title: "DATA STRUCTURES AND ALGORITHMS", sections: [] },
        { code: "COMP 346", title: "OPERATING SYSTEMS", sections: [] },
        { code: "SOEN 341", title: "SOFTWARE PROCESS", sections: [] },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the component title', () => {
        render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        expect(screen.getByText('Scheduled Courses')).toBeInTheDocument();
    });

    it('displays each course code', () => {
        render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        expect(screen.getByText('COMP 352')).toBeInTheDocument();
        expect(screen.getByText('COMP 346')).toBeInTheDocument();
        expect(screen.getByText('SOEN 341')).toBeInTheDocument();
    });

    it('displays each course title', () => {
        render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        expect(screen.getByText('DATA STRUCTURES AND ALGORITHMS')).toBeInTheDocument();
        expect(screen.getByText('OPERATING SYSTEMS')).toBeInTheDocument();
        expect(screen.getByText('SOFTWARE PROCESS')).toBeInTheDocument();
    });

    it('renders one course-item per added course', () => {
        const { container } = render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        expect(container.querySelectorAll('.course-item').length).toBe(3);
    });

    it('renders a delete button for each course', () => {
        render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        expect(screen.getAllByLabelText(/Remove/).length).toBe(3);
    });

    it('delete buttons have correct aria-labels', () => {
        render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        expect(screen.getByLabelText('Remove COMP 352')).toBeInTheDocument();
        expect(screen.getByLabelText('Remove COMP 346')).toBeInTheDocument();
        expect(screen.getByLabelText('Remove SOEN 341')).toBeInTheDocument();
    });

    it('calls setAddedCourses when delete button is clicked', () => {
        render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        fireEvent.click(screen.getByLabelText('Remove COMP 352'));
        expect(mockSetAddedCourses).toHaveBeenCalledTimes(1);
    });

    it('removes the correct course when delete is clicked', () => {
        render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        fireEvent.click(screen.getByLabelText('Remove COMP 352'));

        const result: AddedCourse[] = mockSetAddedCourses.mock.calls[0][0];
        expect(result.find(c => c.code === 'COMP 352')).toBeUndefined();
        expect(result.length).toBe(2);
    });

    it('keeps other courses when one is deleted', () => {
        render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        fireEvent.click(screen.getByLabelText('Remove COMP 352'));

        const result: AddedCourse[] = mockSetAddedCourses.mock.calls[0][0];
        expect(result.find(c => c.code === 'COMP 346')).toBeDefined();
        expect(result.find(c => c.code === 'SOEN 341')).toBeDefined();
    });

    it('shows empty state when no courses are added', () => {
        render(<ScheduledCourses addedCourses={[]} setAddedCourses={mockSetAddedCourses} />);
        expect(screen.getByText('Scheduled Courses')).toBeInTheDocument();
        expect(screen.queryByText('COMP 352')).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Remove/)).not.toBeInTheDocument();
    });

    it('renders empty state message when list is empty', () => {
        render(<ScheduledCourses addedCourses={[]} setAddedCourses={mockSetAddedCourses} />);
        expect(screen.getByText('No courses added yet.')).toBeInTheDocument();
    });

    it('renders a single course correctly', () => {
        const single: AddedCourse[] = [
            { code: "COMP 371", title: "COMPUTER GRAPHICS", sections: [] },
        ];
        render(<ScheduledCourses addedCourses={single} setAddedCourses={mockSetAddedCourses} />);
        expect(screen.getByText('COMP 371')).toBeInTheDocument();
        expect(screen.getByText('COMPUTER GRAPHICS')).toBeInTheDocument();
        expect(screen.getAllByLabelText(/Remove/).length).toBe(1);
    });

    it('has correct CSS class on card container', () => {
        const { container } = render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        expect(container.querySelector('.scheduled-courses-card')).toBeInTheDocument();
    });

    it('has correct CSS class on list container', () => {
        const { container } = render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        expect(container.querySelector('.scheduled-courses-card__list')).toBeInTheDocument();
    });

    it('renders course code with correct CSS class', () => {
        const { container } = render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        expect(container.querySelectorAll('.course-item__name').length).toBe(3);
    });

    it('renders course title with correct CSS class', () => {
        const { container } = render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        expect(container.querySelectorAll('.course-item__title').length).toBe(3);
    });

    it('renders delete buttons with correct CSS class', () => {
        const { container } = render(<ScheduledCourses addedCourses={mockCourses} setAddedCourses={mockSetAddedCourses} />);
        expect(container.querySelectorAll('.course-item__delete').length).toBe(3);
    });
});