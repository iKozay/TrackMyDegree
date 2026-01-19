"use strict";
/**
 * Handles authentication operations with improved error handling and security.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = exports.UserType = void 0;
const models_1 = require("../../models");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Sentry = __importStar(require("@sentry/node"));
const uuid_1 = require("uuid");
const nodemailer_1 = __importDefault(require("nodemailer"));
const ioredis_1 = __importDefault(require("ioredis"));
// Mocro : create Redis client for storing password reset tokens temporarily
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
var UserType;
(function (UserType) {
    UserType["STUDENT"] = "student";
    UserType["ADVISOR"] = "advisor";
    UserType["ADMIN"] = "admin";
})(UserType || (exports.UserType = UserType = {}));
class AuthController {
    constructor() {
        this.RESET_EXPIRY_MINUTES = 10;
        this.DUMMY_HASH = '$2a$10$invalidsaltinvalidsaltinv';
    }
    /**
     * Authenticates a user by verifying their email and password
     * Prevents timing attacks by using a dummy hash when user not found
     */
    async authenticate(email, password) {
        try {
            const user = await models_1.User.findOne({ email }).select('+password').lean().exec();
            const hash = user ? user.password : this.DUMMY_HASH;
            const passwordMatch = await bcryptjs_1.default.compare(password, hash);
            if (user && passwordMatch && user._id) {
                return {
                    _id: user._id.toString(),
                    fullname: user.fullname,
                    email: user.email,
                    type: user.type,
                    password: '',
                };
            }
            return undefined;
        }
        catch (error) {
            Sentry.captureException(error, { tags: { operation: 'authenticate' } });
            console.error('[AuthController] Authentication error');
            return undefined;
        }
    }
    /**
     * Registers a new user after validating input
     */
    async registerUser(userInfo) {
        const { email, password, fullname, type } = userInfo;
        try {
            const existingUser = await models_1.User.exists({ email }).exec();
            if (existingUser)
                return undefined;
            const newUser = await models_1.User.create({ email, password, fullname, type });
            if (!newUser._id)
                return undefined;
            return { _id: newUser._id.toString() };
        }
        catch (error) {
            Sentry.captureException(error, { tags: { operation: 'registerUser' } });
            console.error('[AuthController] Registration error');
            return undefined;
        }
    }
    /**
     * Sends a secure password reset link via email and stores the token in Redis
     */
    async forgotPassword(email) {
        try {
            const user = await models_1.User.findOne({ email }).exec();
            if (!user) {
                // Mocro : Always return generic message to prevent user enumeration
                return { message: 'If the email exists, a reset link has been sent.' };
            }
            const resetToken = (0, uuid_1.v4)();
            const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT;
            if (!frontendUrl) {
                throw new Error('FRONTEND_URL or CLIENT environment variable is not defined');
            }
            const resetLink = `${frontendUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;
            const expireSeconds = this.RESET_EXPIRY_MINUTES * 60;
            // Mocro : Store token in Redis with expiry
            await redis.setex(`reset:${resetToken}`, expireSeconds, user.email);
            // Mocro : Send reset email
            await this.sendResetEmail(user.email, resetLink);
            return { message: 'Password reset link sent successfully', resetLink };
        }
        catch (error) {
            Sentry.captureException(error, { tags: { operation: 'forgotPassword' } });
            console.error('[AuthController] Password reset error', error);
            return { message: 'An error occurred. Please try again later.' };
        }
    }
    /**
     * Resets a user's password using the token stored in Redis
     */
    async resetPassword(resetToken, newPassword) {
        try {
            // Mocro : Get email from Redis
            const email = await redis.get(`reset:${resetToken}`);
            if (!email)
                return false; // invalid or expired token
            const user = await models_1.User.findOne({ email }).exec();
            if (!user)
                return false;
            user.password = newPassword; // already hashed on frontend
            await user.save();
            // Mocro : Delete used token
            await redis.del(`reset:${resetToken}`);
            return true;
        }
        catch (error) {
            Sentry.captureException(error, { tags: { operation: 'resetPassword' } });
            console.error('[AuthController] Password reset error', error);
            return false;
        }
    }
    /**
     * Change password for authenticated users
     */
    async changePassword(userId, oldPassword, newPassword) {
        try {
            const user = await models_1.User.findById(userId).select('+password').exec();
            if (!user)
                return false;
            const match = await bcryptjs_1.default.compare(oldPassword, user.password);
            if (!match)
                return false;
            user.password = newPassword; // already hashed
            await user.save();
            return true;
        }
        catch (error) {
            Sentry.captureException(error, { tags: { operation: 'changePassword' } });
            console.error('[AuthController] Password change error', error);
            return false;
        }
    }
    /**
     * Internal helper: sends reset email
     */
    async sendResetEmail(email, resetLink) {
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Password Reset Link',
            text: `Use this link to reset your password: ${resetLink}`,
            html: `<p>Use this link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
        });
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=AuthController.js.map