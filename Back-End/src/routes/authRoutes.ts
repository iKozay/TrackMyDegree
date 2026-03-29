import HTTP from '@utils/httpCodes';
import express, { Request, Response } from 'express';
import { authController, UserType } from '@controllers/authController';
import { jwtService } from '@services/jwtService';
import { BadRequestError, UnauthorizedError } from '@utils/errors';

const router = express.Router();

const EMPTY_REQUEST_BODY = 'Request body cannot be empty';

/**
 * POST /auth/login - User login
 */
router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const user = await authController.authenticate(email, password);

    if (!user) {
      throw new UnauthorizedError('Incorrect email or password');
    }

    const accessToken = jwtService.generateToken({
      orgId: process.env.JWT_ORG_ID || '',
      userId: user._id,
      type: user.type,
    });
    const refreshToken = jwtService.generateToken(
      {
        orgId: process.env.JWT_ORG_ID || '',
        userId: user._id,
        type: user.type,
      },
      true,
    );

    const accessCookie = jwtService.setAccessCookie(accessToken);
    const refreshCookie = jwtService.setRefreshCookie(refreshToken);

    res.cookie(accessCookie.name, accessCookie.value, accessCookie.config);
    res.cookie(refreshCookie.name, refreshCookie.value, refreshCookie.config);

    res.status(HTTP.OK).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.fullname,
        role: user.type,
      },
      token: accessToken,
    });
});

/**
 * POST /auth/refresh - User login automatically via refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token;
  if (!token)
    throw new UnauthorizedError('Missing refresh token');

    const payload = jwtService.verifyRefreshToken(token);
    if (!payload)
      throw new UnauthorizedError('Invalid or expired refresh token');

    // Validate user still exists
    const user = await authController.getUserById(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User does not exist');
    }

    const newAccessToken = jwtService.generateToken({
      orgId: payload.orgId,
      userId: payload.userId,
      type: payload.type,
    });
    const newRefreshToken = jwtService.generateToken(
      {
        orgId: payload.orgId,
        userId: payload.userId,
        type: payload.type,
      },
      true,
    );

    const accessCookie = jwtService.setAccessCookie(newAccessToken);
    const refreshCookie = jwtService.setRefreshCookie(newRefreshToken);

    res.cookie(accessCookie.name, accessCookie.value, accessCookie.config);
    res.cookie(refreshCookie.name, refreshCookie.value, refreshCookie.config);

    res.status(HTTP.OK).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.fullname,
        role: user.type,
      },
      token: token,
    });
});

/**
 * POST /auth/logout - User logout and clear all cookies
 */
router.post('/logout', (req: Request, res: Response) => {
  const secure = process.env.NODE_ENV !== 'development';
  res.clearCookie('access_token', { path: '/', httpOnly: true, secure, sameSite: 'strict', domain: secure ? process.env.COOKIE_DOMAIN : undefined });
  res.clearCookie('refresh_token', { path: '/auth/refresh', httpOnly: true, secure, sameSite: 'strict', domain: secure ? process.env.COOKIE_DOMAIN : undefined });
  res.status(200).json({ message: 'Logged out' });
});

/**
 * POST /auth/me - Authenticate user via access token
 */
router.get('/me', async (req: Request, res: Response) => {
  const token = req.cookies?.access_token;
  if (!token)
    throw new UnauthorizedError('Missing access token');  
  
    const payload = jwtService.verifyAccessToken(token);
    if (!payload)
      throw new UnauthorizedError('Invalid or expired access token');

    // Validate user still exists
    const user = await authController.getUserById(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User does not exist');
    }
    res.status(HTTP.OK).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.fullname,
        role: user.type,
      },
      token: token,
    });
});

/**
 * POST /auth/signup - User registration
 */
router.post('/signup', async (req: Request, res: Response) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new BadRequestError(EMPTY_REQUEST_BODY);
    }

    const email = req.body.email;
    const password = req.body.password;
    const fullname = req.body.name;
    const type = UserType.STUDENT; // Default to student for this implementation

    if (!email || !password || !fullname || !type) {
      throw new BadRequestError('Email, password, fullname, and type are required');  
    }

    // Validate user type
    if (!Object.values(UserType).includes(type)) {
      throw new BadRequestError('Invalid user type');
    }

    const userInfo = {
      email,
      fullname,
      type: type as UserType,
      _id: '', // Will be generated by controller
    };

    const user = await authController.registerUser(userInfo, password);

    const accessToken = jwtService.generateToken({
      orgId: process.env.JWT_ORG_ID!,
      userId: user._id,
      type: user.type as UserType,
    });
    const refreshToken = jwtService.generateToken(
      {
        orgId: process.env.JWT_ORG_ID!,
        userId: user._id,
        type: user.type as UserType,
      },
      true,
    );

    const accessCookie = jwtService.setAccessCookie(accessToken);
    const refreshCookie = jwtService.setRefreshCookie(refreshToken);

    res.cookie(accessCookie.name, accessCookie.value, accessCookie.config);
    res.cookie(refreshCookie.name, refreshCookie.value, refreshCookie.config);

    res.status(HTTP.CREATED).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.fullname,
        role: user.type,
      },
      token: accessToken,
    });
});

/**
 * POST /auth/forgot-password - Initiate password reset
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
    if (!req.body?.email) {
      throw new BadRequestError(EMPTY_REQUEST_BODY); 
    }

    const { email } = req.body;
    const result = await authController.forgotPassword(email);

    res.status(HTTP.ACCEPTED).json(result);
});

/**
 * POST /auth/reset-password - Reset password with URL token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
    if (!req.body) {
      throw new BadRequestError(EMPTY_REQUEST_BODY);
    }

    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      throw new BadRequestError('Token and newPassword are required');
    }

    await authController.resetPassword(resetToken, newPassword);
    res.status(HTTP.ACCEPTED).json({
      message: 'Password reset successfully',
    });

});

export default router;
