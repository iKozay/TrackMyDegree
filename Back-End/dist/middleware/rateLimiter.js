"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupLimiter = exports.loginLimiter = exports.resetPasswordLimiter = exports.forgotPasswordLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Rate limiter for "Forgot Password"
const forgotPasswordLimiter = (0, express_rate_limit_1.default)({
    windowMs: 2 * 60 * 1000, // window should be as large as OTP expiry time
    max: 5, // Limit each IP to 5 requests every 2 minutes
    message: { error: "Too many password reset attempts. Try again later." },
    standardHeaders: true, // Send rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit legacy headers
});
exports.forgotPasswordLimiter = forgotPasswordLimiter;
// Rate limiter for "Reset Password"
const resetPasswordLimiter = (0, express_rate_limit_1.default)({
    windowMs: 2 * 60 * 1000,
    max: 3, // Limit each IP to 3 reset attempts per window
    message: { error: "Too many reset attempts. Try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.resetPasswordLimiter = resetPasswordLimiter;
// Rate limiter for Login
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 min window
    max: 5, // Attempt to login in 5 times a minute
    message: { error: "Too many login attempts. Try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.loginLimiter = loginLimiter;
// Rate limiter for signup
const signupLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: { error: "Too many signup attempts. Try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.signupLimiter = signupLimiter;
