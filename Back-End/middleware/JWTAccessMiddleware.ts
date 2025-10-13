import { Request, Response, NextFunction } from 'express';
import HTTP from '@Util/HTTPCodes';
import {
  isOrgIdValid,
  isTokenExpired,
  TokenPayload,
  verifyToken,
} from '@Util/JWT_Util';
import authController from '@controllers/authController/authController';

/**
 * *
 * Middleware that handles authorization check when accessing Admin pages
 * @param req
 * @param res
 * @param next - Express NextFunction. Transfer control to the next middleware
 */
export async function AdminCheck(req: Request, res: Response, next: NextFunction) {
  const cookies = req.cookies;

  try {
    const { orgId, userId, exp } = verifyToken(cookies.access_token);

    let token_expired = !exp || isTokenExpired(exp);
    let org_id_invalid = !isOrgIdValid(orgId);
    let user_not_admin = ! await authController.isAdmin(userId);

    if (token_expired || org_id_invalid || user_not_admin) {
      //? Perform Admin auth check
      const error = new Error('Invalid or expired token');
      (error as any).status = HTTP.FORBIDDEN;
      throw error;
    }

    next();
  } catch (error) {
    next(error);
  }
}
