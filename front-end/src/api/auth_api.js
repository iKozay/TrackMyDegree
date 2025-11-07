import { api } from './http-api-client';

// API call for user login
export const loginUser = async (email, hashed_password) => {
  try {
    const data = await api.post(
      '/auth/login',
      {
        email,
        hashed_password,
      },
      {
        credentials: 'include',
      },
    );
    return data;
  } catch (err) {
    // The API client throws errors, so we need to handle them
    if (err.message && err.message.includes('HTTP')) {
      // Extract error message if available
      throw new Error('Failed to log in.');
    }
    throw err;
  }
};

// API call for user signup
export const signupUser = async (fullname, email, hashed_password, type = 'student') => {
  try {
    return await api.post(
      '/auth/signup',
      {
        fullname,
        email,
        hashed_password,
        type,
      },
      {
        credentials: 'include',
      },
    );
  } catch (err) {
    // The API client throws errors, so we need to handle them
    if (err.message && err.message.includes('HTTP')) {
      // Extract error message if available
      throw new Error('Failed to sign up.');
    }
    throw err;
  }
};
