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
const userDataController_1 = __importDefault(require("@controllers/userDataController/userDataController"));
const HTTPCodes_1 = __importDefault(require("@Util/HTTPCodes"));
const router = express_1.default.Router();
// Route to get user data by user ID
router.post('/userdata', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.body;
        if (!id) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        // Call the controller function to handle the request
        yield (0, userDataController_1.default)(req, res);
    }
    catch (error) {
        console.error('Error in /userdata route', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'An unexpected error occurred' });
    }
}));
exports.default = router;
