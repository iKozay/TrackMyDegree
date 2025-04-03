import { Request, Response, NextFunction } from 'express';
import HTTP from '@Util/HTTPCodes';

/**
 ** Function to verify presence of access token
 * @param req 
 * @param res 
 * @param next 
 */
export function verifyAuth(req: Request, res: Response, next: NextFunction) {
  const cookies = req.cookies;

  try {
    if (!cookies.access_token) {
      //? Check if client is authenticated
      const error = new Error('Client request unauthorized');
      (error as any).status = HTTP.UNAUTHORIZED;
      throw error;
    }
  } catch (error) {
    next(error);
  }

  next(); //? Transfer control to next middleware
}