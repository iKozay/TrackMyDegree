"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = __importDefault(require("../controllers/authController/authController"));
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const jwtService_1 = require("../services/jwtService");
const Session_Util_1 = require("../Util/Session_Util");
dotenv_1.default.config();
const router = express_1.default.Router();
const salt = bcryptjs_1.default.genSaltSync(10);
const ERROR_MESSAGES = {
    EMPTY_REQUEST_BODY: 'Request body cannot be empty',
    INTERNAL_SERVER_ERROR: (route) => `Internal server error in ${route}`,
};
function extractUserHeaders(req) {
    return {
        agent: req.headers['user-agent'] || '',
        ip_addr: req.ip || '',
    };
}
/**Routes */
// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Email and password are required' });
    try {
        const user = await authController_1.default.authenticate(email, password);
        if (!user)
            return res
                .status(HTTPCodes_1.default.UNAUTHORIZED)
                .json({ error: 'Incorrect email or password' });
        const userHeaders = extractUserHeaders(req);
        const accessToken = jwtService_1.jwtService.generateToken({ orgId: process.env.JWT_ORG_ID, userId: user.id, type: user.type }, userHeaders);
        const refreshToken = jwtService_1.jwtService.generateToken({ orgId: process.env.JWT_ORG_ID, userId: user.id, type: user.type }, userHeaders, undefined, true);
        const accessCookie = jwtService_1.jwtService.setAccessCookie(accessToken);
        const refreshCookie = jwtService_1.jwtService.setRefreshCookie(refreshToken);
        res.cookie(accessCookie.name, accessCookie.value, accessCookie.config);
        res.cookie(refreshCookie.name, refreshCookie.value, refreshCookie.config);
        res.status(HTTPCodes_1.default.OK).json(user);
    }
    catch (err) {
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Internal server error' });
    }
});
// Refresh
router.post('/refresh', async (req, res) => {
    const token = req.cookies?.refresh_token;
    const userHeaders = extractUserHeaders(req);
    if (!token)
        return res
            .status(HTTPCodes_1.default.UNAUTHORIZED)
            .json({ error: 'Missing refresh token' });
    const payload = jwtService_1.jwtService.verifyRefreshToken(token);
    if (!payload)
        return res
            .status(HTTPCodes_1.default.UNAUTHORIZED)
            .json({ error: 'Invalid or expired refresh token' });
    if (payload.session_token &&
        !(0, Session_Util_1.verifySession)(payload.session_token, userHeaders)) {
        return res.status(HTTPCodes_1.default.UNAUTHORIZED).json({ error: 'Session mismatch' });
    }
    const newAccessToken = jwtService_1.jwtService.generateToken(payload, userHeaders, payload.session_token);
    const newRefreshToken = jwtService_1.jwtService.generateToken(payload, userHeaders, payload.session_token, true);
    const accessCookie = jwtService_1.jwtService.setAccessCookie(newAccessToken);
    const refreshCookie = jwtService_1.jwtService.setRefreshCookie(newRefreshToken);
    res.cookie(accessCookie.name, accessCookie.value, accessCookie.config);
    res.cookie(refreshCookie.name, refreshCookie.value, refreshCookie.config);
    res.status(HTTPCodes_1.default.OK).json({ message: 'Tokens refreshed' });
});
// Sign-up
router.post('/signup', async (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: ERROR_MESSAGES.EMPTY_REQUEST_BODY });
        return;
    }
    const payload = req.body;
    try {
        const result = await authController_1.default.registerUser(payload);
        if (result) {
            res.status(HTTPCodes_1.default.CREATED).json(result);
        }
        else {
            throw new Error('Insertion result is undefined');
        }
    }
    catch (error) {
        const errMsg = ERROR_MESSAGES.INTERNAL_SERVER_ERROR('/signup');
        console.error(errMsg, error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
    }
});
// Forgot password
router.post('/forgot-password', async (req, res) => {
    if (!req.body) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: ERROR_MESSAGES.EMPTY_REQUEST_BODY });
        return; // Exit if validation fails
    }
    let email = req.body.email;
    try {
        const result = await authController_1.default.forgotPassword(email);
        if (result) {
            res.status(HTTPCodes_1.default.ACCEPTED).json(result);
        }
        else {
            throw new Error('Email check returns undefined');
        }
    }
    catch (error) {
        const errMsg = ERROR_MESSAGES.INTERNAL_SERVER_ERROR('/forgot-password');
        console.error(errMsg, error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
    }
});
// Reset password
router.post('/reset-password', async (req, res) => {
    if (!req.body) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: ERROR_MESSAGES.EMPTY_REQUEST_BODY });
        return; // Exit if validation fails
    }
    // Accept variables from front-end and deconstruct
    let { otp, password, confirmPassword } = req.body;
    // Pass arguments to reset password controller
    try {
        const result = await authController_1.default.resetPassword(otp, password, confirmPassword);
        if (result) {
            res.status(HTTPCodes_1.default.ACCEPTED).json(result);
        }
        else {
            throw new Error('Reset password returns undefined');
        }
    }
    catch (error) {
        const errMsg = ERROR_MESSAGES.INTERNAL_SERVER_ERROR('/reset-password');
        console.error(errMsg, error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map