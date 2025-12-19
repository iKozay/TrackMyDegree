// Email validation using regex pattern
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation - minimum length check
export const validatePassword = (password: string, minLength: number = 6): boolean => {
  return password.length >= minLength;
};

// Check if passwords match
export const passwordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};

// Validate required fields are not empty (with trimming for strings)
export const validateRequiredFields = (...fields: any[]): boolean => {
  return fields.every((field) => {
    if (typeof field === 'string') {
      return field.trim() !== '';
    }
    return field !== null && field !== undefined && field !== '';
  });
};

// Login form validation - returns array of error messages
export const validateLoginForm = (email: string, password: string): string[] => {
  const errors: string[] = [];

  if (!validateRequiredFields(email, password)) {
    errors.push('Both email and password are required.');
  }

  if (email.trim() && !validateEmail(email)) {
    errors.push('Please enter a valid email address.');
  }

  return errors;
};

// Signup form validation - returns array of error messages
export const validateSignupForm = (
  fullname: string,
  email: string,
  password: string,
  confirmPassword: string
): string[] => {
  const errors: string[] = [];

  if (!validateRequiredFields(fullname, email, password, confirmPassword)) {
    errors.push('All fields are required.');
  }

  if (email.trim() && !validateEmail(email)) {
    errors.push('Please enter a valid email address.');
  }

  if (password && confirmPassword && !passwordsMatch(password, confirmPassword)) {
    errors.push('Passwords do not match.');
  }

  if (password && !validatePassword(password)) {
    errors.push('Password should be at least 6 characters long.');
  }

  return errors;
};
