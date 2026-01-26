"use strict";
/**
 * Purpose:
 *  - Authentication controller responsible for handling user login, registration,
 *    password recovery, and role validation (admin check).
 * Notes:
 *  - Uses bcrypt for password hashing/validation and nodemailer for email-based OTP.
 *  - Depends on DBController for database connections.
 *  - Sentry is used for error tracking across all methods.
 *  - Types (e.g., Auth.UserInfo) are imported from auth_types.d.ts.
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
const DBController_1 = __importDefault(require("../DBController/DBController"));
const crypto_1 = require("crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
const Sentry = __importStar(require("@sentry/node"));
dotenv_1.default.config();
const log = console.log;
var salt = bcryptjs_1.default.genSaltSync(10);
// salt here is generated once at startup nd reused for password hashing.
/**
 * Authenticates a user by verifying their email and password.
 *
 * @param {string} email - The email of the user attempting to log in.
 * @param {string} password - The plaintext password provided by the user.
 * @returns {Promise<Auth.UserInfo | undefined>} - The authenticated user object if credentials are correct, otherwise undefined.
 */
async function authenticate(email, password) {
    const authConn = await DBController_1.default.getConnection();
    if (authConn) {
        try {
            // Step 1: Query the database for the user by email only
            // Only email is queried here, password verification done later via bcrypt.
            const result = await authConn
                .request()
                .input('email', DBController_1.default.msSQL.VarChar, email)
                .query('SELECT * FROM AppUser WHERE email = @email');
            // Step 2: Check if user exists and if the password matches
            if (result.recordset && result.recordset.length > 0) {
                const user = result.recordset[0];
                // Compare the plain-text password with the stored hashed password
                const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
                if (isPasswordValid) {
                    return user; // Authentication successful
                }
                else {
                    log('Incorrect email or password', email);
                }
            }
            else {
                log('User not found', email);
            }
        }
        catch (error) {
            Sentry.captureException({ error: 'Backend error - authenticate' });
            log('Error in login\n', error);
        }
    }
    return undefined;
}
/**
 * Registers a new user in the database.
 *
 * @param {Auth.UserInfo} userInfo - Object containing user details (email, password, fullname, type).
 * @returns {Promise<{ id: string } | undefined>} - The newly created user's ID, or undefined if registration fails.
 */
// IMPROVEMENT: verify user email - maybe use magic link
// IMPROVEMENT: strong password enforcement
async function registerUser(userInfo) {
    const authConn = await DBController_1.default.getConnection();
    if (undefined !== authConn) {
        const { email, password, fullname, type } = userInfo;
        const id = (0, crypto_1.randomUUID)();
        try {
            const result = await authConn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, id)
                .input('email', DBController_1.default.msSQL.VarChar, email)
                .input('password', DBController_1.default.msSQL.VarChar, password)
                .input('fullname', DBController_1.default.msSQL.VarChar, fullname)
                .input('type', DBController_1.default.msSQL.VarChar, type)
                .query('INSERT INTO AppUser ( id,  email,  password,  fullname,  type) \
              OUTPUT INSERTED.*                                         \
                          VALUES  (@id, @email, @password, @fullname, @type)');
            if (undefined === result.recordset) {
                log('Error inserting record ', result.recordset);
            }
            else {
                return result.recordset[0];
            }
        }
        catch (error) {
            Sentry.captureException({ error: 'Backend error - register user' });
            log('Error in Sign Up\n', error);
        }
    }
}
// Forgot Password
async function forgotPassword(email) {
    // Attempt to connect to the database
    const authConn = await DBController_1.default.getConnection();
    if (!authConn) {
        log('Database connection failed.');
        return;
    }
    // Query DB for user email
    try {
        const result = await authConn
            .request()
            .input('email', DBController_1.default.msSQL.VarChar, email)
            .query('SELECT * FROM AppUser WHERE email = @email');
        // Validation
        if (!result.recordset || result.recordset.length === 0) {
            log('User not found for email:', email);
            return;
        }
        // Generate OTP (one time pass)
        const otp = Math.floor(1000 + Math.random() * 9000);
        const otpExpire = new Date();
        otpExpire.setMinutes(otpExpire.getMinutes() + 2); // Set OTP expiry to 2 minutes (hard coded)
        // Update user record with OTP and expiry
        await authConn
            .request()
            .input('otp', DBController_1.default.msSQL.Int, otp)
            .input('otpExpire', DBController_1.default.msSQL.DateTime, otpExpire)
            .input('email', DBController_1.default.msSQL.VarChar, email)
            .query('UPDATE AppUser SET otp = @otp, otpExpire = @otpExpire WHERE email = @email');
        // Create email transporter object to send email
        const transporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
        // Configure mailing options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset',
            text: `Your One Time Password (expires in 10 minutes): ${otp}
			\nReset your password at: http://trackmydegree.com/reset-pass
			\nIf you did not request this, please ignore this email.`,
        }; // Change this to URL before adding to production
        // Email sending logic is coupled directly into this controller
        // We should consider moving to a dedicated mailer utility.
        // Send email
        await transporter.sendMail(mailOptions);
        return { message: 'OTP has been sent to your email.' }; // Confirmation message
    }
    catch (error) {
        Sentry.captureException({ error: 'Backend error - forgot password' });
        log('Error in forgot password:\n', error);
    }
}
// Reset Password
async function resetPassword(otp, password, confirmPassword) {
    // Make sure new password matches with confirmation
    if (password !== confirmPassword) {
        log('Passwords do not match.');
        return;
    }
    // Connect to the database
    const authConn = await DBController_1.default.getConnection();
    if (!authConn) {
        log('Database connection failed.');
        return;
    }
    // Query the database for the OTP that matches the user's input
    // Is it safe to query for the OTP
    try {
        const result = await authConn
            .request()
            .input('otp', DBController_1.default.msSQL.Int, otp)
            .query('SELECT * FROM AppUser WHERE otp = @otp AND otpExpire > GETDATE()');
        // Validate OTP
        if (!result.recordset || result.recordset.length === 0) {
            log('Invalid or expired OTP.');
            return;
        }
        // Hash the new password
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // Update the user's password and clear the OTP
        await authConn
            .request()
            .input('password', DBController_1.default.msSQL.VarChar, hashedPassword)
            .input('otp', DBController_1.default.msSQL.Int, otp)
            .query('UPDATE AppUser SET password = @password, otp = NULL, otpExpire = NULL WHERE otp = @otp');
        return { message: 'Password reset successful.' };
    }
    catch (error) {
        Sentry.captureException({ error: 'Backend error - reset password' });
        log('Error in reset password:\n', error);
    }
}
async function isAdmin(user_id) {
    const authConn = await DBController_1.default.getConnection();
    if (authConn) {
        try {
            const result = await authConn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, user_id)
                .query('SELECT type FROM AppUser WHERE id = @id');
            if (result.recordset && result.recordset.length > 0) {
                const user = result.recordset[0];
                return user.type === 'admin';
                // isAdmin simply checks the "type" field in DB
            }
            return false;
        }
        catch (error) {
            Sentry.captureException({ error: 'Backend error - isAdmin' });
            log('Error in isAdmin:\n', error);
        }
    }
}
//Namespace
const authController = {
    authenticate,
    registerUser,
    forgotPassword,
    resetPassword,
    isAdmin,
};
//Default export
exports.default = authController;
//# sourceMappingURL=authController.js.map