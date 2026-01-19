"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtService = void 0;
exports.getCookieOptions = getCookieOptions;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Session_Util_1 = require("../Util/Session_Util");
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '1h';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
function getSecretKey() {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error('JWT_SECRET not defined');
    return secret;
}
function parseExpiryToMs(exp) {
    // Converts "1h", "7d", etc. to milliseconds
    const num = parseInt(exp);
    if (exp.endsWith('h'))
        return num * 60 * 60 * 1000;
    if (exp.endsWith('d'))
        return num * 24 * 60 * 60 * 1000;
    return num * 1000;
}
function getCookieOptions(isRefresh = false) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        path: isRefresh ? '/auth/refresh' : '/',
        maxAge: isRefresh
            ? parseExpiryToMs(REFRESH_EXPIRY)
            : parseExpiryToMs(ACCESS_EXPIRY),
        domain: isProd ? process.env.COOKIE_DOMAIN : undefined,
    };
}
exports.jwtService = {
    generateToken: (payload, user, token, isRefresh = false) => {
        const session_payload = {
            ...payload,
            session_token: token
                ? (0, Session_Util_1.refreshSession)(token, user)
                : (0, Session_Util_1.createSessionToken)(user),
        };
        const options = {
            expiresIn: (isRefresh ? REFRESH_EXPIRY : ACCESS_EXPIRY),
        };
        return jsonwebtoken_1.default.sign(session_payload, getSecretKey(), options);
    },
    verifyAccessToken: (token) => {
        try {
            return jsonwebtoken_1.default.verify(token, getSecretKey());
        }
        catch {
            return null;
        }
    },
    verifyRefreshToken: (token) => {
        try {
            return jsonwebtoken_1.default.verify(token, getSecretKey());
        }
        catch {
            return null;
        }
    },
    setAccessCookie: (token) => ({
        name: 'access_token',
        value: token,
        config: getCookieOptions(false),
    }),
    setRefreshCookie: (token) => ({
        name: 'refresh_token',
        value: token,
        config: getCookieOptions(true),
    }),
};
//# sourceMappingURL=jwtService.js.map