import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DegreeAuditPage from '../../pages/DegreeAuditPage.tsx';

// Mock the module to allow custom mock data per test
vi.mock('../../mock/degreeAuditResponse.json', () => ({
    default: {
        student: {
            name: 'John Smith',
            program: 'Bachelor of Computer Science',
            advisor: 'Dr. Sarah Johnson',
            gpa: '3.45 / 4.0',
            admissionTerm: 'Fall 2022',
            expectedGraduation: 'Spring 2026',
        },
        progress: {
            completed: 75,
            inProgress: 12,
            remaining: 33,
            total: 120,
            percentage: 63,
        },
        notices: [
            { id: 'notice-001', type: 'warning', message: '6 credits remaining in General Education requirements' },
            { id: 'notice-002', type: 'info', message: 'On track for graduation Spring 2026' },
            { id: 'notice-003', type: 'success', message: 'Great progress!' },
        ],
        requirements: [
            {
                id: 'req-core-cs',
                title: 'Core Computer Science',
                status: 'In Progress',
                missingCount: 2,
                creditsCompleted: 15,
                creditsTotal: 24,
                courses: [
                    { id: 'course-101', code: 'COMP 248', title: 'Object-Oriented Programming I', credits: 3, grade: 'A', status: 'Completed' },
                    { id: 'course-102', code: 'COMP 249', title: 'Object-Oriented Programming II', credits: 3, grade: 'A-', status: 'Completed' },
                    { id: 'course-103', code: 'COMP 352', title: 'Data Structures & Algorithms', credits: 3, status: 'In Progress' },
                    { id: 'course-104', code: 'COMP 445', title: 'Data Communications', credits: 3, status: 'Missing' },
                    { id: 'course-105', code: 'COMP 346', title: 'Operating Systems', credits: 3, status: 'Not Started' },
                ],
            },
            {
                id: 'req-gen-ed',
                title: 'General Education',
                status: 'Incomplete',
                missingCount: 2,
                creditsCompleted: 12,
                creditsTotal: 18,
                courses: [],
            },
            {
                id: 'req-capstone',
                title: 'Capstone Project',
                status: 'Not Started',
                missingCount: 1,
                creditsCompleted: 0,
                creditsTotal: 6,
                courses: [],
            },
            {
                id: 'req-math',
                title: 'Mathematics',
                status: 'Complete',
                creditsCompleted: 12,
                creditsTotal: 12,
                courses: [
                    { id: 'course-201', code: 'MATH 203', title: 'Calculus I', credits: 3, grade: 'A', status: 'Completed' },
                ],
            },
            {
                id: 'req-missing',
                title: 'Missing Requirements',
                status: 'Missing',
                missingCount: 3,
                creditsCompleted: 0,
                creditsTotal: 9,
                courses: [],
            },
        ],
    },
}));

describe('DegreeAuditPage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should show loading skeleton initially', () => {
        render(<DegreeAuditPage />);
        expect(document.querySelector('.skeleton')).toBeTruthy();
    });

    it('should show data after loading', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText('Unofficial Degree Audit')).toBeTruthy();
        expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
        const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.05);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText('Something went wrong')).toBeTruthy();

        // Test retry
        mockRandom.mockReturnValue(0.5);
        const retryBtn = screen.getByText('Try Again');
        fireEvent.click(retryBtn);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText('Unofficial Degree Audit')).toBeTruthy();
    });

    it('should toggle requirement expansion', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        const reqHeader = screen.getByText('Core Computer Science');
        expect(screen.getByText('COMP 248 - Object-Oriented Programming I')).toBeTruthy();

        fireEvent.click(reqHeader);
        expect(screen.queryByText('COMP 248 - Object-Oriented Programming I')).toBeNull();

        fireEvent.click(reqHeader);
        expect(screen.getByText('COMP 248 - Object-Oriented Programming I')).toBeTruthy();
    });

    it('should display all requirement status badges', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // Check for In Progress status
        expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
        // Check for Complete status
        expect(screen.getAllByText('Complete').length).toBeGreaterThan(0);
        // Check for Incomplete status
        expect(screen.getByText('Incomplete')).toBeTruthy();
        // Check for Not Started status
        expect(screen.getAllByText('Not Started').length).toBeGreaterThan(0);
        // Check for Missing status badge (requirement level)
        expect(screen.getAllByText('Missing').length).toBeGreaterThan(0);
    });

    it('should display missing count badges', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // Check for missing count badges
        expect(screen.getAllByText('2 missing').length).toBeGreaterThan(0);
    });

    it('should display all course statuses correctly', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // Expand the first requirement to see courses
        expect(screen.getByText('COMP 248 - Object-Oriented Programming I')).toBeTruthy();

        // Check for Completed course badges
        expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
        // Check for In Progress course badges (appears in courses list too)
        expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
        // Check for Missing course badge
        expect(screen.getAllByText('Missing').length).toBeGreaterThan(0);
        // Check for Not Started course badge (should appear in courses)
        expect(screen.getAllByText('Not Started').length).toBeGreaterThan(0);
    });

    it('should display notice types correctly', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // Check for warning notice
        expect(screen.getByText('6 credits remaining in General Education requirements')).toBeTruthy();
        // Check for info notice
        expect(screen.getByText('On track for graduation Spring 2026')).toBeTruthy();
        // Check for success notice
        expect(screen.getByText('Great progress!')).toBeTruthy();
    });

    it('should display student information', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText('John Smith')).toBeTruthy();
        expect(screen.getByText('Bachelor of Computer Science')).toBeTruthy();
        expect(screen.getByText('Dr. Sarah Johnson')).toBeTruthy();
        expect(screen.getByText('3.45 / 4.0')).toBeTruthy();
        expect(screen.getByText('Fall 2022')).toBeTruthy();
        expect(screen.getByText('Spring 2026')).toBeTruthy();
    });

    it('should display progress information', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText('63%')).toBeTruthy();
        expect(screen.getByText('75 credits completed')).toBeTruthy();
        expect(screen.getByText('12 credits in progress')).toBeTruthy();
        expect(screen.getByText('33 credits remaining')).toBeTruthy();
    });

    it('should display course grades', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText(/Grade: A$/)).toBeTruthy();
        expect(screen.getByText(/Grade: A-/)).toBeTruthy();
    });

    it('should display course credits', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getAllByText('3 credits').length).toBeGreaterThan(0);
    });

    it('should display disclaimer note', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText(/This is an unofficial audit/)).toBeTruthy();
    });

    it('should expand a collapsed requirement and show credit legend', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // The first requirement should be expanded by default
        // Check for credit legend items
        expect(screen.getByText('15 credits completed')).toBeTruthy();
        expect(screen.getByText('3 credits in progress')).toBeTruthy();
        expect(screen.getByText('6 credits remaining')).toBeTruthy();
    });

    it('should show requirement with no courses message', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // Collapse first requirement and expand General Education
        const coreHeader = screen.getByText('Core Computer Science');
        fireEvent.click(coreHeader);

        const genEdHeader = screen.getByText('General Education');
        fireEvent.click(genEdHeader);

        expect(screen.getByText('No courses listed for this requirement.')).toBeTruthy();
    });

    it('should handle non-Error exception in fetchData', async () => {
        // This test verifies the catch block handles non-Error exceptions
        vi.spyOn(Math, 'random').mockImplementation(() => {
            throw 'String error'; // Throwing a non-Error value
        });

        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // Should show "An unexpected error occurred" for non-Error exceptions
        expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
    });

    it('should call fetchData on Generate Audit button click', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // Find and click the Generate Audit button
        const generateBtn = screen.getByText('Generate Audit');
        fireEvent.click(generateBtn);

        // Check loading state appears
        expect(document.querySelector('.skeleton')).toBeTruthy();

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // Should show data again
        expect(screen.getByText('Unofficial Degree Audit')).toBeTruthy();
    });

    it('should display requirement credits and percentage', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // Check for credits display format
        expect(screen.getByText('15/24 credits (63%)')).toBeTruthy();
    });

    it('should expand and collapse multiple requirements', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // First requirement is expanded by default
        const coreHeader = screen.getByText('Core Computer Science');
        const mathHeader = screen.getByText('Mathematics');

        // Expand Mathematics (while Core is still expanded)
        fireEvent.click(mathHeader);

        // Both should be visible
        expect(screen.getByText('COMP 248 - Object-Oriented Programming I')).toBeTruthy();
        expect(screen.getByText('MATH 203 - Calculus I')).toBeTruthy();

        // Collapse Core
        fireEvent.click(coreHeader);
        expect(screen.queryByText('COMP 248 - Object-Oriented Programming I')).toBeNull();
        expect(screen.getByText('MATH 203 - Calculus I')).toBeTruthy();
    });

    it('should show credits in progress legend only when applicable', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // For requirements with in-progress credits, should show the legend
        expect(screen.getByText('3 credits in progress')).toBeTruthy();

        // For Mathematics which is complete, expand it
        const coreHeader = screen.getByText('Core Computer Science');
        fireEvent.click(coreHeader);

        const mathHeader = screen.getByText('Mathematics');
        fireEvent.click(mathHeader);

        // Mathematics should show 12 credits completed
        expect(screen.getByText('12 credits completed')).toBeTruthy();
    });

    it('should handle requirement with zero credits remaining', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // Expand Mathematics (which is complete)
        const coreHeader = screen.getByText('Core Computer Science');
        fireEvent.click(coreHeader);

        const mathHeader = screen.getByText('Mathematics');
        fireEvent.click(mathHeader);

        // Should show completed credits but no remaining
        expect(screen.getByText('12 credits completed')).toBeTruthy();
        // The "credits remaining" for this requirement should not appear or be 0
        // Since Math is complete (12/12), there are 0 remaining
    });
});
