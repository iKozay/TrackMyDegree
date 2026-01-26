"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const feedbackController_1 = __importDefault(require("../controllers/feedbackController/feedbackController"));
const router = express_1.default.Router();
router.post('/', async (req, res) => {
    try {
        const { message, user_id } = req.body;
        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'Feedback message is required.' });
            return; // Exit the function after sending the response
        }
        const feedback = await (0, feedbackController_1.default)(message, user_id);
        res
            .status(201)
            .json({ message: 'Feedback submitted successfully!', feedback });
    }
    catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
//# sourceMappingURL=feedback.js.map