import { Request, Response, NextFunction } from 'express';
import HTTP from '@utils/httpCodes';
import * as Sentry from '@sentry/node';
import { APIError, INTERNAL_SERVER_ERROR, NotFoundError } from '@utils/errors';

// 404 Not Found Middleware
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
};

// Global Error Handler
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Only send the message to the client if this is a known APIError.
  // This prevents exposing internal error details for unexpected errors.
  const isApiError = err instanceof APIError;
  const status = isApiError ? err.status : HTTP.SERVER_ERR;
  const errorName = isApiError ? err.name : 'InternalServerError';
  const message = isApiError ? err.message : INTERNAL_SERVER_ERROR;
  
  //Log all errors to the console for debugging, 
  //but only send details to Sentry for 500+ errors which are likely to be unexpected and need investigation.
  console.error(`[${req.method}] ${req.originalUrl} →`, err);
  if (status>= 500) {
    Sentry.captureException(err);
  }
  

  res.status(status).json({
    success: false,
    error: errorName,
    message,
    status,
  });
};
