"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSessionToken = createSessionToken;
exports.refreshSession = refreshSession;
const crypto_1 = __importDefault(require("crypto"));
const session_algo = process.env.SESSION_ALGO;
function getEncryptionKey() {
    const secret = process.env.JWT_SECRET || 'default-secret';
    return crypto_1.default
        .createHash('sha256')
        .update(secret)
        .digest();
}
/**
 ** The function responsible for decrypting the session information in the token
 * @param token The session token
 * @returns
 * - A string containing the decrypted information
 */
function decryptToken(token) {
    const { key, iv, salt } = token;
    const session_key = getEncryptionKey();
    const message = Buffer.from(key, 'base64');
    const tag = message.subarray(-16);
    const encrypted = message.subarray(0, -16);
    const decipher = crypto_1.default.createDecipheriv(session_algo, session_key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]).toString();
    return decrypted;
}
/**
 ** This function is responsible for the verification of session tokens,
 ** based on the information encrypted in the token and the user's request headers
 * @param session The headers contained in the session token
 * @param user The user's request headers (User-agent and IP address)
 * @returns
 * - TRUE: If the token is valid
 * - FALSE: If the token is invalid
 */
function verifySession(session, user) {
    // SECURITY: Verify session by comparing user-agent and IP address
    // This prevents token theft and ensures session is tied to specific device/network
    let valid_session = session.agent === user.agent && session.ip_addr === user.ip_addr;
    if (valid_session) {
        return true;
    }
    return false;
}
/**
 ** This function is responsible for the creation of session tokens
 * @param user The user's request headers (User-agent and IP address)
 * @param salt Optional. The salt is available if the user already has a token
 * @returns
 * - The Session token
 */
function createSessionToken(user, salt) {
    //? Gather encryption info
    const new_salt = salt ? salt + 1 : 1;
    const { agent, ip_addr } = user;
    const session_key = getEncryptionKey();
    //? Encryption
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv(session_algo, session_key, iv);
    const encrypted = Buffer.concat([
        cipher.update(`${agent}|${ip_addr}|${new_salt}`),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    //? Build Session token
    const token = {
        key: Buffer.concat([encrypted, tag]).toString('base64'),
        iv: iv.toString('base64'),
        salt: new_salt,
    };
    return token;
}
/**
 ** Function handles the refresh logic and provides a new session token
 * @param token The user's session token
 * @param user The user's request headers (User-agent and IP address)
 * @returns
 * - A new session token, if the provided token is valid
 * - Or NULL
 */
function refreshSession(token, user) {
    const session_info = decryptToken(token);
    const [agent, ip_addr, salt] = session_info.split('|');
    let valid_session = verifySession({ agent, ip_addr }, user);
    if (!valid_session) {
        return null;
    }
    const new_token = createSessionToken(user, parseInt(salt));
    return new_token;
}
