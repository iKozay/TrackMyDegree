// middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import HTTP from '@Util/HTTPCodes';
import { jwtService } from '../services/jwtService';
import authController from '@controllers/authController/authController';
import { UserHeaders, verifySession } from '@Util/Session_Util';

function extractUserHeaders(req: Request): UserHeaders {
  return {
    agent: req.headers['user-agent'] || '',
    ip_addr: req.ip || '',
  };
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.access_token;
  const userHeaders = extractUserHeaders(req);

  if (!token)
    return res
      .status(HTTP.UNAUTHORIZED)
      .json({ error: 'Missing access token' });

  const payload = jwtService.verifyAccessToken(token);
  if (!payload)
    return res
      .status(HTTP.UNAUTHORIZED)
      .json({ error: 'Invalid or expired token' });

  if (
    payload.session_token &&
    !verifySession(payload.session_token, userHeaders)
  ) {
    return res.status(HTTP.UNAUTHORIZED).json({ error: 'Session mismatch' });
  }

  (req as any).user = payload;
  next();
}

export async function adminCheckMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  await authMiddleware(req, res, async () => {
    const user = (req as any).user;
    const isAdmin = await authController.isAdmin(user.userId);
    if (!isAdmin)
      return res.status(HTTP.FORBIDDEN).json({ error: 'Admins only' });
    next();
  });
}
