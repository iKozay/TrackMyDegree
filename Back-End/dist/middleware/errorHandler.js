"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const HTTPCodes_1 = __importDefault(require("@Util/HTTPCodes"));
const sentryMiddleware_1 = __importDefault(require("./sentryMiddleware"));
// 404 Not Found Middleware
const notFoundHandler = (req, res, next) => {
    next((0, http_errors_1.default)(HTTPCodes_1.default.NOT_FOUND, 'Page not found!!!'));
    sentryMiddleware_1.default.captureException(new Error('Page not found!!!'));
};
exports.notFoundHandler = notFoundHandler;
// Global Error Handler
const errorHandler = (err, req, res, next) => {
    sentryMiddleware_1.default.captureException(err);
    res.status(err.status || HTTPCodes_1.default.SERVER_ERR).json({
        error: err.message || 'Internal Server Error',
    });
};
exports.errorHandler = errorHandler;
exports.default = { notFoundHandler: exports.notFoundHandler, errorHandler: exports.errorHandler };
