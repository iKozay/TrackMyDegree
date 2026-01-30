"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const HTTPCodes_1 = __importDefault(require("@Util/HTTPCodes"));
const DBController_1 = __importDefault(require("@controllers/DBController/DBController"));
const authMiddleware_1 = require("@middleware/authMiddleware");
const JWT_Util_1 = require("@Util/JWT_Util");
const Session_Util_1 = require("@Util/Session_Util");
const router = express_1.default.Router();
//* Middleware
router.use(authMiddleware_1.verifyAuth);
//* Route handlers
router.get('/refresh', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const access_token = req.cookies.access_token;
    try {
        const headers = {
            agent: req.headers['user-agent'] || '',
            ip_addr: req.ip || '',
        };
        const payload = (0, JWT_Util_1.verifyToken)(access_token);
        const session_token = (0, Session_Util_1.refreshSession)(payload.session_token, headers);
        if (!session_token) {
            throw new Error('Unauthorized');
        }
        const user_info = {
            id: payload.userId,
            type: payload.type,
        };
        const cookie = (0, JWT_Util_1.setJWTCookie)(user_info, headers, session_token);
        res.clearCookie(cookie.name, (0, JWT_Util_1.getCookieOptions)()); //? Clear previous session
        res.cookie(cookie.name, cookie.value, cookie.config); //? Set new JWT cookie
        const dbConn = yield DBController_1.default.getConnection();
        if (dbConn) {
            //? Get User Data
            const result = yield dbConn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, payload.userId)
                .query('SELECT * FROM AppUser WHERE id = @id');
            if (result.recordset && result.recordset.length > 0) {
                res.status(HTTPCodes_1.default.OK).json(result.recordset[0]);
            }
            else {
                throw new Error(); //? User not found
            }
        }
        res.status(HTTPCodes_1.default.SERVER_ERR);
    }
    catch (error) {
        res.status(HTTPCodes_1.default.UNAUTHORIZED).json({ message: error.message });
    }
}));
router.get('/destroy', (req, res) => {
    res.clearCookie('access_token', (0, JWT_Util_1.getCookieOptions)());
    res.status(HTTPCodes_1.default.OK).json({ message: 'session destroyed' });
});
exports.default = router;
