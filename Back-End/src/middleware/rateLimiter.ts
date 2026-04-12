import rateLimit, { Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '@lib/redisClient';

// create Redis store for rate limiting
const buildStore = (): Store | undefined => {
  if (process.env.NODE_ENV === 'test' || !redisClient.isReady) return undefined; // default memory store
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  });
};
//helper to create limiters
const createLimiter = (config: {
  windowMs: number;
  max: number;
  message: any;
}) =>
  process.env.NODE_ENV === 'test'? 
  (req: any, res: any, next: any) => next():
  rateLimit({
    ...config,
    store: buildStore(),
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => false, // always apply rate limiting
  });

// Rate limiter for "Forgot Password"
const forgotPasswordLimiter = createLimiter({
  windowMs: 2 * 60 * 1000, // window should be as large as OTP expiry time
  max: 5, // Limit each IP to 5 requests every 2 minutes
  message: { error: 'Too many password reset attempts. Try again later.' },
});

// Rate limiter for "Reset Password"
const resetPasswordLimiter = createLimiter({
  windowMs: 2 * 60 * 1000,
  max: 3, // Limit each IP to 3 reset attempts per window
  message: { error: 'Too many reset attempts. Try again later.' },
});

// Rate limiter for Login
const loginLimiter = createLimiter({
  windowMs: 1 * 60 * 1000, // 1 min window
  max: 5, // Attempt to login in 5 times a minute
  message: { error: 'Too many login attempts. Try again later.' },
});

// Rate limiter for signup
const signupLimiter = createLimiter({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { error: 'Too many signup attempts. Try again later.' },
});

// Rate limiter for credit form file downloads (public endpoint)
const creditFormDownloadLimiter = createLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 60, // 60 file requests per minute per IP
  message: { error: 'Too many file requests. Try again later.' },
});

// Rate limiter for credit form uploads (admin-only endpoint)
const creditFormUploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 10, // 10 uploads per 15 minutes per IP
  message: { error: 'Too many upload attempts. Try again later.' },
});

// Rate limiter for credit form deletes (admin-only endpoint)
const creditFormDeleteLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 60, // 60 deletes per 15 minutes per IP
  message: { error: 'Too many delete attempts. Try again later.' },
});

const adminRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each admin to 100 requests per windowMs
  message: { error: 'Too many admin requests. Try again later.' },
});

const userRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100, // 100 requests per 15 minutes per IP
  message: { error: 'Too many user requests. Try again later.' },
});

export {
  forgotPasswordLimiter,
  resetPasswordLimiter,
  loginLimiter,
  signupLimiter,
  creditFormDownloadLimiter,
  creditFormUploadLimiter,
  creditFormDeleteLimiter,
  adminRateLimiter,
  userRateLimiter
};
