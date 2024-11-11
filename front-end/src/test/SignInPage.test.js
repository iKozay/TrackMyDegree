import React from "react";
import SignInPage from "../pages/SignInPage";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthContext } from "../AuthContext";

// Mocking the login function and useNavigate hook
const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('SignInPage', () => {
  // Render page component while mocking login
  const renderComponent = () => {
    render(
      <AuthContext.Provider value={{ login: mockLogin }}>
        <SignInPage />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    // Clear all mocks before each test
    mockLogin.mockClear();
    mockNavigate.mockClear();
  });

  test('should render the SignInPage correctly', () => {
    renderComponent();
    
    expect(screen.getByText(/Log In/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  test('should update email and password fields correctly', () => {
    renderComponent();
    
    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    fireEvent.change(emailInput, { target: { value: 'admin@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'admin' } });

    // email and password values are updated
    expect(emailInput.value).toBe('admin@gmail.com');
    expect(passwordInput.value).toBe('admin');
  });

  test('should call login and navigate to user page on successful login', async () => {
    renderComponent();

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    // Correct credentials
    fireEvent.change(emailInput, { target: { value: 'admin@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'admin' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // login is called
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      // Ensure navigate is called with '/user'
      expect(mockNavigate).toHaveBeenCalledWith('/user');
    });
  });

  test('should display an alert on incorrect credentials', async () => {

    // Mocking window.alert
    window.alert = jest.fn();

    renderComponent();

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    // Incorrect credentials
    fireEvent.change(emailInput, { target: { value: 'wrongemail@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Invalid email or password. Please try again.');
    });
  });

});