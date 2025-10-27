import express, { Request, Response } from 'express';
import authController from '@controllers/authController/authController';
import HTTP from '@Util/HTTPCodes';
import Auth from '@controllers/authController/auth_types';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { jwtService } from '../services/jwtService';
import { UserHeaders, verifySession } from '@Util/Session_Util';

dotenv.config();

const router = express.Router();
const salt = bcrypt.genSaltSync(10);
const ERROR_MESSAGES = {
  EMPTY_REQUEST_BODY: 'Request body cannot be empty',
  INTERNAL_SERVER_ERROR: (route: string) => `Internal server error in ${route}`,
} as const;

function extractUserHeaders(req: Request): UserHeaders {
  return {
    agent: req.headers['user-agent'] || '',
    ip_addr: req.ip || '',
  };
}

/**Routes */
// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(HTTP.BAD_REQUEST)
      .json({ error: 'Email and password required' });

  try {
    const user = await authController.authenticate(email, password);
    if (!user)
      return res
        .status(HTTP.UNAUTHORIZED)
        .json({ error: 'Invalid credentials' });

    const userHeaders = extractUserHeaders(req);
    const accessToken = jwtService.generateToken(
      { orgId: process.env.JWT_ORG_ID!, userId: user.id!, type: user.type },
      userHeaders,
    );
    const refreshToken = jwtService.generateToken(
      { orgId: process.env.JWT_ORG_ID!, userId: user.id!, type: user.type },
      userHeaders,
      undefined,
      true,
    );

    const accessCookie = jwtService.setAccessCookie(accessToken);
    const refreshCookie = jwtService.setRefreshCookie(refreshToken);

    res.cookie(accessCookie.name, accessCookie.value, accessCookie.config);
    res.cookie(refreshCookie.name, refreshCookie.value, refreshCookie.config);

    res.status(HTTP.OK).json(user);
  } catch (err) {
    res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
  }
});

// Refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token;
  const userHeaders = extractUserHeaders(req);
  if (!token)
    return res
      .status(HTTP.UNAUTHORIZED)
      .json({ error: 'Missing refresh token' });

  const payload = jwtService.verifyRefreshToken(token);
  if (!payload)
    return res
      .status(HTTP.UNAUTHORIZED)
      .json({ error: 'Invalid or expired refresh token' });

  if (
    payload.session_token &&
    !verifySession(payload.session_token, userHeaders)
  ) {
    return res.status(HTTP.UNAUTHORIZED).json({ error: 'Session mismatch' });
  }

  const newAccessToken = jwtService.generateToken(
    payload,
    userHeaders,
    payload.session_token,
  );
  const newRefreshToken = jwtService.generateToken(
    payload,
    userHeaders,
    payload.session_token,
    true,
  );

  const accessCookie = jwtService.setAccessCookie(newAccessToken);
  const refreshCookie = jwtService.setRefreshCookie(newRefreshToken);

  res.cookie(accessCookie.name, accessCookie.value, accessCookie.config);
  res.cookie(refreshCookie.name, refreshCookie.value, refreshCookie.config);

  res.status(HTTP.OK).json({ message: 'Tokens refreshed' });
});

// Sign-up
router.post('/signup', async (req: Request, res: Response) => {
  if (!req.body) {
    res
      .status(HTTP.BAD_REQUEST)
      .json({ error: ERROR_MESSAGES.EMPTY_REQUEST_BODY });
    return; // Exit if validation fails
  }

  const payload: Auth.UserInfo = req.body;

  try {
    // Password is hashed on the client-side
    //payload.password = await bcrypt.hash(payload.password, salt);
    const result = await authController.registerUser(payload);

    if (result) {
      res.status(HTTP.CREATED).json(result);
    } else {
      throw new Error('Insertion result is undefined');
    }
  } catch (error) {
    const errMsg = ERROR_MESSAGES.INTERNAL_SERVER_ERROR('/signup');
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

// Forgot password
router.post('/forgot-password', async (req: Request, res: Response) => {
  if (!req.body) {
    res
      .status(HTTP.BAD_REQUEST)
      .json({ error: ERROR_MESSAGES.EMPTY_REQUEST_BODY });
    return; // Exit if validation fails
  }

  let email = req.body.email;

  try {
    const result = await authController.forgotPassword(email);

    if (result) {
      res.status(HTTP.ACCEPTED).json(result);
    } else {
      throw new Error('Email check returns undefined');
    }
  } catch (error) {
    const errMsg = ERROR_MESSAGES.INTERNAL_SERVER_ERROR('/forgot-password');
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  if (!req.body) {
    res
      .status(HTTP.BAD_REQUEST)
      .json({ error: ERROR_MESSAGES.EMPTY_REQUEST_BODY });
    return; // Exit if validation fails
  }

  // Accept variables from front-end and deconstruct
  let { otp, password, confirmPassword } = req.body;

  // Pass arguments to reset password controller
  try {
    const result = await authController.resetPassword(
      otp,
      password,
      confirmPassword,
    );

    if (result) {
      res.status(HTTP.ACCEPTED).json(result);
    } else {
      throw new Error('Reset password returns undefined');
    }
  } catch (error) {
    const errMsg = ERROR_MESSAGES.INTERNAL_SERVER_ERROR('/reset-password');
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

export default router;
