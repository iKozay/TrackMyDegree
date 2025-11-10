import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { AuthProvider, AuthContext } from '../../middleware/AuthContext';
import { api } from '../../api/http-api-client';

jest.mock('../../api/http-api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));


describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  it('should provide initial loading state', () => {
    const TestComponent = () => {
      const { loading } = React.useContext(AuthContext);
      return <div>{loading ? 'Loading' : 'Not Loading'}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('should verify session successfully and set user', async () => {
    const mockUser = { id: '1', email: 'test@example.com', fullname: 'Test User' };
    api.get.mockResolvedValueOnce(mockUser);

    const TestComponent = () => {
      const { isLoggedIn, user, loading } = React.useContext(AuthContext);
      return (
        <div>
          <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
          <div data-testid="status">{isLoggedIn ? 'Logged In' : 'Not Logged In'}</div>
          <div data-testid="user">{user ? user.email : 'No User'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
        expect(screen.getByTestId('status')).toHaveTextContent('Logged In');
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      },
      { timeout: 3000 },
    );
  });

  it('should handle session verification failure', async () => {
    api.get.mockRejectedValueOnce(new Error('Session expired'));

    const TestComponent = () => {
      const { isLoggedIn, user, loading } = React.useContext(AuthContext);
      return (
        <div>
          <div>{loading ? 'Loading' : 'Not Loading'}</div>
          <div>{isLoggedIn ? 'Logged In' : 'Not Logged In'}</div>
          <div>{user ? user.email : 'No User'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Not Loading')).toBeInTheDocument();
      expect(screen.getByText('Not Logged In')).toBeInTheDocument();
      expect(screen.getByText('No User')).toBeInTheDocument();
    });
  });

  it('should provide login function', async () => {
    api.get.mockRejectedValueOnce(new Error('Session expired'));

    const TestComponent = () => {
      const { login, isLoggedIn, user } = React.useContext(AuthContext);
      const userData = { id: '1', email: 'new@example.com' };

      return (
        <div>
          <button onClick={() => login(userData)}>Login</button>
          <div data-testid="status">{isLoggedIn ? 'Logged In' : 'Not Logged In'}</div>
          <div data-testid="user">{user ? user.email : 'No User'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Not Logged In');
    });

    const loginButton = screen.getByText('Login');
    await act(async () => {
      fireEvent.click(loginButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Logged In');
      expect(screen.getByTestId('user')).toHaveTextContent('new@example.com');
    });
  });

  it('should provide logout function', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    api.get.mockResolvedValueOnce(mockUser);
    api.get.mockResolvedValueOnce({});

    const TestComponent = () => {
      const { logout, isLoggedIn, user } = React.useContext(AuthContext);

      return (
        <div>
          <button onClick={logout}>Logout</button>
          <div data-testid="status">{isLoggedIn ? 'Logged In' : 'Not Logged In'}</div>
          <div data-testid="user">{user ? user.email : 'No User'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Logged In');
    });

    const logoutButton = screen.getByText('Logout');
    await act(async () => {
      fireEvent.click(logoutButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Not Logged In');
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
    });
  });

  it('should handle logout API failure gracefully', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    api.get.mockResolvedValueOnce(mockUser);
    api.get.mockRejectedValueOnce(new Error('Logout failed'));

    const TestComponent = () => {
      const { logout, isLoggedIn, user } = React.useContext(AuthContext);

      return (
        <div>
          <button onClick={logout}>Logout</button>
          <div data-testid="status">{isLoggedIn ? 'Logged In' : 'Not Logged In'}</div>
          <div data-testid="user">{user ? user.email : 'No User'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Logged In');
    });

    const logoutButton = screen.getByText('Logout');
    await act(async () => {
      fireEvent.click(logoutButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Not Logged In');
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
    });
  });
});

