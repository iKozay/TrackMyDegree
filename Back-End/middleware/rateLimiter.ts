import rateLimit from "express-rate-limit";

// Rate limiter for "Forgot Password"
const forgotPasswordLimiter = rateLimit({
	windowMs: 2 * 60 * 1000, // window should be as large as OTP expiry time
	max: 5, // Limit each IP to 5 requests every 2 minutes
	message: { error: "Too many password reset attempts. Try again later." },
	standardHeaders: true, // Send rate limit info in headers
	legacyHeaders: false, // Disable X-RateLimit legacy headers
});

// Rate limiter for "Reset Password"
const resetPasswordLimiter = rateLimit({
	windowMs: 2 * 60 * 1000,
	max: 3, // Limit each IP to 3 reset attempts per window
	message: { error: "Too many reset attempts. Try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

// Rate limiter for Login
const loginLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 min window
	max: 5, // Attempt to login in 5 times a minute
	message: { error: "Too many password reset attempts. Try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

// Rate limiter for signup
const signupLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 5,
	message: { error: "Too many password reset attempts. Try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

export {
	forgotPasswordLimiter,
	resetPasswordLimiter,
	loginLimiter,
	signupLimiter,
};
