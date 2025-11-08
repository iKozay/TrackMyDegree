import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthContext } from '../middleware/AuthContext';

jest.mock('../api/auth_api', () => ({
  loginUser: jest.fn(),
}));

jest.mock('../utils/authUtils', () => ({
  validateLoginForm: jest.fn(),
  hashPassword: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import LogInPage from '../pages/LogInPage';
import { loginUser } from '../api/auth_api';
import { validateLoginForm, hashPassword } from '../utils/authUtils';

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

describe('LogInPage', () => {
  // Render page component while mocking login
  const renderComponent = (isLoggedIn = false) => {
    render(
      <AuthContext.Provider value={{ login: mockLogin, isLoggedIn }}>
        <LogInPage />
      </AuthContext.Provider>,
    );
  };

  beforeEach(() => {
    // Clear all mocks before each test
    mockLogin.mockClear();
    mockNavigate.mockClear();

    // Reset mocks for API and utilities
    loginUser.mockClear();
    validateLoginForm.mockClear();
    hashPassword.mockClear();

    // Default mock implementations
    validateLoginForm.mockReturnValue([]);
    hashPassword.mockResolvedValue('hashedPassword123');
  });

  test('should render the signin text for LogInPage correctly', () => {
    renderComponent();

    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
  });

  test('should render the email label for LogInPage correctly', () => {
    renderComponent();

    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
  });

  test('should render the password label for LogInPage correctly', () => {
    renderComponent();

    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  test('should render the submit button for LogInPage correctly', () => {
    renderComponent();

    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  test('should redirect to /user if already logged in', () => {
    renderComponent(true); // Pass isLoggedIn = true

    expect(mockNavigate).toHaveBeenCalledWith('/user');
  });

  test('should update email field correctly', () => {
    renderComponent();

    const emailInput = screen.getByLabelText(/Email address/i);

    fireEvent.change(emailInput, { target: { value: 'admin@gmail.com' } });

    // email value is updated
    expect(emailInput.value).toBe('admin@gmail.com');
  });

  test('should update password field correctly', () => {
    renderComponent();

    const passwordInput = screen.getByLabelText(/Password/i);

    fireEvent.change(passwordInput, { target: { value: 'admin' } });

    // password value is updated
    expect(passwordInput.value).toBe('admin');
  });

  test('should display validation error when fields are empty', async () => {
    renderComponent();

    // Set up the mock AFTER rendering
    validateLoginForm.mockReturnValue(['Both email and password are required.']);

    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Both email and password are required.')).toBeInTheDocument();
    expect(validateLoginForm).toHaveBeenCalledWith('', '');
    expect(loginUser).not.toHaveBeenCalled();
  });

  test('should call validateLoginForm with correct parameters and not call loginUser when validation passes', async () => {
    renderComponent();

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(emailInput, { target: { value: 'valid@email.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Set up successful scenario
    loginUser.mockResolvedValue({ token: 'test' });

    fireEvent.click(submitButton);

    // Verify validation is called and login proceeds
    await waitFor(() => {
      expect(validateLoginForm).toHaveBeenCalledWith('valid@email.com', 'password123');
      expect(loginUser).toHaveBeenCalled();
    });
  });

  test('should call login and navigate to user page on successful login', async () => {
    const mockResponse = {
      token: 'fake-token',
      user: { id: 1, name: 'John Doe' },
    };

    loginUser.mockResolvedValue(mockResponse);

    renderComponent();

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    // Correct credentials
    fireEvent.change(emailInput, { target: { value: 'admin@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'admin' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith('admin@gmail.com', 'admin');
      expect(mockLogin).toHaveBeenCalledWith(mockResponse);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/user');
  });

  test('should display an error message on login failure', async () => {
    loginUser.mockRejectedValue(new Error('Invalid credentials.'));

    renderComponent();

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    // Incorrect credentials
    fireEvent.change(emailInput, { target: { value: 'wrongemail@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Invalid credentials.')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('/user');
  });

  // check sign up link
  test("renders don't have an account text for page correctly", async () => {
    renderComponent();

    expect(screen.getByText("Don't have an account? Register here!")).toBeInTheDocument();
  });

  test('renders signup link correctly', () => {
    renderComponent();

    const signupLink = screen.getByText("Don't have an account? Register here!");
    expect(signupLink).toBeInTheDocument();
    expect(signupLink.getAttribute('href')).toBe('/signup');
  });

  // check forgot password link
  test('renders forgot password text for page correctly', () => {
    renderComponent();

    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
  });

  test('renders forgot password link correctly', () => {
    renderComponent();

    const forgotLink = screen.getByText('Forgot your password?');
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink.getAttribute('href')).toBe('/forgot-password');
  });

  test('should show loading state during login process', async () => {
    loginUser.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Logging in...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });


  test('should reset error state on form submission', async () => {
    validateLoginForm.mockReturnValue(['Some error']);

    renderComponent();

    const submitButton = screen.getByRole('button', { name: /Submit/i });

    // First submission with error
    fireEvent.click(submitButton);
    expect(await screen.findByText('Some error')).toBeInTheDocument();

    // Reset validation and try again
    validateLoginForm.mockReturnValue([]);
    loginUser.mockResolvedValue({ token: 'test' });

    fireEvent.click(submitButton);

    // Error should disappear
    await waitFor(() => {
      expect(screen.queryByText('Some error')).not.toBeInTheDocument();
    });
  });
});
