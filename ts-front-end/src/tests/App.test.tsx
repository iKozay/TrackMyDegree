import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { MemoryRouter } from 'react-router-dom';

vi.mock('posthog-js', () => ({
    default: {
        init: vi.fn(),
        capture: vi.fn(),
    }
}));

// Mock AuthProvider to avoid network calls
vi.mock('../providers/authProvider', () => ({
    AuthProvider: ({ children }: any) => <div data-testid="auth-provider">{children}</div>
}));

// Mock useAuth to provide auth context
vi.mock('../hooks/useAuth', () => ({
    useAuth: () => ({
        isAuthenticated: true,
        user: { id: 'test-id', name: 'Test User', role: 'student' },
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
    }),
}));

// Mock components
vi.mock('../pages/LandingPage', () => ({ default: () => <div data-testid="landing-page">Landing Page</div> }));
vi.mock('../pages/LoginPage', () => ({ default: () => <div data-testid="login-page">Login Page</div> }));
vi.mock('../pages/DegreeAuditPage', () => ({ default: () => <div data-testid="degree-audit-page">Degree Audit Page</div> }));
vi.mock('../components/NavBar', () => ({ Navbar: () => <nav data-testid="navbar" role="navigation">Navbar</nav> }));
vi.mock('../components/Footer', () => ({ Footer: () => <footer data-testid="footer" role="contentinfo">Footer</footer> }));
vi.mock('../components/DashboardLayout/DashboardLayout', () => ({ default: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div> }));

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render landing page by default', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        );
        expect(screen.getByTestId('landing-page')).toBeTruthy();
    });

    it('should show Navbar and Footer on non-dashboard pages', () => {
        render(
            <MemoryRouter initialEntries={['/signin']}>
                <App />
            </MemoryRouter>
        );
        expect(screen.getByTestId('navbar')).toBeTruthy();
        expect(screen.getByTestId('footer')).toBeTruthy();
    });

    it('should render protected routes when authenticated', () => {
        render(
            <MemoryRouter initialEntries={['/degree-audit']}>
                <App />
            </MemoryRouter>
        );
        // Navbar and Footer are rendered on all pages including protected routes
        expect(screen.getByTestId('navbar')).toBeTruthy();
        expect(screen.getByTestId('footer')).toBeTruthy();
        expect(screen.getByTestId('degree-audit-page')).toBeTruthy();
    });
});
