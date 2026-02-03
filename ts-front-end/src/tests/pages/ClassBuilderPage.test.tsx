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

    it('renders the Export Schedule button', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByText('Export Schedule')).toBeInTheDocument();
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

    it('initializes with default classes state', () => {
        render(<ClassBuilderPage />);
        // Default classes should be rendered
        expect(screen.getByText('COMP 352')).toBeInTheDocument();
        expect(screen.getByText('COMP 346')).toBeInTheDocument();
        expect(screen.getByText('SOEN 341')).toBeInTheDocument();
    });

    it('has correct layout structure', () => {
        const { container } = render(<ClassBuilderPage />);
        const main = container.querySelector('main');
        expect(main).toHaveClass('flex-1', 'overflow-auto');
    });

    it('has responsive padding classes', () => {
        const { container } = render(<ClassBuilderPage />);
        const paddingDiv = container.querySelector('.p-4.sm\\:p-8');
        expect(paddingDiv).toBeInTheDocument();
    });

    it('has max-width container', () => {
        const { container } = render(<ClassBuilderPage />);
        const maxWidthDiv = container.querySelector('.max-w-7xl');
        expect(maxWidthDiv).toBeInTheDocument();
    });

    it('has correct grid layout for schedule and sidebar', () => {
        const { container } = render(<ClassBuilderPage />);
        const grid = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-4');
        expect(grid).toBeInTheDocument();
    });

    it('schedule takes 3 columns on large screens', () => {
        const { container } = render(<ClassBuilderPage />);
        const scheduleColumn = container.querySelector('.lg\\:col-span-3');
        expect(scheduleColumn).toBeInTheDocument();
    });

    it('sidebar has space-y-6 class', () => {
        const { container } = render(<ClassBuilderPage />);
        const sidebar = container.querySelector('.space-y-6');
        expect(sidebar).toBeInTheDocument();
    });

    it('header has responsive layout classes', () => {
        const { container } = render(<ClassBuilderPage />);
        const header = container.querySelector('.flex.flex-col.sm\\:flex-row');
        expect(header).toBeInTheDocument();
    });

    it('export button has responsive width', () => {
        render(<ClassBuilderPage />);
        const button = screen.getByText('Export Schedule');
        expect(button).toHaveClass('w-full', 'sm:w-auto');
    });

    it('displays initial stat values correctly', () => {
        render(<ClassBuilderPage />);
        // With 6 classes (3 courses × 2 days each), each 2 hours = 12 hours total
        expect(screen.getByText('12 hours/week')).toBeInTheDocument();
        expect(screen.getByText('3 courses')).toBeInTheDocument();
    });

    it('renders all days of the week in schedule', () => {
        render(<ClassBuilderPage />);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            expect(screen.getByText(day)).toBeInTheDocument();
        });
    });

    it('renders semester selector', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByDisplayValue('Winter 2025')).toBeInTheDocument();
    });

    it('renders search input', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByPlaceholderText('Search by course code or name...')).toBeInTheDocument();
    });

    it('renders all scheduled courses in sidebar', () => {
        render(<ClassBuilderPage />);
        // All three courses should appear in the sidebar
        const comp352 = screen.getAllByText('COMP 352');
        const comp346 = screen.getAllByText('COMP 346');
        const soen341 = screen.getAllByText('SOEN 341');

        expect(comp352.length).toBeGreaterThan(0);
        expect(comp346.length).toBeGreaterThan(0);
        expect(soen341.length).toBeGreaterThan(0);
    });
});