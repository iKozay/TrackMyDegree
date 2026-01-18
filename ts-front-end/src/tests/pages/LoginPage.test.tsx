import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginPage from '../../pages/LoginPage';

/* ---------------- Mock hooks and utilities ---------------- */
const mockNavigate = vi.fn();
const mockLocation = { search: '' };
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => mockLocation,
    };
});

const mockLogin = vi.fn();
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => mockUseAuth(),
}));

const mockValidateLoginForm = vi.fn();
vi.mock('../../utils/authUtils', () => ({
    validateLoginForm: (...args: any[]) => mockValidateLoginForm(...args),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

const renderPage = (search = '') => {
    mockLocation.search = search;

    return render(
        <MemoryRouter initialEntries={[`/login${search}`]}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
            </Routes>
        </MemoryRouter>,
    );
};

const fillLoginForm = (email = "test@example.com", password = "password123") => {
    const emailInput = screen.getByPlaceholderText(/Enter your email/i) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(passwordInput, { target: { value: password } });
    return { emailInput, passwordInput };
};

/* ---------------- Tests ---------------- */
describe('LoginPage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mockUseAuth.mockReturnValue({
            login: mockLogin,
            loading: false,
            isAuthenticated: false,
            user: null,
        });
        mockValidateLoginForm.mockReturnValue([]);
    });

    it('renders login form with all fields', () => {
        renderPage();
        expect(screen.getByText('Sign In')).toBeInTheDocument();
        expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
    });

    it('updates form field values on input', () => {
        renderPage();
        const { emailInput, passwordInput } = fillLoginForm('user@test.com', 'secret');
        expect(emailInput.value).toBe('user@test.com');
        expect(passwordInput.value).toBe('secret');
    });

    it('submits form successfully', async () => {
        mockLogin.mockResolvedValueOnce(undefined);
        renderPage();
        fillLoginForm();

        const submitButton = screen.getByRole('button', { name: /Submit/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockValidateLoginForm).toHaveBeenCalledWith('test@example.com', 'password123');
        });

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
        });
    });

    it('displays validation error when form is invalid', async () => {
        mockValidateLoginForm.mockReturnValueOnce(['Invalid email format']);
        renderPage();
        fillLoginForm('invalid-email', '123');

        const submitButton = screen.getByRole('button', { name: /Submit/i });
        const form = submitButton.closest('form')!;
        fireEvent.submit(form);

        await waitFor(() => {
            expect(mockValidateLoginForm).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText('Invalid email format')).toBeInTheDocument();
        });

        expect(mockLogin).not.toHaveBeenCalled();
    });

    it('displays error message when login fails', async () => {
        mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
        renderPage();
        fillLoginForm();

        const submitButton = screen.getByRole('button', { name: /Submit/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });

    it('redirects to student profile when authenticated as student', async () => {
        mockUseAuth.mockReturnValue({
            login: mockLogin,
            loading: false,
            isAuthenticated: true,
            user: { role: 'student' },
        });

        renderPage();

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/profile/student', { replace: true });
        });
    });

    it('redirects to admin profile when authenticated as admin', async () => {
        mockUseAuth.mockReturnValue({
            login: mockLogin,
            loading: false,
            isAuthenticated: true,
            user: { role: 'admin' },
        });

        renderPage();

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/profile/admin', { replace: true });
        });
    });

    it('redirects to redirectTo param if present when authenticated', async () => {
        mockUseAuth.mockReturnValue({
            login: mockLogin,
            loading: false,
            isAuthenticated: true,
            user: { role: 'student' },
        });

        renderPage('?redirectTo=%2Fdashboard');

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
        });
    });

    it('renders sign up link with redirectTo param if present', () => {
        renderPage('?redirectTo=%2Fdashboard');
        const signUpLink = screen.getByText(/Register here!/i);
        expect(signUpLink.closest('a')).toHaveAttribute('href', '/signup?redirectTo=/dashboard');
    });

    it('renders sign up link without redirectTo param if not present', () => {
        renderPage();
        const signUpLink = screen.getByText(/Register here!/i);
        expect(signUpLink.closest('a')).toHaveAttribute('href', '/signup');
    });

    it('renders forgot password link', () => {
        renderPage();
        const forgotLink = screen.getByText(/Forgot your password\?/i);
        expect(forgotLink.closest('a')).toHaveAttribute('href', '/forgot-password');
    });

    it('redirects nowhere if user role is unknown', async () => {
        mockUseAuth.mockReturnValue({
            login: mockLogin,
            loading: false,
            isAuthenticated: true,
            user: { role: 'unknown' },
        });

        renderPage();

        await waitFor(() => {
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    it('renders null when loading', () => {
        mockUseAuth.mockReturnValue({
            login: mockLogin,
            loading: true,
            isAuthenticated: false,
            user: null,
        });

        const { container } = renderPage();
        expect(container.firstChild).toBeNull();
    });
});
