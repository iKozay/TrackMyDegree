import { Request, Response, NextFunction } from 'express';
import { jwtService } from '@services/jwtService';
import { authController } from '@controllers/authController';
import { ForbiddenError, UnauthorizedError } from '@utils/errors';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.access_token;
    if (!token) throw new UnauthorizedError('Missing access token');

    const payload = jwtService.verifyAccessToken(token);
    if (!payload) throw new UnauthorizedError('Invalid or expired token');

    (req as any).user = payload;
    next();
  } catch (err) {
    next(err); // Pass to global error handler
  }
}

export async function userCheckMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { userId } = req.params;
    const jwtUserId = (req as any).user?.userId;

    if (jwtUserId !== userId) {
      throw new ForbiddenError('User is not authorized to access this resource');
    }
    next();
  } catch (err) {
    next(err); // Let centralized error handler respond
  }
}

export async function adminCheckMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  await authMiddleware(req, res, async () => {
    try {
      const user = (req as any).user;
      const isAdmin = await authController.isAdmin(user.userId);

      if (!isAdmin) throw new ForbiddenError('Admins only');

      next();
    } catch (error) {
      next(error);
    }
  });
}
