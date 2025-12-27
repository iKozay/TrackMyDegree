import { User } from '@models';
import bcrypt from 'bcryptjs';
import * as Sentry from '@sentry/node';
async function getUUID() {
  const { v4: uuidv4 } = await import('uuid');
  return uuidv4();
}
import { mailServicePromise } from '@services/mailService';
import Redis from 'ioredis';
import { RESET_EXPIRY_MINUTES, DUMMY_HASH } from '@utils/constants';

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

export interface UserInfo {
  _id: string;
  fullname: string;
  email: string;
  type: UserType;
}

export interface PasswordResetRequest {
  email: string;
  resetToken?: string;
  newPassword?: string;
}

export class AuthController {
  /**
   * Retrieves a user by their ID
   */
  async getUserById(userId: string): Promise<UserInfo | undefined> {
    try {
      const user = await User.findById(userId).lean().exec();

      if (!user) {
        return undefined;
      }

      return {
        _id: user._id.toString(),
        fullname: user.fullname,
        email: user.email,
        type: user.type as UserType,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'getUserById' },
        level: 'error',
      });
      console.error('[AuthController] getUserById error');
      return undefined;
    }
  }

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
      const hash = user && user.password ? user.password : DUMMY_HASH;
      const passwordMatch = await bcrypt.compare(password, hash);

      if (user && passwordMatch && user._id) {
        return {
          _id: user._id.toString(),
          fullname: user.fullname,
          email: user.email,
          type: user.type as UserType,
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
  async registerUser(userInfo: UserInfo, password: string): Promise<
    | {
        _id: string;
        email: string;
        fullname: string;
        type: string;
      }
    | undefined
  > {
    const { email, fullname, type } = userInfo;

    try {
      const existingUser = await User.exists({ email }).exec();
      if (existingUser) return undefined;

      // Hash the password before storing
      const hashedPassword = await this.hashPassword(password);

      // Create new user with generated _id
      const newUser = await User.create({
        email,
        password: hashedPassword,
        fullname,
        type,
      });

      if (!newUser._id) {
        return undefined;
      }

      return {
        _id: newUser._id.toString(),
        email: newUser.email,
        fullname: newUser.fullname,
        type: newUser.type,
      };
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: 'registerUser' } });
      console.error('[AuthController] Registration error');
      return undefined;
    }
  }

  /**
   * Sends a secure password reset link via email and stores the token in Redis
   */
  async forgotPassword(
    email: string,
  ): Promise<{ message: string; resetLink?: string }> {
    try {
      const user = await User.findOne({ email }).exec();
      if (!user) {
        // Mocro : Always return generic message to prevent user enumeration
        return { message: 'If the email exists, a reset link has been sent.' };
      }

      const resetToken = await getUUID();

      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT;
      if (!frontendUrl) {
        throw new Error(
          'FRONTEND_URL or CLIENT environment variable is not defined',
        );
      }

      const resetLink = `${frontendUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;
      const expireSeconds = RESET_EXPIRY_MINUTES * 60;

      // Mocro : Store token in Redis with expiry
      await redis.setex(`reset:${resetToken}`, expireSeconds, user.email);

      // Send reset email
      const mailService = await mailServicePromise;
      await mailService.sendPasswordReset(user.email, resetLink);

      return { message: 'If the email exists, a reset link has been sent.', resetLink };
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: 'forgotPassword' } });
      console.error('[AuthController] Password reset error', error);
      return { message: 'An error occurred. Please try again later.' };
    }
  }

  /**
   * Resets a user's password using the token stored in Redis
   */
  async resetPassword(
    resetToken: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      // Mocro : Get email from Redis
      const email = await redis.get(`reset:${resetToken}`);
      if (!email) return false; // invalid or expired token

      const user = await User.findOne({ email }).exec();
      if (!user) return false;

      // Hash and update to new password
      user.password = await this.hashPassword(newPassword);
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
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('+password').exec();
      if (!user || !user.password) return false;

      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) return false;
      // Hash and update to new password
      user.password = await this.hashPassword(newPassword);
      await user.save();

      return true;
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: 'changePassword' } });
      console.error('[AuthController] Password change error', error);
      return false;
    }
  }

  /*
    Checks if a user is an admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId).exec();
      return user?.type === UserType.ADMIN;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'isAdmin' },
        level: 'error',
      });
      console.error('[AuthController] isAdmin check error');
      return false;
    }
  }
  /*
   * helper to hash passwords - keeps SALT_ROUNDS consistent
   */
    private async hashPassword(plain: string): Promise<string> {
        const SALT_ROUNDS = 10;
        return bcrypt.hash(plain, SALT_ROUNDS);
    }
}

export const authController = new AuthController();
