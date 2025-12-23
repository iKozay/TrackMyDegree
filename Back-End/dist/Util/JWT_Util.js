"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCookieOptions = getCookieOptions;
exports.verifyToken = verifyToken;
exports.setJWTCookie = setJWTCookie;
exports.isTokenExpired = isTokenExpired;
exports.isOrgIdValid = isOrgIdValid;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Session_Util_1 = require("./Session_Util");
//* Functions
/**
 ** Function returns the application's secret key
 * @returns
 * - The secret key
 */
function getSecretKey() {
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
function getJWTPayload(user_id, user_type) {
    const payload = {
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
function getCookieOptions() {
    const security = process.env.NODE_ENV === 'production';
    const domain_name = security ? undefined : 'localhost';
    return {
        httpOnly: true,
        secure: security,
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60, //? 1 Hour - JWT token lifetime
        domain: domain_name,
    };
}
/**
 ** Function responsible for generating the JSON Web Token (JWT)
 * @param payload Payload to encode into the token
 * @param user The client's request headers
 * @returns
 * - A string representing the JWT
 */
function generateToken(payload, user, token) {
    const secret = getSecretKey();
    const options = {
        expiresIn: process.env.JWT_EXPIRY || '1h',
    };
    const session_payload = Object.assign(Object.assign({}, payload), { session_token: (!token) ? (0, Session_Util_1.createSessionToken)(user) : (0, Session_Util_1.refreshSession)(token, user) });
    return jsonwebtoken_1.default.sign(session_payload, secret, options);
}
/**
 ** Function handles JWT verification
 * @param access_token The JWT
 * @returns
 * - The decrypted JWT as a `TokenPayload` object
 */
function verifyToken(access_token) {
    const secret = getSecretKey();
    return jsonwebtoken_1.default.verify(access_token, secret);
}
/**
 ** Creates the model of the cookie containing the JWT
 * @param result The user's information
 * @param user The client's headers
 * @returns
 * - The model of a `Cookie` with all the configurations, as a `JWTCookieModel`
 */
function setJWTCookie(result, user, token) {
    const { id, type } = result;
    const payload = getJWTPayload(id, type);
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
function isTokenExpired(exp_time) {
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
function isOrgIdValid(org_id) {
    return org_id === process.env.JWT_ORG_ID;
}
