import { CookieOptions } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
import Auth from '@controllers/authController/auth_types';

dotenv.config(); //? Env Variable Config

// * Typedef
export type JWTPayload = {
  //? Type to encapsulate payload for JWT token
  orgId: string;
  userId: string;
  type: Auth.UserType;
};

export type JWTCookieModel = {
  name: string;
  value: string;
  config: CookieOptions;
};

//* Functions
function getSecretKey(): string {
  //? Generate the Private key from the JWT secret
  return process.env.JWT_SECRET;
}

function getJWTPayload(
  user_id: string | undefined,
  user_type: Auth.UserType,
): JWTPayload {
  const payload: JWTPayload = {
    orgId: process.env.JWT_ORG_ID,
    userId: user_id || 'defaultID',
    type: user_type,
  };

  return payload;
}

function generateToken(payload: JWTPayload): string {
  const secret: string = getSecretKey();

  const options: SignOptions = {
    expiresIn: process.env.JWT_EXPIRY || '1h',
  };

  return jwt.sign(payload, secret, options);
}

export function verifyToken(access_token: string): JWTPayload {
  const secret: string = getSecretKey();

  return jwt.verify(access_token, secret) as JWTPayload;
}

export function setJWTCookie(result: Auth.UserInfo): JWTCookieModel {
  const { id, type } = result;
  const payload: JWTPayload = getJWTPayload(id, type);
  const access_token = generateToken(payload);
  const security = process.env.NODE_ENV === 'production';
  const domain_name = security ? undefined : 'localhost';

  return {//? Return the Cookie with all of its configs
    name: 'access_token',
    value: access_token,
    config: {
      httpOnly: true,
      secure: security,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60, //? 1 Hour
      domain: domain_name
    },
  };
}
