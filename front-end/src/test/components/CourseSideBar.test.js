/* eslint-disable prettier/prettier */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseSidebar } from '../../components/CourseSideBar';

// ✅ Mock child components to isolate CourseSidebar
jest.mock('../../components/CourseAccordionSection', () => ({
    __esModule: true,
    default: ({ title }) => <div data-testid="mock-course-accordion">{title}</div>,
}));

jest.mock('../../components/Droppable', () => ({
    __esModule: true,
    Droppable: ({ children, id }) => <div data-testid={`mock-droppable-${id}`}>{children}</div>,
}));

describe('CourseSidebar', () => {
    const baseProps = {
        showCourseList: true,
        toggleCourseList: jest.fn(),
        searchQuery: '',
        setSearchQuery: jest.fn(),
        coursePools: [
            {
                poolId: 'core',
                poolName: 'Core Courses',
                courses: [{ code: 'COMP248', title: 'Object-Oriented Programming I' }],
            },
        ],
        remainingCourses: [{ code: 'COMP249', title: 'Object-Oriented Programming II' }],
        deficiencyCourses: [{ code: 'MATH203', title: 'Calculus I' }],
        exemptionCourses: [{ code: 'ENGR201', title: 'Professional Practice' }],
        deficiencyCredits: 3,
        exemptionCredits: 3,
        selectedCourse: null,
        returning: false,
        isCourseAssigned: jest.fn(() => false),
        onSelect: jest.fn(),
        removeDeficiencyCourse: jest.fn(),
        removeExemptionCourse: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders the sidebar and all course sections when showCourseList is true', () => {
        render(<CourseSidebar {...baseProps} />);

        // Should render main container
        expect(screen.getByText('Course List')).toBeInTheDocument();

        // Should render search input
        expect(screen.getByPlaceholderText('Search courses...')).toBeInTheDocument();

        // Should render all mocked CourseAccordionSections
        expect(screen.getAllByTestId('mock-course-accordion')).toHaveLength(4); // core, remaining, deficiency, exemption
    });

    test('renders only the toggle button when showCourseList is false', () => {
        render(<CourseSidebar {...baseProps} showCourseList={false} />);

        // Sidebar content hidden
        expect(screen.queryByText('Course List')).not.toBeInTheDocument();

        // Toggle button still visible
        expect(screen.getByRole('button', { name: '▶' })).toBeInTheDocument();
    });

    test('calls toggleCourseList when toggle button is clicked', () => {
        render(<CourseSidebar {...baseProps} />);

        const button = screen.getByRole('button', { name: '◀' });
        fireEvent.click(button);

        expect(baseProps.toggleCourseList).toHaveBeenCalledTimes(1);
    });

    test('updates search query when typing in search input', () => {
        render(<CourseSidebar {...baseProps} />);

        const input = screen.getByPlaceholderText('Search courses...');
        fireEvent.change(input, { target: { value: 'comp' } });

        expect(baseProps.setSearchQuery).toHaveBeenCalledWith('comp');
    });

    test('renders deficiency and exemption sections only when credits > 0', () => {
        const { rerender } = render(<CourseSidebar {...baseProps} />);

        // both sections visible
        expect(screen.getByText('Deficiency Courses')).toBeInTheDocument();
        expect(screen.getByText('Exempted Courses')).toBeInTheDocument();

        // rerender with 0 credits
        rerender(<CourseSidebar {...baseProps} deficiencyCredits={0} exemptionCredits={0} />);

        expect(screen.queryByText('Deficiency Courses')).not.toBeInTheDocument();
        expect(screen.queryByText('Exempted Courses')).not.toBeInTheDocument();
    });
});
