"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const express_1 = __importDefault(require("express"));
const Sentry = __importStar(require("@sentry/node"));
const sectionController_1 = __importDefault(require("../controllers/sectionController/sectionController"));
const router = express_1.default.Router();
router.get('/schedule', async (req, res) => {
    const { subject, catalog } = req.query;
    try {
        // Validate input
        if (!subject ||
            !catalog ||
            typeof subject !== 'string' ||
            typeof catalog !== 'string') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Provide subject and course codes.',
            });
            return;
        }
        // Call external API through proxy
        const response = await sectionController_1.default.getCourseSchedule(subject, catalog);
        res.status(HTTPCodes_1.default.OK).json(response.data);
    }
    catch (error) {
        const errMsg = 'Error fetching course schedule';
        console.error(errMsg, error);
        Sentry.captureException(error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
    }
});
exports.default = router;
//# sourceMappingURL=sectionsRoutes.js.map