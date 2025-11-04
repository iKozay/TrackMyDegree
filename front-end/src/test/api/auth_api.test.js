import { loginUser, signupUser } from '../../api/auth_api';
import { api } from '../../api/http-api-client';

jest.mock('../../api/http-api-client', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('auth_api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginUser', () => {
    it('should successfully login user', async () => {
      const mockResponse = { message: 'Login successful', user: { id: '1', email: 'test@example.com' } };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await loginUser('test@example.com', 'hashed_password');

      expect(result).toEqual(mockResponse);
      expect(api.post).toHaveBeenCalledWith(
        '/auth/login',
        {
          email: 'test@example.com',
          hashed_password: 'hashed_password',
        },
        {
          credentials: 'include',
        },
      );
    });

    it('should handle HTTP errors and throw generic error', async () => {
      const httpError = new Error('HTTP 401: Unauthorized');
      api.post.mockRejectedValueOnce(httpError);

      await expect(loginUser('test@example.com', 'wrong_password')).rejects.toThrow('Failed to log in.');
      expect(api.post).toHaveBeenCalled();
    });

    it('should re-throw non-HTTP errors', async () => {
      const networkError = new Error('Network error');
      api.post.mockRejectedValueOnce(networkError);

      await expect(loginUser('test@example.com', 'password')).rejects.toThrow('Network error');
    });
  });

  describe('signupUser', () => {
    it('should successfully signup user with default type', async () => {
      const mockResponse = { message: 'User registered successfully', _id: '123' };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await signupUser('John Doe', 'test@example.com', 'hashed_password');

      expect(result).toEqual(mockResponse);
      expect(api.post).toHaveBeenCalledWith(
        '/auth/signup',
        {
          fullname: 'John Doe',
          email: 'test@example.com',
          hashed_password: 'hashed_password',
          type: 'student',
        },
        {
          credentials: 'include',
        },
      );
    });

    it('should successfully signup user with custom type', async () => {
      const mockResponse = { message: 'User registered successfully', _id: '123' };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await signupUser('Jane Doe', 'admin@example.com', 'hashed_password', 'admin');

      expect(result).toEqual(mockResponse);
      expect(api.post).toHaveBeenCalledWith(
        '/auth/signup',
        {
          fullname: 'Jane Doe',
          email: 'admin@example.com',
          hashed_password: 'hashed_password',
          type: 'admin',
        },
        {
          credentials: 'include',
        },
      );
    });

    it('should handle HTTP errors and throw generic error', async () => {
      const httpError = new Error('HTTP 409: Conflict');
      api.post.mockRejectedValueOnce(httpError);

      await expect(signupUser('John Doe', 'test@example.com', 'hashed_password')).rejects.toThrow('Failed to sign up.');
      expect(api.post).toHaveBeenCalled();
    });

    it('should re-throw non-HTTP errors', async () => {
      const networkError = new Error('Network error');
      api.post.mockRejectedValueOnce(networkError);

      await expect(signupUser('John Doe', 'test@example.com', 'hashed_password')).rejects.toThrow('Network error');
    });
  });
});

