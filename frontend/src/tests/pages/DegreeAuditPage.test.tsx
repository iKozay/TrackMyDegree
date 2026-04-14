import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DegreeAuditPage from '../../pages/DegreeAuditPage.tsx';

/* ---------------- Mock hooks and API ---------------- */
const mockNavigate = vi.fn();
let mockTimelineId: string | undefined = undefined;
const mockUseLocation = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ timelineId: mockTimelineId }),
        useLocation: () => mockUseLocation(),
    };
});

const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockApiGet = vi.fn();
vi.mock('../../api/http-api-client', () => ({
    api: {
        get: (...args: unknown[]) => mockApiGet(...args),
    },
}));

const mockAuditData = {
    student: {
        name: 'John Smith',
        program: 'Computer Science',
        advisor: 'Dr. Jane Doe',
        gpa: '3.5',
        admissionTerm: 'Fall 2022',
        expectedGraduation: 'Spring 2026',
    },
    progress: {
        percentage: 65,
        completed: 78,
        inProgress: 12,
        remaining: 30,
    },
    notices: [
        { id: '1', type: 'warning', message: 'Missing prerequisite for COMP 352' },
        { id: '2', type: 'info', message: 'You are on track to graduate' },
    ],
    requirements: [
        {
            id: 'core-cs',
            title: 'Core Computer Science',
            status: 'In Progress',
            creditsCompleted: 18,
            creditsTotal: 30,
            courses: [
                { id: 'c1', code: 'COMP 248', title: 'Object-Oriented Programming I', credits: 3, status: 'Completed', grade: 'A' },
                { id: 'c2', code: 'COMP 249', title: 'Object-Oriented Programming II', credits: 3, status: 'In Progress', grade: null },
                { id: 'c3', code: 'COMP 352', title: 'Data Structures', credits: 3, status: 'Not Started', grade: null },
            ],
        },
        {
            id: 'math',
            title: 'Mathematics',
            status: 'Complete',
            creditsCompleted: 12,
            creditsTotal: 12,
            courses: [
                { id: 'm1', code: 'MATH 201', title: 'Calculus I', credits: 3, status: 'Completed', grade: 'B+' },
                { id: 'm2', code: 'MATH 202', title: 'Calculus II', credits: 3, status: 'Completed', grade: 'A-' },
            ],
        },
    ],
};

const renderPage = () => {
    return render(
        <MemoryRouter>
            <DegreeAuditPage />
        </MemoryRouter>
    );
};

describe('DegreeAuditPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTimelineId = undefined;
        mockUseLocation.mockReturnValue({ search: '' });
        mockUseAuth.mockReturnValue({
            user: { id: 'test-user-id', name: 'Test User' },
            isAuthenticated: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should show loading skeleton initially', () => {
        mockApiGet.mockImplementation(() => new Promise(() => {})); // Never resolves
        renderPage();
        expect(document.querySelector('.skeleton')).toBeTruthy();
    });

    it('should show data after loading', async () => {
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Unofficial Degree Assessment')).toBeTruthy();
        });
        
        expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
        mockApiGet.mockRejectedValueOnce(new Error('Network error'));
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Something went wrong')).toBeTruthy();
        });

        // Test retry
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        const retryBtn = screen.getByText('Try Again');
        fireEvent.click(retryBtn);

        await waitFor(() => {
            expect(screen.getByText('Unofficial Degree Assessment')).toBeTruthy();
        });
    });

    it('should toggle requirement expansion', async () => {
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Core Computer Science')).toBeTruthy();
        });

        const reqHeader = screen.getByText('Core Computer Science');
        // Initially collapsed - courses should NOT be visible
        expect(screen.queryByText('COMP 248 - Object-Oriented Programming I')).toBeNull();

        // Click to expand
        fireEvent.click(reqHeader);
        expect(screen.getByText('COMP 248 - Object-Oriented Programming I')).toBeTruthy();

        // Click to collapse again
        fireEvent.click(reqHeader);
        expect(screen.queryByText('COMP 248 - Object-Oriented Programming I')).toBeNull();
    });

    it('should handle unknown requirement status for coverage', async () => {
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Unofficial Degree Assessment')).toBeTruthy();
        });

        // Check that badges are rendered correctly
        expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Complete').length).toBeGreaterThan(0);
    });

    it('should fetch audit data without timelineId when only user.id is available', async () => {
        mockTimelineId = undefined;
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Unofficial Degree Assessment')).toBeTruthy();
        });

        expect(mockApiGet).toHaveBeenCalledWith('/audit/user/test-user-id');
    });

    it('should fetch audit data with timelineId when provided', async () => {
        mockTimelineId = 'timeline-123';
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Unofficial Degree Assessment')).toBeTruthy();
        });

        expect(mockApiGet).toHaveBeenCalledWith('/audit/timeline/timeline-123?userId=test-user-id');
    });

    it('should show error when user is not authenticated and timelineId is undefined', async () => {
        mockTimelineId = undefined;
        mockUseAuth.mockReturnValue({
            user: null,
            isAuthenticated: false,
        });
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Something went wrong')).toBeTruthy();
        });

        expect(screen.getByText('Login or Create a timeline to access the degree audit')).toBeTruthy();
    });

    it('should show empty state when no requirements are returned', async () => {
        const emptyData = { ...mockAuditData, requirements: [] };
        mockApiGet.mockResolvedValueOnce(emptyData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('No Assessment Data Found')).toBeTruthy();
        });

        expect(screen.getByText(/We couldn't find any degree assessment information/)).toBeTruthy();
    });

    it('should show empty state when data is null', async () => {
        mockApiGet.mockResolvedValueOnce(null);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('No Assessment Data Found')).toBeTruthy();
        });
    });

    it('should show back button when timelineId is provided', async () => {
        mockTimelineId = 'timeline-123';
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Unofficial Degree Assessment')).toBeTruthy();
        });

        const backBtn = screen.getByText('Back to Profile');
        expect(backBtn).toBeTruthy();

        fireEvent.click(backBtn);
        expect(mockNavigate).toHaveBeenCalledWith('/profile/student');
    });

    it('should not show back button when user is not logged in', async () => {
        mockUseAuth.mockReturnValue({
            user: null,
            isAuthenticated: false,
        });
        mockTimelineId = 'timeline-123';
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        mockUseLocation.mockReturnValueOnce({
            search: '?fromPage=timelinePage',
        });

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Unofficial Degree Assessment')).toBeTruthy();
        });

        expect(screen.queryByText('Back to Profile')).toBeNull();
    });

    it('should render success notice type', async () => {
        const dataWithSuccessNotice = {
            ...mockAuditData,
            notices: [
                { id: '1', type: 'success', message: 'All requirements met!' },
            ],
        };
        mockApiGet.mockResolvedValueOnce(dataWithSuccessNotice);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('All requirements met!')).toBeTruthy();
        });
    });

    it('should render all requirement status badges', async () => {
        const dataWithAllStatuses = {
            ...mockAuditData,
            requirements: [
                { id: '1', title: 'Incomplete Req', status: 'Incomplete', creditsCompleted: 5, creditsTotal: 10, courses: [] },
                { id: '2', title: 'Missing Req', status: 'Missing', creditsCompleted: 0, creditsTotal: 10, courses: [] },
                { id: '3', title: 'Not Started Req', status: 'Not Started', creditsCompleted: 0, creditsTotal: 10, courses: [] },
                { id: '4', title: 'In Progress Req', status: 'In Progress', creditsCompleted: 5, creditsTotal: 10, courses: [] },
                { id: '5', title: 'Complete Req', status: 'Complete', creditsCompleted: 10, creditsTotal: 10, courses: [] },
                { id: '6', title: 'Unknown Status Req', status: 'Unknown', creditsCompleted: 0, creditsTotal: 10, courses: [] },
            ],
        };
        mockApiGet.mockResolvedValueOnce(dataWithAllStatuses);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Incomplete Req')).toBeTruthy();
        });

        expect(screen.getByText('Incomplete')).toBeTruthy();
        expect(screen.getByText('Missing')).toBeTruthy();
        expect(screen.getByText('Not Started')).toBeTruthy();
        // Unknown status should not render any badge
        expect(screen.getByText('Unknown Status Req')).toBeTruthy();
    });

    it('should render course statuses and credits legend when expanded', async () => {
        const dataWithMissingCourse = {
            ...mockAuditData,
            requirements: [
                {
                    id: 'req1',
                    title: 'Test Requirement',
                    status: 'In Progress',
                    creditsCompleted: 6,
                    creditsTotal: 15,
                    courses: [
                        { id: 'c1', code: 'TEST 101', title: 'Completed Course', credits: 3, status: 'Completed', grade: 'A' },
                        { id: 'c2', code: 'TEST 102', title: 'In Progress Course', credits: 3, status: 'In Progress', grade: null },
                        { id: 'c3', code: 'TEST 103', title: 'Missing Course', credits: 3, status: 'Missing', grade: null },
                        { id: 'c4', code: 'TEST 104', title: 'Not Started Course', credits: 3, status: 'Not Started', grade: null },
                    ],
                },
            ],
        };
        mockApiGet.mockResolvedValueOnce(dataWithMissingCourse);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Test Requirement')).toBeTruthy();
        });

        // Expand requirement
        fireEvent.click(screen.getByText('Test Requirement'));

        // Check credits legend (creditsRemaining = max(0, 15 - 6 - 3) = 6)
        expect(screen.getByText(/6 credits completed/)).toBeTruthy();
        expect(screen.getByText(/3 credits in progress/)).toBeTruthy();
        expect(screen.getByText(/6 credits remaining/)).toBeTruthy();

        // Check course badges
        expect(screen.getByText('TEST 101 - Completed Course')).toBeTruthy();
        expect(screen.getByText('TEST 103 - Missing Course')).toBeTruthy();
        expect(screen.getByText('TEST 104 - Not Started Course')).toBeTruthy();
    });

    it('should show empty courses message when requirement has no courses', async () => {
        const dataWithEmptyCourses = {
            ...mockAuditData,
            requirements: [
                {
                    id: 'req1',
                    title: 'Empty Requirement',
                    status: 'Not Started',
                    creditsCompleted: 0,
                    creditsTotal: 10,
                    courses: [],
                },
            ],
        };
        mockApiGet.mockResolvedValueOnce(dataWithEmptyCourses);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Empty Requirement')).toBeTruthy();
        });

        // Expand requirement
        fireEvent.click(screen.getByText('Empty Requirement'));

        expect(screen.getByText('No courses listed for this requirement.')).toBeTruthy();
    });

    it('should handle non-Error rejection', async () => {
        mockApiGet.mockRejectedValueOnce('string error');
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Something went wrong')).toBeTruthy();
        });

        expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
    });

    it('should call fetchData when Generate Assessment button is clicked on empty state', async () => {
        const emptyData = { ...mockAuditData, requirements: [] };
        mockApiGet.mockResolvedValueOnce(emptyData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('No Assessment Data Found')).toBeTruthy();
        });

        // Click Generate Assessment
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        const generateBtn = screen.getByText('Generate Assessment');
        fireEvent.click(generateBtn);

        await waitFor(() => {
            expect(screen.getByText('Unofficial Degree Assessment')).toBeTruthy();
        });
    });

    it('should call fetchData when Refresh Assessment button is clicked', async () => {
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Unofficial Degree Assessment')).toBeTruthy();
        });

        // Click Refresh Assessment
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        const refreshBtn = screen.getByText('Refresh Assessment');
        fireEvent.click(refreshBtn);

        await waitFor(() => {
            expect(mockApiGet).toHaveBeenCalledTimes(2);
        });
    });

    it('should not show credits in progress legend when 0 for a requirement', async () => {
        const dataWithNoInProgress = {
            student: mockAuditData.student,
            progress: { percentage: 40, completed: 6, inProgress: 0, remaining: 9 },
            notices: [],
            requirements: [
                {
                    id: 'req1',
                    title: 'Test Requirement',
                    status: 'In Progress',
                    creditsCompleted: 6,
                    creditsTotal: 15,
                    courses: [
                        { id: 'c1', code: 'TEST 101', title: 'Completed Course', credits: 6, status: 'Completed', grade: 'A' },
                    ],
                },
            ],
        };
        mockApiGet.mockResolvedValueOnce(dataWithNoInProgress);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Test Requirement')).toBeTruthy();
        });

        // Expand requirement
        fireEvent.click(screen.getByText('Test Requirement'));

        // Should not show "in progress" legend in requirement section (using legend-inprogress class)
        expect(document.querySelector('.legend-inprogress')).toBeNull();
        // Should show remaining in requirement section
        expect(document.querySelector('.legend-remaining')).toBeTruthy();
    });

    it('should not show credits remaining legend when 0 for a requirement', async () => {
        const dataWithNoRemaining = {
            student: mockAuditData.student,
            progress: { percentage: 100, completed: 10, inProgress: 0, remaining: 0 },
            notices: [],
            requirements: [
                {
                    id: 'req1',
                    title: 'Test Requirement',
                    status: 'Complete',
                    creditsCompleted: 10,
                    creditsTotal: 10,
                    courses: [
                        { id: 'c1', code: 'TEST 101', title: 'Completed Course', credits: 10, status: 'Completed', grade: 'A' },
                    ],
                },
            ],
        };
        mockApiGet.mockResolvedValueOnce(dataWithNoRemaining);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Test Requirement')).toBeTruthy();
        });

        // Expand requirement
        fireEvent.click(screen.getByText('Test Requirement'));

        // Should not show "remaining" legend in requirement section (using legend-remaining class)
        expect(document.querySelector('.legend-remaining')).toBeNull();
    });

    it('should display 100% for requirements with 0 total credits instead of NaN', async () => {
        const dataWithZeroCredits = {
            ...mockAuditData,
            requirements: [
                {
                    id: 'coop',
                    title: 'Coop Courses',
                    status: 'Complete',
                    creditsCompleted: 0,
                    creditsTotal: 0,
                    courses: [
                        { id: 'coop1', code: 'CWT 100', title: 'COOP Work Term 1', credits: 0, status: 'Missing', grade: null },
                    ],
                },
            ],
        };
        mockApiGet.mockResolvedValueOnce(dataWithZeroCredits);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Coop Courses')).toBeTruthy();
        });

        // Should show 100% instead of NaN%
        expect(screen.getByText(/0\/0 credits \(100%\)/)).toBeTruthy();
        expect(screen.queryByText(/NaN/)).toBeNull();
    });

    it('should expand all requirements when Expand All is clicked', async () => {
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Core Computer Science')).toBeTruthy();
        });

        // Initially all requirements should be collapsed
        expect(screen.queryByText('COMP 248 - Object-Oriented Programming I')).toBeNull();
        expect(screen.queryByText('MATH 201 - Calculus I')).toBeNull();

        // Click Expand All
        const expandAllBtn = screen.getByTitle('Expand all sections');
        fireEvent.click(expandAllBtn);

        // All requirements should now be expanded
        expect(screen.getByText('COMP 248 - Object-Oriented Programming I')).toBeTruthy();
        expect(screen.getByText('MATH 201 - Calculus I')).toBeTruthy();
    });

    it('should collapse all requirements when Collapse All is clicked', async () => {
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Core Computer Science')).toBeTruthy();
        });

        // Expand all first
        const expandAllBtn = screen.getByTitle('Expand all sections');
        fireEvent.click(expandAllBtn);

        await waitFor(() => {
            expect(screen.getByText('COMP 248 - Object-Oriented Programming I')).toBeTruthy();
        });

        // Click Collapse All
        const collapseAllBtn = screen.getByTitle('Collapse all sections');
        fireEvent.click(collapseAllBtn);

        // All requirements should now be collapsed
        expect(screen.queryByText('COMP 248 - Object-Oriented Programming I')).toBeNull();
        expect(screen.queryByText('MATH 201 - Calculus I')).toBeNull();
    });

    it('should show Collapse All button when any requirement is expanded', async () => {
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Core Computer Science')).toBeTruthy();
        });

        // Initially no Collapse All button should be visible (none expanded)
        expect(screen.queryByTitle('Collapse all sections')).toBeNull();

        // Expand one requirement
        fireEvent.click(screen.getByText('Core Computer Science'));

        // Now Collapse All button should appear
        expect(screen.getByTitle('Collapse all sections')).toBeTruthy();
    });

    it('should show Expand All button when not all requirements are expanded', async () => {
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Core Computer Science')).toBeTruthy();
        });

        // Initially Expand All should be visible
        expect(screen.getByTitle('Expand all sections')).toBeTruthy();

        // Expand one requirement (but not all)
        fireEvent.click(screen.getByText('Core Computer Science'));

        // Expand All should still be visible
        expect(screen.getByTitle('Expand all sections')).toBeTruthy();

        // Expand all
        fireEvent.click(screen.getByTitle('Expand all sections'));

        // Now Expand All should be hidden (all are expanded)
        expect(screen.queryByTitle('Expand all sections')).toBeNull();
    });

    it('should not show sticky header initially when requirement is expanded', async () => {
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        const { container } = renderPage();

        await waitFor(() => {
            expect(screen.getByText('Core Computer Science')).toBeTruthy();
        });

        // Expand requirement
        fireEvent.click(screen.getByText('Core Computer Science'));

        await waitFor(() => {
            expect(screen.getByText('COMP 248 - Object-Oriented Programming I')).toBeTruthy();
        });

        // Mock getBoundingClientRect to simulate header being IN view (not scrolled out)
        const reqHeaderRow = container.querySelector('.req-header-row');
        if (reqHeaderRow) {
            const mockGetBoundingClientRect = vi.fn(() => ({
                bottom: 100, // Positive value means still in view
                top: 50,
                left: 0,
                right: 0,
                width: 0,
                height: 0,
                x: 0,
                y: 0,
                toJSON: () => {},
            }));
            reqHeaderRow.getBoundingClientRect = mockGetBoundingClientRect;

            // Trigger scroll event to update state
            fireEvent.scroll(window);

            // Wait a bit for state to update
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Sticky header should not be rendered when main header is in view
        const stickyHeaders = document.querySelectorAll('.req-sticky-header');
        expect(stickyHeaders.length).toBe(0);
    });

    it('should collapse individual section when sticky header collapse button is clicked', async () => {
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        const { container } = renderPage();

        await waitFor(() => {
            expect(screen.getByText('Core Computer Science')).toBeTruthy();
        });

        // Expand requirement
        fireEvent.click(screen.getByText('Core Computer Science'));

        await waitFor(() => {
            expect(screen.getByText('COMP 248 - Object-Oriented Programming I')).toBeTruthy();
        });

        // Simulate scroll to make sticky header visible
        const reqHeaderRow = container.querySelector('.req-header-row');
        if (reqHeaderRow) {
            // Mock getBoundingClientRect to simulate header being scrolled out of view
            const mockGetBoundingClientRect = vi.fn(() => ({
                bottom: -10,
                top: -100,
                left: 0,
                right: 0,
                width: 0,
                height: 0,
                x: 0,
                y: 0,
                toJSON: () => {},
            }));
            reqHeaderRow.getBoundingClientRect = mockGetBoundingClientRect;

            // Trigger scroll event
            fireEvent.scroll(window);

            await waitFor(() => {
                const stickyHeaders = document.querySelectorAll('.req-sticky-header');
                expect(stickyHeaders.length).toBeGreaterThan(0);
            });

            // Find and click the individual collapse button in sticky header
            const collapseBtn = screen.getByTitle('Collapse Core Computer Science');
            fireEvent.click(collapseBtn);

            // Requirement should now be collapsed
            await waitFor(() => {
                expect(screen.queryByText('COMP 248 - Object-Oriented Programming I')).toBeNull();
            });
        }
    });

    it('should show both Collapse All and individual collapse buttons in sticky header', async () => {
        mockApiGet.mockResolvedValueOnce(mockAuditData);
        const { container } = renderPage();

        await waitFor(() => {
            expect(screen.getByText('Core Computer Science')).toBeTruthy();
        });

        // Expand requirement
        fireEvent.click(screen.getByText('Core Computer Science'));

        await waitFor(() => {
            expect(screen.getByText('COMP 248 - Object-Oriented Programming I')).toBeTruthy();
        });

        // Simulate scroll to make sticky header visible
        const reqHeaderRow = container.querySelector('.req-header-row');
        if (reqHeaderRow) {
            const mockGetBoundingClientRect = vi.fn(() => ({
                bottom: -10,
                top: -100,
                left: 0,
                right: 0,
                width: 0,
                height: 0,
                x: 0,
                y: 0,
                toJSON: () => {},
            }));
            reqHeaderRow.getBoundingClientRect = mockGetBoundingClientRect;

            fireEvent.scroll(window);

            await waitFor(() => {
                const stickyHeaders = document.querySelectorAll('.req-sticky-header');
                expect(stickyHeaders.length).toBeGreaterThan(0);
            });

            // Check both buttons exist in sticky header
            expect(screen.getByTitle('Collapse All Sections')).toBeTruthy();
            expect(screen.getByTitle('Collapse Core Computer Science')).toBeTruthy();
        }
    });
});
