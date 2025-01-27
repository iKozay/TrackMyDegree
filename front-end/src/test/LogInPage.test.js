import React from "react";
import LogInPage from "../pages/LogInPage";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthContext } from "../AuthContext";

// Mocking the login function and useNavigate hook
const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe('LogInPage', () => {
  // Render page component while mocking login
  const renderComponent = () => {
    render(
      <AuthContext.Provider value={{ login: mockLogin }}>
        <LogInPage />
      </AuthContext.Provider>
      
    );
  };

  beforeEach(() => {
    // Clear all mocks before each test
    mockLogin.mockClear();
    mockNavigate.mockClear();
  });

  test('should render the LogInPage correctly', () => {
    renderComponent();
    
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
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

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            token: "fake-token",
            user: { id: 1, name: "John Doe" },
          }),
      })
    );
    
    renderComponent();

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    // Correct credentials
    fireEvent.change(emailInput, { target: { value: 'admin@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'admin' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        token: "fake-token",
        user: { id: 1, name: "John Doe" },
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith("/user");
  });

  test('should display an alert on incorrect credentials', async () => {

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({
            message: "Invalid credentials.",
          }),
      })
    );

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

    expect(await screen.findByText("Invalid credentials.")).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  afterAll(() => {
    // Clean up the mock
    global.fetch.mockRestore();
  });

});