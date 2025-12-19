
import ResetPassPage from '../../../legacy/pages/ResetPassPage';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { api } from '../../../api/http-api-client';
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../api/http-api-client', async () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

describe('ResetPassPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  test('displays title for page correctly', () => {
    render(<ResetPassPage />);

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
  });

  test('renders otp code label for page correctly', () => {
    render(<ResetPassPage />);

    expect(screen.getByText('OTP Code:')).toBeInTheDocument();
  });

  test('renders password label for page correctly', () => {
    render(<ResetPassPage />);

    expect(screen.getByText('Password:')).toBeInTheDocument();
  });

  test('renders Confirm password label for page correctly', () => {
    render(<ResetPassPage />);

    expect(screen.getByText('Confirm Password:')).toBeInTheDocument();
  });

  test('renders otp placeholder text for page correctly', () => {
    render(<ResetPassPage />);

    expect(screen.getByPlaceholderText('* Enter your OTP')).toBeInTheDocument();
  });

  test('renders password placeholder text for page correctly', () => {
    render(<ResetPassPage />);

    expect(screen.getByPlaceholderText('* Enter your password')).toBeInTheDocument();
  });

  test('renders confirm password placeholder text for page correctly', () => {
    render(<ResetPassPage />);

    expect(screen.getByPlaceholderText('* Confirm your password')).toBeInTheDocument();
  });

  test('displays submit button for page correctly', () => {
    render(<ResetPassPage />);

    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  test('shows error when all fields are empty', async () => {
    render(<ResetPassPage />);

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('All fields are required.')).toBeInTheDocument();
    });
  });

  test('shows error when OTP is not 4 digits', async () => {
    render(<ResetPassPage />);

    const otpInput = screen.getByPlaceholderText('* Enter your OTP');
    fireEvent.change(otpInput, { target: { value: '123' } });

    const passwordInput = screen.getByPlaceholderText('* Enter your password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const confirmPasswordInput = screen.getByPlaceholderText('* Confirm your password');
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('OTP must be 4 digits long.')).toBeInTheDocument();
    });
  });

  test('shows error when passwords do not match', async () => {
    render(<ResetPassPage />);

    const otpInput = screen.getByPlaceholderText('* Enter your OTP');
    fireEvent.change(otpInput, { target: { value: '1234' } });

    const passwordInput = screen.getByPlaceholderText('* Enter your password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const confirmPasswordInput = screen.getByPlaceholderText('* Confirm your password');
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
  });

  test('successfully resets password and navigates to signin', async () => {
    // Set email in localStorage as required by the component
    localStorage.setItem('resetPasswordEmail', 'test@example.com');
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ message: 'Password reset successfully' });

    render(<ResetPassPage />);

    const otpInput = screen.getByPlaceholderText('* Enter your OTP');
    fireEvent.change(otpInput, { target: { value: '1234' } });

    const passwordInput = screen.getByPlaceholderText('* Enter your password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const confirmPasswordInput = screen.getByPlaceholderText('* Confirm your password');
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        email: 'test@example.com',
        otp: '1234',
        newPassword: 'password123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/signin');
    });

    // Cleanup
    localStorage.removeItem('resetPasswordEmail');
  });

  test('handles API error correctly', async () => {
    // Set email in localStorage as required by the component
    localStorage.setItem('resetPasswordEmail', 'test@example.com');
    (api.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Invalid OTP'));

    render(<ResetPassPage />);

    const otpInput = screen.getByPlaceholderText('* Enter your OTP');
    fireEvent.change(otpInput, { target: { value: '1234' } });

    const passwordInput = screen.getByPlaceholderText('* Enter your password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const confirmPasswordInput = screen.getByPlaceholderText('* Confirm your password');
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid OTP')).toBeInTheDocument();
    });

    // Cleanup
    localStorage.removeItem('resetPasswordEmail');
  });

  test('clears error when input changes', async () => {
    render(<ResetPassPage />);

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('All fields are required.')).toBeInTheDocument();
    });

    const otpInput = screen.getByPlaceholderText('* Enter your OTP');
    fireEvent.change(otpInput, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.queryByText('All fields are required.')).not.toBeInTheDocument();
    });
  });

  test('shows loading state when submitting', async () => {
    // Set email in localStorage as required by the component
    localStorage.setItem('resetPasswordEmail', 'test@example.com');
    let resolvePromise: ((value: unknown) => void) | undefined;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (api.post as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

    render(<ResetPassPage />);

    const otpInput = screen.getByPlaceholderText('* Enter your OTP');
    fireEvent.change(otpInput, { target: { value: '1234' } });

    const passwordInput = screen.getByPlaceholderText('* Enter your password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const confirmPasswordInput = screen.getByPlaceholderText('* Confirm your password');
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Resetting Password...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    if (resolvePromise) resolvePromise({ message: 'Success' });

    // Cleanup
    localStorage.removeItem('resetPasswordEmail');
  });

  test('shows error when email is not found in localStorage', async () => {
    // Ensure email is not in localStorage
    localStorage.removeItem('resetPasswordEmail');

    render(<ResetPassPage />);

    const otpInput = screen.getByPlaceholderText('* Enter your OTP');
    fireEvent.change(otpInput, { target: { value: '1234' } });

    const passwordInput = screen.getByPlaceholderText('* Enter your password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const confirmPasswordInput = screen.getByPlaceholderText('* Confirm your password');
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email not found. Please start the password reset process again.')).toBeInTheDocument();
    });

    expect(api.post).not.toHaveBeenCalled();
  });
});
