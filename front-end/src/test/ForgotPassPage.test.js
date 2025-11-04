import React from 'react';
import ForgotPassPage from '../pages/ForgotPassPage';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { api } from '../api/http-api-client';

jest.mock('../api/http-api-client', () => ({
  api: {
    post: jest.fn(),
  },
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const createMockHeaders = () => ({
  get: (name) => {
    if (name === 'Content-Type') return 'application/json';
    return null;
  },
});

describe('ForgotPassPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Use a more flexible matcher
      const errorElement = screen.getByText(/Please enter a valid email address/i);
      expect(errorElement).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('successfully submits email and navigates to reset password page', async () => {
    api.post.mockResolvedValueOnce({ message: 'Email sent successfully' });

    render(<ForgotPassPage />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/reset-password');
    });
  });

  test('handles API error correctly', async () => {
    api.post.mockRejectedValueOnce(new Error('Email does not exist'));

    render(<ForgotPassPage />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email does not exist')).toBeInTheDocument();
    });
  });

  test('shows loading state when submitting', async () => {
    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    api.post.mockReturnValueOnce(promise);

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
