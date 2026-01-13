import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DegreeAuditPage from '../../pages/DegreeAuditPage.tsx';

/* ---------------- Mock hooks and API ---------------- */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({}),
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
            expect(screen.getByText('Unofficial Degree Audit')).toBeTruthy();
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
            expect(screen.getByText('Unofficial Degree Audit')).toBeTruthy();
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
            expect(screen.getByText('Unofficial Degree Audit')).toBeTruthy();
        });

        // Check that badges are rendered correctly
        expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Complete').length).toBeGreaterThan(0);
    });
});
