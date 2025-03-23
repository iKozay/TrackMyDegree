import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignUpPage from '../pages/SignUpPage';
import { AuthContext } from '../AuthContext'; // Correct path to AuthContext

// Mocking the login function and navigate
const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// render component with mocked login
const renderComponent = () => {
  render(
    <AuthContext.Provider value={{ login: mockLogin }}>
      <SignUpPage />
    </AuthContext.Provider>,
  );
};

describe('SignUpPage', () => {
  beforeEach(() => {
    mockLogin.mockClear();
    mockNavigate.mockClear();
    global.alert = jest.fn();
  });

  test('renders page correctly', () => {
    renderComponent();

    // Check if elements are rendered correctly
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('* Enter your email'),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('* Enter your password'),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('* Confirm your password'),
    ).toBeInTheDocument();
  });

  test('shows alert when fields are empty', () => {
    renderComponent();

    fireEvent.click(screen.getByText('Register'));

    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
  });

  test('shows alert when passwords do not match', () => {
    renderComponent();

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
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
  });

  test('calls login and navigate on successful signup', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            token: 'fake-token',
            user: { id: 1, name: 'John Doe' },
          }),
      }),
    );

    renderComponent();

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
      expect(mockLogin).toHaveBeenCalledWith({
        token: 'fake-token',
        user: { id: 1, name: 'John Doe' },
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/user');
  });
});
