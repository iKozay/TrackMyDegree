import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminPage from '../../pages/AdminPage';
import { useAuth } from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth');
vi.mock('../../legacy/pages/AdminPage.jsx', () => ({
    default: () => <div data-testid="legacy-admin-page">Legacy Admin Page</div>
}));

describe('AdminPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should show login message when not authenticated', () => {
        vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as any);

        render(<AdminPage />);
        expect(screen.getByText('Please log in to see your data.')).toBeTruthy();
    });

    it('should render LegacyAdminPage when authenticated', () => {
        vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);

        render(<AdminPage />);
        expect(screen.getByTestId('legacy-admin-page')).toBeTruthy();
    });
});
