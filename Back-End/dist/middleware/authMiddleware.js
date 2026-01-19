"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminCheckMiddleware = adminCheckMiddleware;
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const jwtService_1 = require("../services/jwtService");
const authController_1 = __importDefault(require("../controllers/authController/authController"));
const Session_Util_1 = require("../Util/Session_Util");
function extractUserHeaders(req) {
    return {
        agent: req.headers['user-agent'] || '',
        ip_addr: req.ip || '',
    };
}
async function authMiddleware(req, res, next) {
    const token = req.cookies?.access_token;
    const userHeaders = extractUserHeaders(req);
    if (!token)
        return res
            .status(HTTPCodes_1.default.UNAUTHORIZED)
            .json({ error: 'Missing access token' });
    const payload = jwtService_1.jwtService.verifyAccessToken(token);
    if (!payload)
        return res
            .status(HTTPCodes_1.default.UNAUTHORIZED)
            .json({ error: 'Invalid or expired token' });
    if (payload.session_token &&
        !(0, Session_Util_1.verifySession)(payload.session_token, userHeaders)) {
        return res.status(HTTPCodes_1.default.UNAUTHORIZED).json({ error: 'Session mismatch' });
    }
    req.user = payload;
    next();
}
async function adminCheckMiddleware(req, res, next) {
    await authMiddleware(req, res, async () => {
        const user = req.user;
        const isAdmin = await authController_1.default.isAdmin(user.userId);
        if (!isAdmin)
            return res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: 'Admins only' });
        next();
    });
}
//# sourceMappingURL=authMiddleware.js.map