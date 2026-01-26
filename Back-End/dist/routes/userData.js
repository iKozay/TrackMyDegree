"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userDataController_1 = __importDefault(require("../controllers/userDataController/userDataController"));
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const router = express_1.default.Router();
// Route to get user data by user ID
router.post('/userdata', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        // Call the controller function to handle the request
        await (0, userDataController_1.default)(req, res);
    }
    catch (error) {
        console.error('Error in /userdata route', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'An unexpected error occurred' });
    }
});
exports.default = router;
//# sourceMappingURL=userData.js.map