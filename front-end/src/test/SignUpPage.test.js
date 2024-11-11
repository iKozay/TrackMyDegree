import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
    </AuthContext.Provider>
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
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
  });

  test('shows alert when fields are empty', () => {
    renderComponent();

    fireEvent.click(screen.getByText('Submit'));

    expect(global.alert).toHaveBeenCalledWith('All fields are required.');
  });

  test('shows alert when passwords do not match', () => {
    renderComponent();

    // invalid credentials (different passwords)
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'password456' } });

    
    fireEvent.click(screen.getByText('Submit'));

    // alert is shown for password mismatch
    expect(global.alert).toHaveBeenCalledWith('Passwords do not match.');
  });

  test('calls login and navigate on successful signup', () => {
    renderComponent();

    // valid credentials
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Submit'));

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/user');
  });
  
});