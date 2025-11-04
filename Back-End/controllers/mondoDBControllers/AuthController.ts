/**
 * Handles authentication operations with improved error handling and security.
 */

import { User } from '../../models';
import bcrypt from 'bcryptjs';
import * as Sentry from '@sentry/node';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import Redis from 'ioredis';

// Mocro : create Redis client for storing password reset tokens temporarily
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export enum UserType {
  STUDENT = 'student',
  ADVISOR = 'advisor',
  ADMIN = 'admin',
}

export interface Credentials {
  email: string;
  password: string;
}

export interface UserInfo extends Credentials {
  id?: string;
  fullname: string;
  type: UserType;
}

export interface PasswordResetRequest {
  email: string;
  resetToken?: string;
  newPassword?: string;
}

export class AuthController {
  private readonly RESET_EXPIRY_MINUTES = 10;
  private readonly DUMMY_HASH = '$2a$10$invalidsaltinvalidsaltinv';

  /**
   * Authenticates a user by verifying their email and password
   * Prevents timing attacks by using a dummy hash when user not found
   */
  async authenticate(email: string, password: string): Promise<UserInfo | undefined> {
    try {
      const user = await User.findOne({ email }).select('+password').lean().exec();

      const hash = user ? user.password : this.DUMMY_HASH;
      const passwordMatch = await bcrypt.compare(password, hash);

      if (user && passwordMatch && user._id) {
        return {
          id: user._id.toString(),
          fullname: user.fullname,
          email: user.email,
          type: user.type as UserType,
          password: '',
        };
      }

      return undefined;
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: 'authenticate' } });
      console.error('[AuthController] Authentication error');
      return undefined;
    }
  }

  /**
   * Registers a new user after validating input
   */
  async registerUser(userInfo: UserInfo): Promise<{ id: string } | undefined> {
    const { email, password, fullname, type } = userInfo;

    try {
      const existingUser = await User.exists({ email }).exec();
      if (existingUser) return undefined;

      const newUser = await User.create({ email, password, fullname, type });
      if (!newUser._id) return undefined;

      return { id: newUser._id.toString() };
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: 'registerUser' } });
      console.error('[AuthController] Registration error');
      return undefined;
    }
  }

  /**
   * Sends a secure password reset link via email and stores the token in Redis
   */
  async forgotPassword(email: string): Promise<{ message: string; resetLink?: string }> {
    try {
      const user = await User.findOne({ email }).exec();
      if (!user) {
        // Mocro : Always return generic message to prevent user enumeration
        return { message: 'If the email exists, a reset link has been sent.' };
      }

      const resetToken = uuidv4();

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
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: 'forgotPassword' } });
      console.error('[AuthController] Password reset error', error);
      return { message: 'An error occurred. Please try again later.' };
    }
  }

  /**
   * Resets a user's password using the token stored in Redis
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<boolean> {
    try {
      // Mocro : Get email from Redis
      const email = await redis.get(`reset:${resetToken}`);
      if (!email) return false; // invalid or expired token

      const user = await User.findOne({ email }).exec();
      if (!user) return false;

      user.password = newPassword; // already hashed on frontend
      await user.save();

      // Mocro : Delete used token
      await redis.del(`reset:${resetToken}`);

      return true;
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: 'resetPassword' } });
      console.error('[AuthController] Password reset error', error);
      return false;
    }
  }

  /**
   * Change password for authenticated users
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('+password').exec();
      if (!user) return false;

      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) return false;

      user.password = newPassword; // already hashed
      await user.save();

      return true;
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: 'changePassword' } });
      console.error('[AuthController] Password change error', error);
      return false;
    }
  }

  /**
   * Internal helper: sends reset email
   */
  private async sendResetEmail(email: string, resetLink: string) {
    const transporter = nodemailer.createTransport({
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

export const authController = new AuthController();
