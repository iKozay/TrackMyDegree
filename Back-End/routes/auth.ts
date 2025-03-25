import express, { Request, Response } from 'express';
import authController from '@controllers/authController/authController';
import HTTP from '@Util/HTTPCodes';
import Auth from '@controllers/authController/auth_types';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { setJWTCookie } from '@Util/JWT_Util';

dotenv.config();

const router = express.Router();
var salt = bcrypt.genSaltSync(10);

/**Routes */
// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res
      .status(HTTP.BAD_REQUEST)
      .json({ error: 'Email and password are required' });
    return; // Exit if validation fails
  }

  try {
    const result = await authController.authenticate(email, password);

    if (undefined === result) {
      res
        .status(HTTP.UNAUTHORIZED)
        .json({ error: 'Incorrect email or password' });
    } else {
      res = setJWTCookie(res, result); //? Attach the JWT Cookie to the response
      res.status(HTTP.OK).json(result);
    }
  } catch (error) {
    const errMsg = 'Internal server error in /login';
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

// Sign-up
router.post('/signup', async (req: Request, res: Response) => {
  if (!req.body) {
    res
      .status(HTTP.BAD_REQUEST)
      .json({ error: 'Request body cannot be empty' });
    return; // Exit if validation fails
  }

  const payload: Auth.UserInfo = req.body;

  try {
    payload.password = await bcrypt.hash(payload.password, salt);
    const result = await authController.registerUser(payload);

    if (!result) {
      throw new Error('Insertion result is undefined');
    } else {
      res.status(HTTP.CREATED).json(result);
    }
  } catch (error) {
    const errMsg = 'Internal server error in /signup';
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

// Forgot password
router.post('/forgot-password', async (req: Request, res: Response) => {
  if (!req.body) {
    res
      .status(HTTP.BAD_REQUEST)
      .json({ error: 'Request body cannot be empty' });
    return; // Exit if validation fails
  }

  let email = req.body.email;

  try {
    const result = await authController.forgotPassword(email);

    if (!result) {
      throw new Error('Email check returns undefined');
    } else {
      res.status(HTTP.ACCEPTED).json(result);
    }
  } catch (error) {
    const errMsg = 'Internal server error in /forgot-password';
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  if (!req.body) {
    res
      .status(HTTP.BAD_REQUEST)
      .json({ error: 'Request body cannot be empty' });
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

    if (!result) {
      throw new Error('Reset password returns undefined');
    } else {
      res.status(HTTP.ACCEPTED).json(result);
    }
  } catch (error) {
    const errMsg = 'Internal server error in /reset-password';
    console.error(errMsg, error);
    res.status(HTTP.SERVER_ERR).json({ error: errMsg });
  }
});

export default router;
