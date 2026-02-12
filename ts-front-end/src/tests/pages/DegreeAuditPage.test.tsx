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
});
