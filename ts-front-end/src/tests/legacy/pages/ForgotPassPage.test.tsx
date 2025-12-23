import { describe, test, expect, vi, beforeEach } from 'vitest';
import ForgotPassPage from '../../../legacy/pages/ForgotPassPage';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { api } from '../../../api/http-api-client';

vi.mock('../../../api/http-api-client', () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

const mockedApi = vi.mocked(api as any);



describe('ForgotPassPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  test('displays title for page correctly', () => {
    render(<ForgotPassPage />);

    expect(screen.getByText('Forgot Your Password?')).toBeInTheDocument();
  });

  test('renders enter email placeholder text for page correctly', () => {
    render(<ForgotPassPage />);

    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  test('displays submit button for page correctly', () => {
    render(<ForgotPassPage />);

    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  test('shows error when email is empty', async () => {
    render(<ForgotPassPage />);

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required.')).toBeInTheDocument();
    });
  });

  test('shows error when email format is invalid', async () => {
    render(<ForgotPassPage />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const form = emailInput.closest('form')!;
    
    // Submit the form
    fireEvent.submit(form);
    
    // Wait for the setTimeout in handleForgotPassword (10ms) plus React state update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
    });

    // The error should be displayed after validation
    // Use findByText which waits for the element to appear
    const errorElement = await screen.findByText(/Please enter a valid email address/i, {}, { timeout: 3000 });
    expect(errorElement).toBeInTheDocument();
  });

  test('successfully submits email and navigates to reset password page', async () => {
      mockedApi.post.mockResolvedValueOnce({ message: 'Email sent successfully' });

      render(<ForgotPassPage />);
      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
          expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'test@example.com' });
          expect(
              screen.getByText('If the email exists, a reset link has been sent. Please check your inbox and spam folder.')
          ).toBeInTheDocument();
          expect(mockNavigate).not.toHaveBeenCalled();
      });
  });

  test('handles API error correctly', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Email does not exist'));

    render(<ForgotPassPage />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
        expect(
            screen.getByText('If the email exists, a reset link has been sent. Please check your inbox and spam folder.')
        ).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('shows loading state when submitting', async () => {
    let resolvePromise: (value?: unknown) => void = () => {};
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockedApi.post.mockReturnValueOnce(promise as any);

    render(<ForgotPassPage />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Sending email...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    resolvePromise({ message: 'Success' });
  });
});
