import { Request, Response, NextFunction } from 'express';

/**
 * Wrap async route handlers and automatically catch errors.
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next); // catch errors and forward to errorHandler
  };
};

export default asyncHandler;
