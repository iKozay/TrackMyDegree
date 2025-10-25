import jwt, { SignOptions } from 'jsonwebtoken';
import { CookieOptions } from 'express';
import Auth from '@controllers/authController/auth_types';
import {
  createSessionToken,
  refreshSession,
  SessionToken,
  UserHeaders,
} from '@Util/Session_Util';

export type JWTPayload = {
  orgId: string;
  userId: string;
  type: Auth.UserType;
};

export type TokenPayload = JWTPayload & {
  session_token: SessionToken;
} & jwt.JwtPayload;

export type JWTCookieModel = {
  name: string;
  value: string;
  config: CookieOptions;
};

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '1h';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

function getSecretKey(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not defined');
  return secret;
}

function getCookieOptions(isRefresh: boolean = false): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: isRefresh ? '/auth/refresh' : '/',
    maxAge: isRefresh
      ? parseExpiryToMs(REFRESH_EXPIRY)
      : parseExpiryToMs(ACCESS_EXPIRY),
    domain: isProd ? process.env.COOKIE_DOMAIN : undefined,
  };
}

function parseExpiryToMs(exp: string): number {
  // Converts "1h", "7d", etc. to milliseconds
  const num = parseInt(exp);
  if (exp.endsWith('h')) return num * 60 * 60 * 1000;
  if (exp.endsWith('d')) return num * 24 * 60 * 60 * 1000;
  return num * 1000;
}

export const jwtService = {
  generateToken: (
    payload: JWTPayload,
    user: UserHeaders,
    token?: SessionToken,
    isRefresh: boolean = false,
  ): string => {
    const session_payload = {
      ...payload,
      session_token: token
        ? refreshSession(token, user)
        : createSessionToken(user),
    };

    const options: SignOptions = {
      expiresIn: (isRefresh ? REFRESH_EXPIRY : ACCESS_EXPIRY) as any,
    };

    return jwt.sign(session_payload, getSecretKey(), options);
  },

  verifyAccessToken: (token: string): TokenPayload | null => {
    try {
      return jwt.verify(token, getSecretKey()) as TokenPayload;
    } catch {
      return null;
    }
  },

  verifyRefreshToken: (token: string): TokenPayload | null => {
    try {
      return jwt.verify(token, getSecretKey()) as TokenPayload;
    } catch {
      return null;
    }
  },

  setAccessCookie: (token: string): JWTCookieModel => ({
    name: 'access_token',
    value: token,
    config: getCookieOptions(false),
  }),

  setRefreshCookie: (token: string): JWTCookieModel => ({
    name: 'refresh_token',
    value: token,
    config: getCookieOptions(true),
  }),
};
