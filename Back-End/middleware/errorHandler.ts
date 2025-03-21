import { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import HTTP from "@Util/HTTPCodes";
import Sentry from "./sentryMiddleware";

// 404 Not Found Middleware
export const notFoundHandler = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	next(createError(HTTP.NOT_FOUND, "Page not found!!!"));
	Sentry.captureException(new Error("Page not found!!!"));
};

// Global Error Handler
export const errorHandler = (
	err: any,
	req: Request,
	res: Response,
	next: NextFunction
) => {
	res.status(err.status || HTTP.SERVER_ERR).json({
		error: err.message || "Internal Server Error",
	});
	Sentry.captureException(err);
};

export default { notFoundHandler, errorHandler };
