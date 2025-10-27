import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthContext } from '../middleware/AuthContext';

jest.mock('../api/auth_api', () => ({
  signupUser: jest.fn(),
}));

jest.mock('../utils/authUtils', () => ({
  validateSignupForm: jest.fn(),
  hashPassword: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import SignUpPage from '../pages/SignUpPage';
import { signupUser } from '../api/auth_api';
import { validateSignupForm, hashPassword } from '../utils/authUtils';

// Mocking the login function and navigate
const mockLogin = jest.fn();
const mockNavigate = jest.fn();

describe('SignUpPage', () => {
  // render component with mocked login
  const renderComponent = (isLoggedIn = false) => {
    render(
      <AuthContext.Provider value={{ login: mockLogin, isLoggedIn }}>
        <SignUpPage />
      </AuthContext.Provider>,
    );
  };

  beforeEach(() => {
    // Clear all mocks before each test
    mockLogin.mockClear();
    mockNavigate.mockClear();
    
    // Reset mocks for API and utilities
    signupUser.mockClear();
    validateSignupForm.mockClear();
    hashPassword.mockClear();
    
    // Default mock implementations
    validateSignupForm.mockReturnValue([]);
    // hashPassword is now async, so use mockResolvedValue
    hashPassword.mockResolvedValue('hashedPassword123');
  });

  // text checks
  test('renders signup text for page correctly', () => {
    renderComponent();

    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  test('renders enter name label for page correctly', () => {
    renderComponent();

    expect(screen.getByText('Full Name')).toBeInTheDocument();
  });

  test('renders enter email label for page correctly', () => {
    renderComponent();

    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  test('renders enter password label for page correctly', () => {
    renderComponent();

    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  test('renders confirm password label for page correctly', () => {
    renderComponent();

    expect(screen.getByText('Confirm Password')).toBeInTheDocument();
  });

  test('renders register button for page correctly', () => {
    renderComponent();

    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  test('should redirect to /user if already logged in', () => {
    renderComponent(true); // Pass isLoggedIn = true
    
    expect(mockNavigate).toHaveBeenCalledWith('/user');
  });

  // field checks
  test('renders enter name placeholder text for page correctly', () => {
    renderComponent();

    expect(screen.getByPlaceholderText('* Enter your full name')).toBeInTheDocument();
  });

  test('renders enter email placeholder text for page correctly', () => {
    renderComponent();

    expect(screen.getByPlaceholderText('* Enter your email')).toBeInTheDocument();
  });

  test('renders enter password placeholder text for page correctly', () => {
    renderComponent();

    expect(screen.getByPlaceholderText('* Enter your password')).toBeInTheDocument();
  });

  test('renders confirm password placeholder text for page correctly', () => {
    renderComponent();

    expect(screen.getByPlaceholderText('* Confirm your password')).toBeInTheDocument();
  });

  // check validation errors
  test('shows alert when fields are empty', async () => {
    renderComponent();
    
    // Set up the mock AFTER rendering
    validateSignupForm.mockReturnValue(['All fields are required.']);

    fireEvent.click(screen.getByText('Register'));

    expect(await screen.findByText('All fields are required.')).toBeInTheDocument();
    expect(validateSignupForm).toHaveBeenCalledWith('', '', '', '');
    expect(signupUser).not.toHaveBeenCalled();
  });

  test('shows alert when name field is missing', async () => {
    renderComponent();
    
    validateSignupForm.mockReturnValue(['All fields are required.']);

    fireEvent.change(screen.getByPlaceholderText('* Enter your email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByText('Register'));

    expect(await screen.findByText('All fields are required.')).toBeInTheDocument();
    expect(validateSignupForm).toHaveBeenCalledWith('', 'user@example.com', 'password123', 'password123');
    expect(signupUser).not.toHaveBeenCalled();
  });

  test('shows alert when email field is missing', async () => {
    renderComponent();
    
    validateSignupForm.mockReturnValue(['All fields are required.']);

    fireEvent.change(screen.getByPlaceholderText('* Enter your full name'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByText('Register'));

    expect(await screen.findByText('All fields are required.')).toBeInTheDocument();
    expect(validateSignupForm).toHaveBeenCalledWith('John Doe', '', 'password123', 'password123');
    expect(signupUser).not.toHaveBeenCalled();
  });

  test('shows alert when password field is missing', async () => {
    renderComponent();
    
    validateSignupForm.mockReturnValue(['All fields are required.']);

    fireEvent.change(screen.getByPlaceholderText('* Enter your full name'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), {
      target: { value: 'password456' },
    });

    fireEvent.click(screen.getByText('Register'));

    expect(await screen.findByText('All fields are required.')).toBeInTheDocument();
    expect(validateSignupForm).toHaveBeenCalledWith('John Doe', 'user@example.com', '', 'password456');
    expect(signupUser).not.toHaveBeenCalled();
  });

  test('shows alert when confirm password field is missing', async () => {
    renderComponent();
    
    validateSignupForm.mockReturnValue(['All fields are required.']);

    fireEvent.change(screen.getByPlaceholderText('* Enter your full name'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByText('Register'));

    expect(await screen.findByText('All fields are required.')).toBeInTheDocument();
    expect(validateSignupForm).toHaveBeenCalledWith('John Doe', 'user@example.com', 'password123', '');
    expect(signupUser).not.toHaveBeenCalled();
  });

  test('shows alert when passwords do not match', async () => {
    renderComponent();
    
    validateSignupForm.mockReturnValue(['Passwords do not match.']);

    // invalid credentials (different passwords)
    fireEvent.change(screen.getByPlaceholderText('* Enter your full name'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), {
      target: { value: 'password456' },
    });

    fireEvent.click(screen.getByText('Register'));

    // alert is shown for password mismatch
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(validateSignupForm).toHaveBeenCalledWith('John Doe', 'user@example.com', 'password123', 'password456');
    expect(signupUser).not.toHaveBeenCalled();
  });

  test('calls login and navigate on successful signup', async () => {
    renderComponent();
    
    // Set up mocks for successful signup
    validateSignupForm.mockReturnValue([]);
    hashPassword.mockResolvedValue('hashedPassword123');
    signupUser.mockResolvedValue({
      token: 'fake-token',
      user: { id: 1, name: 'John Doe' },
    });

    // valid credentials
    fireEvent.change(screen.getByPlaceholderText('* Enter your full name'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(validateSignupForm).toHaveBeenCalledWith('John Doe', 'user@example.com', 'password123', 'password123');
      expect(hashPassword).toHaveBeenCalledWith('password123');
      expect(signupUser).toHaveBeenCalledWith('John Doe', 'user@example.com', 'hashedPassword123', 'student');
      expect(mockLogin).toHaveBeenCalledWith({
        token: 'fake-token',
        user: { id: 1, name: 'John Doe' },
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/user');
  });

  test('shows alert when signup API fails', async () => {
    renderComponent();
    
    // Set up mocks for failed signup
    validateSignupForm.mockReturnValue([]);
    hashPassword.mockResolvedValue('hashedPassword123');
    signupUser.mockRejectedValue(new Error('Email already exists'));

    fireEvent.change(screen.getByPlaceholderText('* Enter your full name'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your email'), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Register'));

    expect(await screen.findByText('Email already exists')).toBeInTheDocument();
    expect(validateSignupForm).toHaveBeenCalledWith('John Doe', 'existing@example.com', 'password123', 'password123');
    expect(hashPassword).toHaveBeenCalledWith('password123');
    expect(signupUser).toHaveBeenCalledWith('John Doe', 'existing@example.com', 'hashedPassword123', 'student');
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // check sign in link
  test('renders already havea account text for page correctly', async () => {
    renderComponent();

    expect(screen.getByText('Already have an account? Log in here!')).toBeInTheDocument();
  });

  test('renders login link with correct href', () => {
    renderComponent();

    const loginLink = screen.getByText('Already have an account? Log in here!');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.getAttribute('href')).toBe('/signin');
  });

  test('calls navigate to signin when Cancel button is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockNavigate).toHaveBeenCalledWith('/signin');
  });

  test('clears error state when submitting form', async () => {
    renderComponent();
    
    // First submit to create an error
    validateSignupForm.mockReturnValue(['Some validation error']);
    fireEvent.click(screen.getByText('Register'));
    expect(await screen.findByText('Some validation error')).toBeInTheDocument();
    
    // Now submit again - the error should be cleared first
    validateSignupForm.mockReturnValue(['Another error']);
    fireEvent.click(screen.getByText('Register'));
    expect(await screen.findByText('Another error')).toBeInTheDocument();
    
    // Verify the component called validation again
    expect(validateSignupForm).toHaveBeenCalledTimes(2);
  });

  test('updates form fields correctly', () => {
    renderComponent();

    const fullnameInput = screen.getByPlaceholderText('* Enter your full name');
    const emailInput = screen.getByPlaceholderText('* Enter your email');
    const passwordInput = screen.getByPlaceholderText('* Enter your password');
    const confirmPasswordInput = screen.getByPlaceholderText('* Confirm your password');

    fireEvent.change(fullnameInput, { target: { value: 'Jane Doe' } });
    fireEvent.change(emailInput, { target: { value: 'jane@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

    expect(fullnameInput.value).toBe('Jane Doe');
    expect(emailInput.value).toBe('jane@test.com');
    expect(passwordInput.value).toBe('newpass123');
    expect(confirmPasswordInput.value).toBe('newpass123');
  });

  test('handles hashPassword failure gracefully', async () => {
    renderComponent();
    
    validateSignupForm.mockReturnValue([]);
    hashPassword.mockRejectedValue(new Error('Hashing failed'));

    fireEvent.change(screen.getByPlaceholderText('* Enter your full name'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your email'), {
      target: { value: 'john@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Register'));

    expect(await screen.findByText('Hashing failed')).toBeInTheDocument();
    expect(hashPassword).toHaveBeenCalledWith('password123');
    expect(signupUser).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('/user');
  });
});
