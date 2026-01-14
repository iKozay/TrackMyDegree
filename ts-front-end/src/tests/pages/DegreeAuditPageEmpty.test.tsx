import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the JSON data BEFORE importing the component
vi.mock('../../mock/degreeAuditResponse.json', () => ({
    default: {
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
    },
}));

// Import the component AFTER mocking
import DegreeAuditPage from '../../pages/DegreeAuditPage';

describe('DegreeAuditPage - Empty State', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should show empty state when data has no requirements', async () => {
        // Mock Math.random to ensure no error occurs (fetch success)
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        render(<DegreeAuditPage />);

        // Advance timers to simulate fetch completion
        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        // Should show empty state
        expect(screen.getByText('No Audit Data Found')).toBeTruthy();
        expect(screen.getByText(/We couldn't find any degree audit information/)).toBeTruthy();
        expect(screen.getByText('Generate Audit')).toBeTruthy();
    });
});
