import { api } from './http-api-client';

export const loginUser = async (email, password) => {
  try {
    return await api.post(
      '/auth/login',
      {
        email,
        password,
      },
      {
        credentials: 'include',
      },
    );
  } catch (err) {
    if (err.message && err.message.includes('HTTP')) {
      throw new Error('Failed to log in.');
    }
    throw err;
  }
};

export const signupUser = async (fullname, email, password, type = 'student') => {
  try {
    return await api.post(
      '/auth/signup',
      {
        fullname,
        email,
        password,
        type,
      },
      {
        credentials: 'include',
      },
    );
  } catch (err) {
    if (err.message && err.message.includes('HTTP')) {
      throw new Error('Failed to sign up.');
    }
    throw err;
  }
};
