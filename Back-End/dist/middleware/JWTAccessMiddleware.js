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
exports.AdminCheck = AdminCheck;
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const JWT_Util_1 = require("../Util/JWT_Util");
const authController_1 = __importDefault(require("../controllers/authController/authController"));
/**
 * *
 * Middleware that handles authorization check when accessing Admin pages
 * @param req
 * @param res
 * @param next - Express NextFunction. Transfer control to the next middleware
 */
function AdminCheck(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const cookies = req.cookies;
        try {
            const { orgId, userId, exp } = (0, JWT_Util_1.verifyToken)(cookies.access_token);
            let token_expired = !exp || (0, JWT_Util_1.isTokenExpired)(exp);
            let org_id_invalid = !(0, JWT_Util_1.isOrgIdValid)(orgId);
            let user_not_admin = !(yield authController_1.default.isAdmin(userId));
            if (token_expired || org_id_invalid || user_not_admin) {
                //? Perform Admin auth check
                const error = new Error('Invalid or expired token');
                error.status = HTTPCodes_1.default.FORBIDDEN;
                throw error;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    });
}
