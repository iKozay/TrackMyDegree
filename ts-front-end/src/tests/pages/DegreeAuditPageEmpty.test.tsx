import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
    }),
}));

// Mock the API to return empty requirements
vi.mock('../../api/http-api-client', () => ({
    api: {
        get: vi.fn().mockResolvedValue({
            student: {
                name: 'Empty Student',
                program: 'Test Program',
            },
            progress: {
                completed: 0,
                inProgress: 0,
                remaining: 120,
                total: 120,
                percentage: 0,
            },
            notices: [],
            requirements: [], // Empty requirements to trigger empty state
        }),
    },
}));

// Import the component AFTER mocking
import DegreeAuditPage from '../../pages/DegreeAuditPage';

describe('DegreeAuditPage - Empty State', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should show empty state when data has no requirements', async () => {
        render(
            <MemoryRouter>
                <DegreeAuditPage />
            </MemoryRouter>
        );

        // Wait for the API call to complete and component to render
        await waitFor(() => {
            expect(screen.getByText('No Assessment Data Found')).toBeTruthy();
        });

        expect(screen.getByText(/We couldn't find any degree assessment information/)).toBeTruthy();
        expect(screen.getByText('Generate Assessment')).toBeTruthy();
    });
});
