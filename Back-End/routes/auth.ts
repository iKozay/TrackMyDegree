import express, { Request, Response } from 'express';
import authController from '@controllers/authController/authController';
import HTTP from '@Util/HTTPCodes';
import Auth from '@controllers/authController/auth_types';
import dotenv from 'dotenv';
import { jwtService } from '../services/jwtService';

dotenv.config();
const router = express.Router();

const ERROR_MESSAGES = {
  EMPTY_REQUEST_BODY: 'Request body cannot be empty',
  EMAIL_PASSWORD_REQUIRED: 'Email and password are required',
  EMAIL_PASSWORD_INCORRECT: 'Password is required',
  REFRESH_TOKEN_MISSING: 'Missing refresh token',
  INTERNAL_SERVER_ERROR: (route: string) => `Internal server error in ${route}`,
} as const;

/**Routes */
// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(HTTP.BAD_REQUEST)
      .json({ error: ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED });

  try {
    const user = await authController.authenticate(email, password);
    if (!user)
      return res
        .status(HTTP.UNAUTHORIZED)
        .json({ error: ERROR_MESSAGES.EMAIL_PASSWORD_INCORRECT });

    const accessToken = jwtService.generateToken({
      orgId: process.env.JWT_ORG_ID!,
      userId: user.id!,
      type: user.type,
    });
    const refreshToken = jwtService.generateToken(
      { orgId: process.env.JWT_ORG_ID!, userId: user.id!, type: user.type },
      true,
    );

    const accessCookie = jwtService.setAccessCookie(accessToken);
    const refreshCookie = jwtService.setRefreshCookie(refreshToken);

    res.cookie(accessCookie.name, accessCookie.value, accessCookie.config);
    res.cookie(refreshCookie.name, refreshCookie.value, refreshCookie.config);

    res.status(HTTP.OK).json(user);
  } catch (error) {
    const errMsg = ERROR_MESSAGES.INTERNAL_SERVER_ERROR('/login');
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

// Refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token;
  if (!token)
    return res
      .status(HTTP.UNAUTHORIZED)
      .json({ error: 'Missing refresh token' });

  try {
    const payload = jwtService.verifyRefreshToken(token);
    if (!payload)
      return res
        .status(HTTP.UNAUTHORIZED)
        .json({ error: 'Invalid or expired refresh token' });

    // Need to validate the user by checking if the user with Id = payload.userId still exists
    //const user = await authController.getUserById(payload.userId);

    const newAccessToken = jwtService.generateToken(payload);
    const newRefreshToken = jwtService.generateToken(payload, true);

    const accessCookie = jwtService.setAccessCookie(newAccessToken);
    const refreshCookie = jwtService.setRefreshCookie(newRefreshToken);

    res.cookie(accessCookie.name, accessCookie.value, accessCookie.config);
    res.cookie(refreshCookie.name, refreshCookie.value, refreshCookie.config);

    // Need to send the user object otherwise frontend will break
    res.status(HTTP.OK).json({ message: 'Tokens refreshed' });
  } catch (error) {
    const errMsg = ERROR_MESSAGES.INTERNAL_SERVER_ERROR('/refresh');
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/auth/refresh' });

  res.status(200).json({ message: 'Logged out' });
});

// Sign-up
router.post('/signup', async (req: Request, res: Response) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res
      .status(HTTP.BAD_REQUEST)
      .json({ error: ERROR_MESSAGES.EMPTY_REQUEST_BODY });
    return;
  }

  const payload: Auth.UserInfo = req.body;

  try {
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
