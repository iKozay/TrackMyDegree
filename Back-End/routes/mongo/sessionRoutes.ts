import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { authMiddleware } from '@middleware/authMiddleware';
import {
  jwtService,
  TokenPayload,
  getCookieOptions,
} from '../../services/jwtService';
import { refreshSession, UserHeaders } from '@Util/Session_Util';
import { userController } from '@controllers/mondoDBControllers';

const router = express.Router();

// Middleware
router.use(authMiddleware);

const INTERNAL_SERVER_ERROR = 'Internal server error';

function extractUserHeaders(req: Request): UserHeaders {
  return {
    agent: req.headers['user-agent'] || '',
    ip_addr: req.ip || '',
  };
}

/**
 * GET /session/refresh - Refresh access token
 */
router.get('/refresh', async (req: Request, res: Response) => {
  try {
    const access_token = req.cookies.access_token;

    if (!access_token) {
      res.status(HTTP.UNAUTHORIZED).json({
        error: 'Missing access token',
      });
      return;
    }

    const headers: UserHeaders = extractUserHeaders(req);
    const payload: TokenPayload | null = jwtService.verifyAccessToken(access_token);

    if (!payload) {
      res.status(HTTP.UNAUTHORIZED).json({
        error: 'Invalid or expired access token',
      });
      return;
    }

    const session_token = refreshSession(payload.session_token, headers);

    if (!session_token) {
      res.status(HTTP.UNAUTHORIZED).json({
        error: 'Session refresh failed',
      });
      return;
    }

    const newAccessToken = jwtService.generateToken(
      {
        orgId: process.env.JWT_ORG_ID!,
        userId: payload.userId || (payload as any).id!,
        type: payload.type,
      },
      headers,
      session_token,
    );

    const cookie = jwtService.setAccessCookie(newAccessToken);

    res.clearCookie(cookie.name, getCookieOptions());
    res.cookie(cookie.name, cookie.value, cookie.config);

    // Get user data from MongoDB
    try {
      const userId = payload.userId || (payload as any).id;
      if (!userId) {
        throw new Error('User ID not found in token');
      }
      const user = await userController.getUserById(userId);
      res.status(HTTP.OK).json(user);
    } catch (error) {
      // If user not found, still return success but without user data
      if (error instanceof Error) {
        console.error('Error fetching user data:', error.message);
      }
      res.status(HTTP.OK).json({
        message: 'Session refreshed successfully',
      });
    }
  } catch (error) {
    console.error('Error in GET /session/refresh', error);
    res.status(HTTP.UNAUTHORIZED).json({
      error: INTERNAL_SERVER_ERROR,
    });
  }
});

/**
 * GET /session/destroy - Destroy session (logout)
 */
router.get('/destroy', (req: Request, res: Response) => {
  try {
    res.clearCookie('access_token', getCookieOptions());
    res.clearCookie('refresh_token', getCookieOptions());

    res.status(HTTP.OK).json({
      message: 'Session destroyed successfully',
    });
  } catch (error) {
    console.error('Error in GET /session/destroy', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

export default router;

