import csurf from "csurf";
import { Request, Response, NextFunction } from "express";

const csrfProtection = csurf({
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
});

export const csrfMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(req.method)) {
    return csrfProtection(req, res, (err) => {
      if (err) return next(err);

      try {
        const token = req.csrfToken?.();
        if (token) {
          res.setHeader("X-CSRF-Token", token);
        }
      } catch {
        // ignore
      }

      next();
    });
  }

  return csrfProtection(req, res, next);
};