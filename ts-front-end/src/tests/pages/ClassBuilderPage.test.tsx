import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClassBuilderPage from '../../pages/ClassBuilderPage';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// Mock child components
jest.mock('../components/ClassBuilderComponents/WeeklySchedule', () => {
    return function MockWeeklySchedule() {
        return <div data-testid="weekly-schedule">Weekly Schedule Mock</div>;
    };
});

jest.mock('../components/ClassBuilderComponents/ScheduleStats', () => {
    return function MockScheduleStats() {
        return <div data-testid="schedule-stats">Schedule Stats Mock</div>;
    };
});

jest.mock('../components/ClassBuilderComponents/ScheduledCourses', () => {
    return function MockScheduledCourses() {
        return <div data-testid="scheduled-courses">Scheduled Courses Mock</div>;
    };
});

jest.mock('../components/ClassBuilderComponents/SearchCourses', () => {
    return function MockSearchCourses() {
        return <div data-testid="search-courses">Search Courses Mock</div>;
    };
});

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

    it('renders all child components', () => {
        render(<ClassBuilderPage />);
        expect(screen.getByTestId('weekly-schedule')).toBeInTheDocument();
        expect(screen.getByTestId('schedule-stats')).toBeInTheDocument();
        expect(screen.getByTestId('scheduled-courses')).toBeInTheDocument();
        expect(screen.getByTestId('search-courses')).toBeInTheDocument();
    });

    it('initializes with default classes state', () => {
        const { container } = render(<ClassBuilderPage />);
        // The page should render without errors, indicating state is properly initialized
        expect(container.querySelector('main')).toBeInTheDocument();
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

    it('renders with framer-motion wrapper', () => {
        const { container } = render(<ClassBuilderPage />);
        // The motion.div should be rendered as a regular div in our mock
        expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
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
});