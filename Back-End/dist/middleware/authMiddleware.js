"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuth = verifyAuth;
const HTTPCodes_1 = __importDefault(require("@Util/HTTPCodes"));
/**
 ** Function to verify presence of access token
 * @param req
 * @param res
 * @param next
 */
function verifyAuth(req, res, next) {
    const cookies = req.cookies;
    try {
        if (!cookies.access_token) {
            //? Check if client is authenticated
            const error = new Error('Client request unauthorized');
            error.status = HTTPCodes_1.default.UNAUTHORIZED;
            throw error;
        }
    }
    catch (error) {
        next(error);
    }
    next(); //? Transfer control to next middleware
}
