"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const express_1 = __importDefault(require("express"));
const appUserController_1 = __importDefault(require("../controllers/appUserController/appUserController"));
const appUser_types_1 = __importDefault(require("../controllers/appUserController/appUser_types"));
const router = express_1.default.Router();
router.get('/update', async (req, res) => {
    const { id, email, password, fullname, degree, type } = req.query;
    try {
        // Validate input
        if (!id ||
            !email ||
            !password ||
            !fullname ||
            !degree ||
            !type ||
            typeof id !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            typeof fullname !== 'string' ||
            typeof degree !== 'string' ||
            !Object.values(appUser_types_1.default.UserType).includes(type)) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input.',
            });
            return;
        }
        // Call the service function
        const updatedAppUser = await appUserController_1.default.updateAppUser(id, email, password, fullname, degree, type);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'AppUser updated successfully.',
            appUser: updatedAppUser,
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error &&
            error.message === 'AppUser with this id does not exist.') {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /appUser/update';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
});
router.get('/delete', async (req, res) => {
    const { id } = req.query;
    try {
        // Validate input
        if (!id || typeof id !== 'string') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Please provide id as a string.',
            });
            return;
        }
        // Call the service function
        await appUserController_1.default.deleteAppUser(id);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'AppUser deleted successfully.',
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error &&
            error.message === 'AppUser with this id does not exist.') {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /appUser/delete';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
});
exports.default = router;
//# sourceMappingURL=appUser.js.map