import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('posthog-js', () => ({
    default: {
        init: vi.fn(),
        capture: vi.fn(),
    }
}));

import posthog from 'posthog-js';

// Mock AuthProvider to avoid network calls
vi.mock('../providers/authProvider', () => ({
    AuthProvider: ({ children }: any) => <div data-testid="auth-provider">{children}</div>
}));

// Mock components
vi.mock('../pages/LandingPage', () => ({ default: () => <div data-testid="landing-page">Landing Page</div> }));
vi.mock('../pages/LoginPage', () => ({ default: () => <div data-testid="login-page">Login Page</div> }));
vi.mock('../pages/DegreeAuditPage', () => ({ default: () => <div data-testid="degree-audit-page">Degree Audit Page</div> }));
vi.mock('../components/NavBar', () => ({ Navbar: () => <nav data-testid="navbar" role="navigation">Navbar</nav> }));
vi.mock('../components/Footer', () => ({ Footer: () => <footer data-testid="footer" role="contentinfo">Footer</footer> }));
vi.mock('../components/DashboardLayout.tsx', () => ({ default: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div> }));

async function renderApp(path: string) {
    vi.resetModules();
    const App = (await import('../App')).default;
    render(
        <MemoryRouter initialEntries={[path]}>
            <App />
        </MemoryRouter>
    );
}

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(posthog.init).mockClear();
        vi.mocked(posthog.capture).mockClear();
        window.__ENV__ = {
            NODE_ENV: 'development',
            POSTHOG_KEY: 'ph-key',
            POSTHOG_HOST: 'https://ph.example.com',
        };
    });

    it('should render landing page by default', async () => {
        await renderApp('/');
        expect(screen.getByTestId('landing-page')).toBeTruthy();
    });

    it('should show Navbar and Footer on non-dashboard pages', async () => {
        await renderApp('/signin');
        expect(screen.getByTestId('navbar')).toBeTruthy();
        expect(screen.getByTestId('footer')).toBeTruthy();
    });

    it('should not show Navbar and Footer on dashboard pages', async () => {
        await renderApp('/degree-audit');
        expect(screen.queryByTestId('navbar')).toBeNull();
        expect(screen.queryByTestId('footer')).toBeNull();
        expect(screen.getByTestId('degree-audit-page')).toBeTruthy();
    });

    it('initializes and captures posthog in production', async () => {
        window.__ENV__ = {
            NODE_ENV: 'production',
            POSTHOG_KEY: 'ph-key',
            POSTHOG_HOST: 'https://ph.example.com',
        };
        await renderApp('/');
        expect(posthog.init).toHaveBeenCalledWith('ph-key', {
            api_host: 'https://ph.example.com',
        });
        await waitFor(() => {
            expect(posthog.capture).toHaveBeenCalledWith(
                'app_loaded',
                expect.objectContaining({ NODE_ENV: 'production' })
            );
        });
    });

    it('does not initialize posthog in development', async () => {
        window.__ENV__ = {
            NODE_ENV: 'development',
            POSTHOG_KEY: 'ph-key',
            POSTHOG_HOST: 'https://ph.example.com',
        };
        await renderApp('/');
        expect(posthog.init).not.toHaveBeenCalled();
    });
});
