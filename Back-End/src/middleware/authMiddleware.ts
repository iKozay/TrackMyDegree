import { Request, Response, NextFunction } from 'express';
import HTTP from '@utils/httpCodes';
import { jwtService } from '@services/jwtService';
import { authController } from '@controllers/authController';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.access_token;

  if (!token)
    return res
      .status(HTTP.UNAUTHORIZED)
      .json({ error: 'Missing access token' });

  const payload = jwtService.verifyAccessToken(token);
  if (!payload)
    return res
      .status(HTTP.UNAUTHORIZED)
      .json({ error: 'Invalid or expired token' });

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
