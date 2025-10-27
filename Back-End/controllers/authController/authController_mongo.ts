import { User } from '../../models';
import bcrypt from 'bcryptjs';
import Sentry from '@sentry/node';
import nodemailer from 'nodemailer';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';
/*
 * Auth namespace with types
 * Inline to avoid compatibility issues with .d.ts files
 * Could be moved to separate .ts file if needed
 */
enum UserType {
  STUDENT = 'student',
  ADVISOR = 'advisor',
  ADMIN = 'admin',
}

type Credentials = {
  email: string;
  password: string;
};

type UserInfo = Credentials & {
  id?: string;
  fullname: string;
  type: UserType;
};
/*
 * Authenticates a user by verifying their email and password
 * Prevents timing attacks by using a dummy hash when user not found
 * Returns user info without password on success, undefined on failure
 * Does not log sensitive information
 * Catches and logs backend errors to Sentry
 * Future improvement: account lockout after multiple failed attempts
 * Future improvement: multifactor authentication (MFA)
 * @param email - user's email
 * @param password - user's plaintext password
 * @returns UserInfo or undefined
 */
async function authenticate(
  email: string,
  password: string,
): Promise<UserInfo | undefined> {
  try {
    const user = await User.findOne({ email }).exec();

    const hash = user ? user.password : '$2a$10$invalidsaltinvalidsaltinv'; // use dummy hash if user is not found to prevent timing attacks
    const passwordMatch = await bcrypt.compare(password, hash);

    if (user && passwordMatch) {
      const { _id, fullname, email, type } = user.toObject();
      if (!_id) {
        return undefined;
      }
      return {
        id: _id.toString(),
        fullname,
        email,
        type: type as UserType,
        password: '', // don't return password
      } as UserInfo; // Authentication successful
    }
    return undefined; // always return undefined for invalid login credentials
  } catch (error) {
    Sentry.captureException({
      error: 'Backend error - authenticate (mongo)',
      details: error,
    });
    console.error('Authenticate error'); // only log generic error
    return undefined;
  }
}
/*
 * Registers a new user after validating input
 * Enforces strong password policy and checks for existing email
 * Hashes password before saving to database
 * Returns new user ID on success, undefined on failure
 * Does not log sensitive information
 * Catches and logs backend errors to Sentry
 * Future improvement: email verification via magic link
 * Future improvement: enforce maximum password length according to OWASP guidelines (64 chars)
 * Future improvement: integrate with Pwned to suggest more secure passwords
 * @param userInfo - object containing email, password, fullname, and type
 * @returns object with new user ID or undefined
 */
async function registerUser(
  userInfo: UserInfo,
): Promise<{ id: string } | undefined> {
  const { email, password, fullname, type } = userInfo;

  try {
    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      // user already exists
      return;
    }
    // strong password enforcement
    if (!isStrongPassword(password)) {
      // don't log the password
      return;
    }
    // hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword,
      fullname,
      type,
    });
    await newUser.save();
    if (!newUser._id) {
      throw new Error('Failed to save user');
    }
    return { id: newUser._id.toString() };
  } catch (error) {
    Sentry.captureException({
      error: 'Backend error - register user (mongo)',
      details: error,
    });
    console.error('Register user error'); // only log generic error
    return;
  }
}
/*
 * Initiates password reset by generating OTP and sending email
 * OTP is valid for 10 minutes
 * Does not reveal if email exists to prevent user enumeration
 * Catches and logs backend errors to Sentry
 * @param email - user's email
 * @returns message indicating OTP sent or undefined on error
 */
async function forgotPassword(
  email: string,
): Promise<{ message: string } | undefined> {
  try {
    const user = await User.findOne({ email }).exec();
    // always generate OTP and send email to maintain consistent timing regardless of user existence
    // generate OTP and expiry - 10 minutes
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);
    // configure nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    if (user) {
      // save OTP and expiry to user record
      user.otp = otp;
      user.otpExpire = otpExpire;
      await user.save(); // update user record with otp and expiry

      // configure mailing options
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset',
        text: `Your One Time Password (expires in 10 minutes): ${otp}\nIf you did not request this, please ignore this email.`,
      };
      // send the email
      await transporter.sendMail(mailOptions);
    } else {
      // simulate db save and email send time to prevent timing attacks
      await setTimeoutPromise(200);
    }
    return { message: 'If the email exists, an OTP has been sent.' };
  } catch (error) {
    Sentry.captureException({
      error: 'Backend error - forgot password (mongo)',
      details: error,
    });
    console.error('Forgot password error'); // only log generic error
    return;
  }
}
/*
 * Resets user password after validating OTP and new password
 * Enforces strong password policy
 * Hashes new password before saving to database
 * Does not log sensitive information
 * Catches and logs backend errors to Sentry
 * Possible future improvement: notify user via email after password change
 * @param otp - one-time password sent to user's email
 * @param password - new plaintext password
 * @param confirmPassword - confirmation of new password
 * @returns message indicating success or undefined on failure
 */
async function resetPassword(
  otp: string,
  password: string,
  confirmPassword: string,
): Promise<{ message: string } | undefined> {
  try {
    if (password !== confirmPassword) {
      console.log('Passwords do not match');
      return;
    }

    const user = await User.findOne({ otp }).exec();
    //add a check to see if otp is expired
    if (!user || !user.otpExpire || user.otpExpire < new Date()) {
      console.log('Invalid or expired OTP');
      return;
    }

    // strong password enforcement
    if (!isStrongPassword(password)) {
      // don't log the password
      return;
    }
    // hash the new password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    (user as any).otp = null;
    (user as any).otpExpire = null;
    await user.save(); // update user record

    return { message: 'Password has been reset successfully.' };
  } catch (error) {
    Sentry.captureException({
      error: 'Backend error - reset password (mongo)',
      details: error,
    });
    console.error('Reset password error'); // only log generic error
    return;
  }
}
/*
 * Checks if a user is an admin based on user ID
 * Returns true if admin, false if not, undefined on error
 * Catches and logs backend errors to Sentry
 * @param user_id - user's unique identifier
 * @returns boolean or undefined
 */
async function isAdmin(user_id: string): Promise<boolean | undefined> {
  try {
    const user = await User.findById(user_id).exec();
    if (user) {
      return user.type === UserType.ADMIN;
    }
    return false; // user not found
  } catch (error) {
    Sentry.captureException({
      error: 'Backend error - isAdmin (mongo)',
      details: error,
    });
    console.error('isAdmin error'); // only log generic error
    return;
  }
}

/*
 * Helper function that validates password strength using regex
 * Requires minimum 8 characters, at least one uppercase letter,
 * one lowercase letter, one number, and one special character
 */
function isStrongPassword(password: string): boolean {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

// Namespace
const authController = {
  authenticate,
  registerUser,
  forgotPassword,
  resetPassword,
  isAdmin,
};

// Default export
export default authController;
