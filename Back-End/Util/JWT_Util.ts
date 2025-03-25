import { Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createPrivateKey, KeyObject } from 'crypto';
import Auth from '@controllers/authController/auth_types';

dotenv.config(); //? Env Variable Config

// * Typedef
export type JWTPayload = {
  //? Type to encapsulate payload for JWT token
  orgId: string;
  userId: string;
  type: Auth.UserType;
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

function verifyToken(access_token: string): JWTPayload {
  const secret: string = getSecretKey();

  return jwt.verify(access_token, secret) as JWTPayload;
}

export function setJWTCookie(
  response: Response,
  result: Auth.UserInfo,
): Response {
  const { id, type } = result;
  const payload: JWTPayload = getJWTPayload(id, type);

  const access_token = generateToken(payload);

  response.cookie('access_token', access_token, { httpOnly: true });

  return response;
}
