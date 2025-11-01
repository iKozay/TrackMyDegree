import { Request, Response, NextFunction} from 'express';
import createError from 'http-errors';
import HTTP from '@Util/HTTPCodes';
import * as Sentry from '@sentry/node';

// 404 Not Found Middleware
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const error = createError(
    HTTP.NOT_FOUND,
    `Route ${req.originalUrl} not found`,
  );
  Sentry.captureException(error);
  next(error);
};

// Global Error Handler
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const status = err.status || err.statusCode || HTTP.SERVER_ERR;
  const message = err.message || 'Internal Server Error';
  Sentry.captureException(err);
  res.status(status).json({
    error: message,
    status,
  });
};
