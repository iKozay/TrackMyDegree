import { CookieOptions } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import Auth from '@controllers/authController/auth_types';
import {
  createSessionToken,
  refreshSession,
  SessionToken,
  UserHeaders,
} from './Session_Util';

// * Typedef
export type JWTPayload = {
  //? Type to encapsulate payload for JWT token
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

//* Functions
/**
 ** Function returns the application's secret key
 * @returns
 * - The secret key
 */
function getSecretKey(): string {
  //? Generate the Private key from the JWT secret
  return process.env.JWT_SECRET;
}

/**
 ** Builds the payload from the provided parameters
 * @param user_id
 * @param user_type
 * @returns
 * - A `JWTPayload` object
 */
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

/**
 ** Function returns the cookie options to set on the JWT cookie
 * @returns
 * - `CookieOptions` for the JWT cookie
 */
export function getCookieOptions(): CookieOptions {
  const security = process.env.NODE_ENV === 'production';
  const domain_name = security ? undefined : 'localhost';

  return {
    httpOnly: true,
    secure: security,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60, //? 1 Hour - JWT token lifetime
    domain: domain_name,
  } as CookieOptions;
}

/**
 ** Function responsible for generating the JSON Web Token (JWT)
 * @param payload Payload to encode into the token
 * @param user The client's request headers
 * @returns
 * - A string representing the JWT
 */
function generateToken(
  payload: JWTPayload,
  user: UserHeaders,
  token?: SessionToken,
): string {
  const secret: string = getSecretKey();

  const options: SignOptions = {
    expiresIn: process.env.JWT_EXPIRY || '1h',
  };

  const session_payload = {
    ...payload,
    session_token: !token
      ? createSessionToken(user)
      : refreshSession(token, user),
  };

  return jwt.sign(session_payload, secret, options);
}

/**
 ** Function handles JWT verification
 * @param access_token The JWT
 * @returns
 * - The decrypted JWT as a `TokenPayload` object
 */
export function verifyToken(access_token: string): TokenPayload {
  const secret: string = getSecretKey();

  return jwt.verify(access_token, secret) as TokenPayload;
}

/**
 ** Creates the model of the cookie containing the JWT
 * @param result The user's information
 * @param user The client's headers
 * @returns
 * - The model of a `Cookie` with all the configurations, as a `JWTCookieModel`
 */
export function setJWTCookie(
  result: { id: string; type: Auth.UserType },
  user: UserHeaders,
  token?: SessionToken,
): JWTCookieModel {
  const { id, type } = result;
  const payload: JWTPayload = getJWTPayload(id, type);
  const access_token = generateToken(payload, user, token);

  return {
    //? Return the Cookie with all of its configs
    name: 'access_token',
    value: access_token,
    config: getCookieOptions(),
  };
}

/**
 ** Verify if the provided token is expired
 * @param exp_time The expiry time (As an Epoch)
 * @returns
 * - TRUE: If the token is expired
 * - FALSE: If the token is still valid
 */
export function isTokenExpired(exp_time: number): boolean {
  const current_time = Math.floor(Date.now() / 1000);

  return exp_time < current_time;
}

/**
 ** VErifies if the organization ID encrypted in the token is valid
 * @param org_id The organization ID from the token
 * @returns
 * - TRUE: If the org_id is valid
 * - FALSE: If the org_id is invalid
 */
export function isOrgIdValid(org_id: string): boolean {
  return org_id === process.env.JWT_ORG_ID;
}
