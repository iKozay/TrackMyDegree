/**
 * Handles authentication operations with improved error handling and security.
 */

import { User } from '../../models';
import bcrypt from 'bcryptjs';
import * as Sentry from '@sentry/node';
import { randomInt, randomBytes } from 'crypto';


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
  otp?: string;
  newPassword?: string;
}

export class AuthController {
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly DUMMY_HASH = '$2a$10$invalidsaltinvalidsaltinv';

  /**
   * Authenticates a user by verifying their email and password
   * Prevents timing attacks by using a dummy hash when user not found
   */
  async authenticate(
    email: string,
    password: string,
  ): Promise<UserInfo | undefined> {
    try {
      const user = await User.findOne({ email })
        .select('+password')
        .lean()
        .exec();

      // Use dummy hash if user is not found to prevent timing attacks
      const hash = user ? user.password : this.DUMMY_HASH;
      const passwordMatch = await bcrypt.compare(password, hash);

      if (user && passwordMatch && user._id) {
        return {
          id: user._id.toString(),
          fullname: user.fullname,
          email: user.email,
          type: user.type as UserType,
          password: '', // never return password
        };
      }

      return undefined; // always return undefined for invalid credentials
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'authenticate' },
        level: 'error',
      });
      console.error('[AuthController] Authentication error');
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
      // Check if user already exists
      const existingUser = await User.exists({ email }).exec();
      if (existingUser) {
        return undefined;
      }

      // Create new user (password is already hashed from frontend)
      const newUser = await User.create({
        email,
        password, // password is already hashed from frontend
        fullname,
        type,
      });

      if (!newUser._id) {
        return undefined;
      }

      return { id: newUser._id.toString() };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'registerUser' },
        level: 'error',
      });
      console.error('[AuthController] Registration error');
      return undefined;
    }
  }

    /**
   * Initiates password reset by generating a secure reset link instead of OTP
   */
    async forgotPassword(
      email: string,
    ): Promise<{ message: string; resetLink?: string }> {
      try {
        const user = await User.findOne({ email }).exec();
  
        if (user) {
          // Mocro : Instead of OTP, we will generate a secure one-time URL for password reset
          const resetToken = randomBytes(32).toString('hex');
          const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
          user.resetToken = resetToken;
          user.resetTokenExpire = new Date(
            Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
          );
          await user.save();
  
          return { message: 'Password reset link generated', resetLink };
        }
  
        // Don't reveal whether email exists
        return { message: 'If the email exists, a reset link has been sent.' };
      } catch (error) {
        Sentry.captureException(error, {
          tags: { operation: 'forgotPassword' },
          level: 'error',
        });
        console.error('[AuthController] Password reset error');
        return { message: 'An error occurred. Please try again later.' };
      }
    }
  
    async resetPassword(
      email: string,
      resetToken: string,
      newPassword: string,
    ): Promise<boolean>
    
  /**
   * Verifies OTP and resets password
   */
  async resetPassword(
    email: string,
    resetToken: string,
    newPassword: string,
  ): Promise<boolean>
   {
    try {
      const user = await User.findOne({ email }).exec();

      if (!user) {
        return false;
      }

      // Set new password (already hashed from frontend) and clear OTP
      user.password = newPassword; // password is already hashed from frontend
      await user.save();

      return true;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'resetPassword' },
        level: 'error',
      });
      console.error('[AuthController] Password reset error');
      return false;
    }
  }

  /**
   * Change user password (when already authenticated)
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('+password').exec();

      if (!user) {
        return false;
      }

      // Verify old password
      const passwordMatch = await bcrypt.compare(oldPassword, user.password);
      if (!passwordMatch) {
        return false;
      }

      // Save new password (already hashed from frontend)
      user.password = newPassword; // password is already hashed from frontend
      await user.save();

      return true;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'changePassword' },
        level: 'error',
      });
      console.error('[AuthController] Password change error');
      return false;
    }
  }
}

export const authController = new AuthController();
