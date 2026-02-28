import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import ClassBuilderPage from '../../pages/ClassBuilderPage';

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