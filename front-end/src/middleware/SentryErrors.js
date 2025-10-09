import * as Sentry from '@sentry/react';

class SignUpError extends Error {
  constructor(message) {
    super(message);
    this.name = `Sign Up Error`;
    Sentry.captureException(this);
  }
}

class LoginError extends Error {
  constructor(message) {
    super(message);
    this.name = `Authentication Error`;
    Sentry.captureException(this);
  }
}

class UserPageError extends Error {
  constructor(message) {
    super(message);
    this.name = `User Page Error`;
    Sentry.captureException(this);
  }
}

class ResetPassError extends Error {
  constructor(message) {
    super(message);
    this.name = `Reset Password Page Error`;
    Sentry.captureException(this);
  }
}

class ForgotPassError extends Error {
  constructor(message) {
    super(message);
    this.name = `Forgot Password Page Error`;
    Sentry.captureException(this);
  }
}

class CourseListPageError extends Error {
  constructor(message) {
    super(message);
    this.name = `Error in Course List Page`;
    Sentry.captureException(this);
  }
}

class AdminPageError extends Error {
  constructor(message) {
    super(message);
    this.name = `Error in Admin Page`;
    Sentry.captureException(this);
  }
}

class TimelineError extends Error {
  constructor(message) {
    super(message);
    this.name = `Error in Timeline Page`;
    Sentry.captureException(this);
  }
}

export {
  SignUpError,
  LoginError,
  UserPageError,
  ResetPassError,
  ForgotPassError,
  CourseListPageError,
  AdminPageError,
  TimelineError,
};
