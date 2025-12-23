"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = __importDefault(require("@controllers/authController/authController"));
const HTTPCodes_1 = __importDefault(require("@Util/HTTPCodes"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const JWT_Util_1 = require("@Util/JWT_Util");
dotenv_1.default.config();
const router = express_1.default.Router();
var salt = bcryptjs_1.default.genSaltSync(10);
/**Routes */
// Login
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Email and password are required' });
        return; // Exit if validation fails
    }
    try {
        const result = yield authController_1.default.authenticate(email, password);
        if (undefined === result) {
            res
                .status(HTTPCodes_1.default.UNAUTHORIZED)
                .json({ error: 'Incorrect email or password' });
        }
        else {
            const headers = {
                agent: req.headers['user-agent'] || '',
                ip_addr: req.ip || '',
            };
            const { id, type } = result;
            if (!id) {
                //? Check if ID is undefined
                throw new Error();
            }
            const cookie = (0, JWT_Util_1.setJWTCookie)({ id, type }, headers); //? Attach the JWT Cookie to the response
            res.cookie(cookie.name, cookie.value, cookie.config);
            res.status(HTTPCodes_1.default.OK).json(result);
        }
    }
    catch (error) {
        const errMsg = 'Internal server error in /login';
        console.error(errMsg, error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
    }
}));
// Sign-up
router.post('/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.body) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Request body cannot be empty' });
        return; // Exit if validation fails
    }
    const payload = req.body;
    try {
        payload.password = yield bcryptjs_1.default.hash(payload.password, salt);
        const result = yield authController_1.default.registerUser(payload);
        if (!result) {
            throw new Error('Insertion result is undefined');
        }
        else {
            res.status(HTTPCodes_1.default.CREATED).json(result);
        }
    }
    catch (error) {
        const errMsg = 'Internal server error in /signup';
        console.error(errMsg, error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
    }
}));
// Forgot password
router.post('/forgot-password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.body) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Request body cannot be empty' });
        return; // Exit if validation fails
    }
    let email = req.body.email;
    try {
        const result = yield authController_1.default.forgotPassword(email);
        if (!result) {
            throw new Error('Email check returns undefined');
        }
        else {
            res.status(HTTPCodes_1.default.ACCEPTED).json(result);
        }
    }
    catch (error) {
        const errMsg = 'Internal server error in /forgot-password';
        console.error(errMsg, error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
    }
}));
// Reset password
router.post('/reset-password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.body) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Request body cannot be empty' });
        return; // Exit if validation fails
    }
    // Accept variables from front-end and deconstruct
    let { otp, password, confirmPassword } = req.body;
    // Pass arguments to reset password controller
    try {
        const result = yield authController_1.default.resetPassword(otp, password, confirmPassword);
        if (!result) {
            throw new Error('Reset password returns undefined');
        }
        else {
            res.status(HTTPCodes_1.default.ACCEPTED).json(result);
        }
    }
    catch (error) {
        const errMsg = 'Internal server error in /reset-password';
        console.error(errMsg, error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
    }
}));
exports.default = router;
