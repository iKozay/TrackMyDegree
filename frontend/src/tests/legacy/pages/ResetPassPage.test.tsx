
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
  useParams: () => ({ token: 'mock-token-123' }),
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

  test('renders password label for page correctly', () => {
    render(<ResetPassPage />);

    expect(screen.getByText('Password:')).toBeInTheDocument();
  });

  test('renders Confirm password label for page correctly', () => {
    render(<ResetPassPage />);

    expect(screen.getByText('Confirm Password:')).toBeInTheDocument();
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

  test('shows error when passwords do not match', async () => {
      render(<ResetPassPage />);
      fireEvent.change(screen.getByPlaceholderText('* Enter your password'), { target: { value: 'password123' } });
      fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), { target: { value: 'password456' } });
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => {
          expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
      });
  });

  test('successfully resets password and navigates to signin', async () => {
      (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ message: 'Password reset successfully' });

      render(<ResetPassPage />);
      fireEvent.change(screen.getByPlaceholderText('* Enter your password'), { target: { value: 'password123' } });
      fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
          expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
              resetToken: 'mock-token-123',
              newPassword: 'password123',
          });
          expect(mockNavigate).toHaveBeenCalledWith('/signin');
      });
  });

  test('handles API error correctly', async () => {
      (api.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));

      render(<ResetPassPage />);
      fireEvent.change(screen.getByPlaceholderText('* Enter your password'), { target: { value: 'password123' } });
      fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
          expect(
              screen.getByText('Unable to reset password. Your link may have expired. Please request a new password reset.')
          ).toBeInTheDocument();
      });
  });

  test('clears error when input changes', async () => {
      render(<ResetPassPage />);
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => {
          expect(screen.getByText('All fields are required.')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByPlaceholderText('* Enter your password'), { target: { value: 'p' } });
      await waitFor(() => {
          expect(screen.queryByText('All fields are required.')).not.toBeInTheDocument();
      });
  });

  test('shows loading state when submitting', async () => {
      let resolvePromise: ((value: unknown) => void) | undefined;
      const promise = new Promise((resolve) => {
          resolvePromise = resolve;
      });
      (api.post as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

      render(<ResetPassPage />);
      const submitButton = screen.getByText('Submit');

      fireEvent.change(screen.getByPlaceholderText('* Enter your password'), { target: { value: 'password123' } });
      fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
          expect(screen.getByText('Resetting Password...')).toBeInTheDocument();
          expect(submitButton).toBeDisabled();
      });

      if (resolvePromise) resolvePromise({ message: 'Success' });
  });
});
