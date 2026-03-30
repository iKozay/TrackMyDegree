import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import HTTP from '@utils/httpCodes';
import * as Sentry from '@sentry/node';
import { APIError, INTERNAL_SERVER_ERROR } from '@utils/errors';

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

  Sentry.captureException(err);
  console.error(`[${req.method}] ${req.originalUrl} →`, err);

  // Only send the message to the client if this is a known APIError.
  // This prevents exposing internal error details for unexpected errors.
  const isApiError = err instanceof APIError;
  const status = isApiError ? err.status : HTTP.SERVER_ERR;
  const errorName = isApiError ? err.name : 'InternalServerError';
  const message = isApiError ? err.message : INTERNAL_SERVER_ERROR;
  

  res.status(status).json({
    error: errorName,
    message,
    status,
  });
};
