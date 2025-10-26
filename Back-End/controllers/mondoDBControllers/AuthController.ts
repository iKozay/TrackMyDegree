/**
 * Handles authentication operations with improved error handling and security.
 */

import { User } from '../../models';
import bcrypt from 'bcryptjs';
import * as Sentry from '@sentry/node';

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
  private readonly SALT_ROUNDS = 10;
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

      // Validate password strength
      if (!this.isStrongPassword(password)) {
        return undefined;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

      // Create new user
      const newUser = await User.create({
        email,
        password: hashedPassword,
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
   * Initiates password reset by generating OTP
   * OTP is valid for 10 minutes
   */
  async forgotPassword(
    email: string,
  ): Promise<{ otp?: string; message: string }> {
    try {
      const user = await User.findOne({ email }).exec();

      // Generate OTP - 4 digits
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpExpire = new Date(
        Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
      );

      if (user) {
        // Save OTP and expiry to user record
        user.otp = otp;
        user.otpExpire = otpExpire;
        await user.save();

        return {
          otp, // Return OTP for testing/email service to handle
          message: 'OTP generated successfully',
        };
      }

      // Don't reveal whether email exists
      return {
        message: 'If the email exists, an OTP has been sent.',
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'forgotPassword' },
        level: 'error',
      });
      console.error('[AuthController] Password reset error');
      return {
        message: 'An error occurred. Please try again later.',
      };
    }
  }

  /**
   * Verifies OTP and resets password
   */
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      const user = await User.findOne({ email }).exec();

      if (!user || !user.otp || !user.otpExpire) {
        return false;
      }

      // Check if OTP is valid and not expired
      if (user.otp !== otp || new Date() > user.otpExpire) {
        return false;
      }

      // Validate new password strength
      if (!this.isStrongPassword(newPassword)) {
        return false;
      }

      // Hash new password and clear OTP
      user.password = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
      user.otp = '';
      user.otpExpire = new Date(0);
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

      // Validate new password strength
      if (!this.isStrongPassword(newPassword)) {
        return false;
      }

      // Hash and save new password
      user.password = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
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

  /**
   * Validates password strength
   * Requirements: min 8 chars, uppercase, lowercase, number, special char
   */
  private isStrongPassword(password: string): boolean {
    if (password.length < 8) return false;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(
      password,
    );

    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  }
}

export const authController = new AuthController();
