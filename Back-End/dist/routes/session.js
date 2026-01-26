"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const DBController_1 = __importDefault(require("../controllers/DBController/DBController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const jwtService_1 = require("../services/jwtService");
const Session_Util_1 = require("../Util/Session_Util");
const router = express_1.default.Router();
//* Middleware
router.use(authMiddleware_1.authMiddleware);
//* Route handlers
router.get('/refresh', async (req, res) => {
    const access_token = req.cookies.access_token;
    try {
        const headers = {
            agent: req.headers['user-agent'] || '',
            ip_addr: req.ip || '',
        };
        const payload = jwtService_1.jwtService.verifyAccessToken(access_token);
        const session_token = (0, Session_Util_1.refreshSession)(payload.session_token, headers);
        if (!session_token) {
            throw new Error('Unauthorized');
        }
        const accessToken = jwtService_1.jwtService.generateToken({
            orgId: process.env.JWT_ORG_ID,
            userId: payload.id,
            type: payload.type,
        }, headers, session_token);
        const cookie = jwtService_1.jwtService.setAccessCookie(accessToken);
        res.clearCookie(cookie.name, (0, jwtService_1.getCookieOptions)()); //? Clear previous session
        res.cookie(cookie.name, cookie.value, cookie.config); //? Set new JWT cookie
        const dbConn = await DBController_1.default.getConnection();
        if (dbConn) {
            //? Get User Data
            const result = await dbConn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, payload.userId)
                .query('SELECT * FROM AppUser WHERE id = @id');
            if (result.recordset && result.recordset.length > 0) {
                res.status(HTTPCodes_1.default.OK).json(result.recordset[0]);
            }
            else {
                throw new Error('User not found');
            }
        }
        res.status(HTTPCodes_1.default.SERVER_ERR);
    }
    catch (error) {
        res.status(HTTPCodes_1.default.UNAUTHORIZED).json({ message: error.message });
    }
});
router.get('/destroy', (req, res) => {
    res.clearCookie('access_token');
    res.status(HTTPCodes_1.default.OK).json({ message: 'session destroyed' });
});
exports.default = router;
//# sourceMappingURL=session.js.map