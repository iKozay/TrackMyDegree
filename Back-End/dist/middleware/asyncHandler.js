"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Wrap async route handlers and automatically catch errors.
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next); // catch errors and forward to errorHandler
    };
};
exports.default = asyncHandler;
//# sourceMappingURL=asyncHandler.js.map