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
export function AdminCheck(req: Request, res: Response, next: NextFunction) {
  const cookies = req.cookies;

  if (!cookies.access_token) {
    //? Check if client is authenticated
    const error = new Error('Client request unauthorized');
    (error as any).status = HTTP.UNAUTHORIZED;
    throw error;
  }

  try {
    const payload: TokenPayload = verifyToken(cookies.access_token);

    const { orgId, userId, type, exp } = payload;

    let token_expired = !exp || isTokenExpired(exp);
    let org_id_invalid = !isOrgIdValid(orgId);
    let user_not_admin = !authController.isAdmin(userId);

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
