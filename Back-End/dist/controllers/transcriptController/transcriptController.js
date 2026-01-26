"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
const transcriptParser_1 = require("../../Util/transcriptParser");
const HTTPCodes_1 = __importDefault(require("../../Util/HTTPCodes"));
const multer_1 = __importDefault(require("multer"));
// Configure multer for file upload
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});
/**
 * Controller for handling transcript parsing operations
 */
class TranscriptController {
    /**
     * Parse uploaded transcript PDF
     * @route POST /api/transcript/parse
     */
    async parseTranscript(req, res) {
        try {
            if (!req.file) {
                res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                    success: false,
                    message: 'No file uploaded',
                });
                return;
            }
            const parser = new transcriptParser_1.TranscriptParser();
            const transcript = await parser.parseFromBuffer(req.file.buffer);
            const response = {
                success: true,
                message: 'Transcript parsed successfully',
                data: transcript,
            };
            res.status(HTTPCodes_1.default.OK).json(response);
        }
        catch (error) {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({
                success: false,
                message: 'Failed to parse transcript',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
const transcriptController = new TranscriptController();
exports.uploadMiddleware = upload.single('transcript');
exports.default = transcriptController;
//# sourceMappingURL=transcriptController.js.map