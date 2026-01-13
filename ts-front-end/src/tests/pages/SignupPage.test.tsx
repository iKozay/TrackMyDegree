import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import SignupPage from '../../pages/SignupPage';

/* ---------------- Mock hooks and utilities ---------------- */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockSignup = vi.fn();
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockValidateSignupForm = vi.fn();
vi.mock('../../utils/authUtils', () => ({
  validateSignupForm: (...args: any[]) => mockValidateSignupForm(...args),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const renderPage = () => {
  return render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>,
  );
};

const fillSignupForm = (
  name: string = "John Doe",
  email: string = "john@example.com",
  password: string = "password123",
  confirmPassword: string = "password123"
) => {
    const nameInput: HTMLInputElement = screen.getByPlaceholderText(/Enter your full name/i);
    const emailInput: HTMLInputElement = screen.getByPlaceholderText(/Enter your email/i);
    const passwordInput: HTMLInputElement = screen.getByPlaceholderText(/Enter your password/i);
    const confirmPasswordInput: HTMLInputElement = screen.getByPlaceholderText(/Confirm your password/i);

    fireEvent.change(nameInput, { target: { value: name } });
    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(passwordInput, { target: { value: password } });
    fireEvent.change(confirmPasswordInput, { target: { value: confirmPassword } });
    return { nameInput, emailInput, passwordInput, confirmPasswordInput };
};

/* ---------------- Tests ---------------- */
describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      signup: mockSignup,
      loading: false,
      isAuthenticated: false,
    });
    mockValidateSignupForm.mockReturnValue([]);
  });

  test('renders signup form with all fields', () => {
    renderPage();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
  });

  test('updates form field values on input', () => {
    renderPage();
    const { nameInput, emailInput, passwordInput, confirmPasswordInput } = fillSignupForm();
    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john@example.com');
    expect(passwordInput.value).toBe('password123');
    expect(confirmPasswordInput.value).toBe('password123');
  });

  test('submits form successfully and navigates to profile', async () => {
    mockSignup.mockResolvedValueOnce(undefined);

    renderPage();

    fillSignupForm();
    
    const registerButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(mockValidateSignupForm).toHaveBeenCalledWith('John Doe', 'john@example.com', 'password123', 'password123');
    });

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/profile/student', { replace: true });
  });

  test('displays validation error when form is invalid', async () => {
    mockValidateSignupForm.mockReturnValueOnce(['Passwords do not match']);

    renderPage();
    
    fillSignupForm('John Doe', 'john@example.com', 'password123', 'different');

    const registerButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('displays error message when signup fails', async () => {
    mockSignup.mockRejectedValueOnce(new Error('Email already exists'));

    renderPage();

    fillSignupForm();

    const registerButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  test('cancel button navigates to signin page', () => {
    renderPage();

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/signin');
  });

  test('renders link to signin page', () => {
    renderPage();

    const signinLink = screen.getByText(/Already have an account\? Log in here!/i);
    expect(signinLink).toBeInTheDocument();
    expect(signinLink.closest('a')).toHaveAttribute('href', '/signin');
  });

  test('redirects to profile when already authenticated', () => {
    mockUseAuth.mockReturnValue({
      signup: mockSignup,
      loading: false,
      isAuthenticated: true,
    });

    renderPage();

    expect(mockNavigate).toHaveBeenCalledWith('/profile/student', { replace: true });
  });
});
