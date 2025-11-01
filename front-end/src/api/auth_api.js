const REACT_APP_SERVER = process.env.REACT_APP_SERVER || 'http://localhost:8000';

// API call for user login
export const loginUser = async (email, hashed_password) => {
  const response = await fetch(`${REACT_APP_SERVER}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      hashed_password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to log in.');
  }

  return await response.json();
};

// API call for user signup
export const signupUser = async (fullname, email, hashed_password, type = 'student') => {
  const response = await fetch(`${REACT_APP_SERVER}/auth/signup`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fullname,
      email,
      hashed_password,
      type,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to sign up.');
  }

  return await response.json();
};
