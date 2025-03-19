import * as Sentry from "@sentry/react";

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

export { SignUpError, LoginError, UserPageError };
