/**
 * Optimized Auth Controller
 *
 * Handles authentication operations with improved error handling and security.
 */

import { User } from '../../models';
import bcrypt from 'bcryptjs';
import * as Sentry from '@sentry/node';
import nodemailer from 'nodemailer';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';

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

export class AuthController {
  /**
   * Authenticates a user by verifying their email and password
   * Prevents timing attacks by using a dummy hash when user not found
   */
  async authenticate(
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

  /**
   * Registers a new user after validating input
   * Enforces strong password policy and checks for existing email
   */
  async registerUser(userInfo: UserInfo): Promise<{ id: string } | undefined> {
    const { email, password, fullname, type } = userInfo;

    try {
      const existingUser = await User.findOne({ email }).exec();
      if (existingUser) {
        // user already exists
        return;
      }
      // strong password enforcement
      if (!this.isStrongPassword(password)) {
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

  /**
   * Initiates password reset by generating OTP and sending email
   * OTP is valid for 10 minutes
   */
  async forgotPassword(
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

  /**
   * Resets user password after validating OTP and new password
   * Enforces strong password policy
   */
  async resetPassword(
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
      if (!this.isStrongPassword(password)) {
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

  /**
   * Checks if a user is an admin based on user ID
   */
  async isAdmin(user_id: string): Promise<boolean | undefined> {
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

  /**
   * Helper function that validates password strength using regex
   * Requires minimum 8 characters, at least one uppercase letter,
   * one lowercase letter, one number, and one special character
   */
  private isStrongPassword(password: string): boolean {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }
}

export const authController = new AuthController();
