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
const Sentry = __importStar(require("@sentry/node"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const corsMiddleware_1 = __importDefault(require("./middleware/corsMiddleware"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const DBController_1 = __importDefault(require("./controllers/DBController/DBController"));
const HTTPCodes_1 = __importDefault(require("./Util/HTTPCodes"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const errorHandler_1 = require("./middleware/errorHandler");
//Routes import
const auth_1 = __importDefault(require("./routes/auth"));
const courses_1 = __importDefault(require("./routes/courses"));
const exemption_1 = __importDefault(require("./routes/exemption"));
const deficiency_1 = __importDefault(require("./routes/deficiency"));
const degree_1 = __importDefault(require("./routes/degree"));
const timeline_1 = __importDefault(require("./routes/timeline"));
const coursepool_1 = __importDefault(require("./routes/coursepool"));
const userData_1 = __importDefault(require("./routes/userData"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const requisite_1 = __importDefault(require("./routes/requisite"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const session_1 = __importDefault(require("./routes/session"));
const sectionsRoutes_1 = __importDefault(require("./routes/sectionsRoutes"));
const transcript_1 = __importDefault(require("./routes/transcript"));
const mongo_1 = __importDefault(require("./routes/mongo"));
//Dev Consts
const HOPPSCOTCH = 'chrome-extension://amknoiejhlmhancpahfcfcfhllgkpbld';
//Express Init
dotenv_1.default.config(); //Load environment variables from .env file
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
const CLIENT = process.env.CLIENT || 'http://localhost:3000';
Sentry.setupExpressErrorHandler(app);
// Apply the CORS middleware
app.use((0, cors_1.default)(corsMiddleware_1.default));
// Preflight handling for all routes
app.options('*', (0, cors_1.default)(corsMiddleware_1.default));
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Apply rate limiters of forgot-password and reset-password routes
app.use('/auth/forgot-password', rateLimiter_1.forgotPasswordLimiter);
app.use('/auth/reset-password', rateLimiter_1.resetPasswordLimiter);
app.use('/auth/login', rateLimiter_1.loginLimiter);
app.use('/auth/signup', rateLimiter_1.signupLimiter);
//Routes
app.use('/auth', auth_1.default);
app.use('/courses', courses_1.default);
app.use('/degree', degree_1.default);
app.use('/exemption', exemption_1.default);
app.use('/deficiency', deficiency_1.default);
app.use('/timeline', timeline_1.default);
app.use('/coursepool', coursepool_1.default);
app.use('/data', userData_1.default);
app.use('/admin', adminRoutes_1.default);
app.use('/requisite', requisite_1.default);
app.use('/feedback', feedback_1.default);
app.use('/session', session_1.default);
app.use('/section', sectionsRoutes_1.default);
app.use('/transcript', transcript_1.default);
// MongoDB consolidated routes
app.use('/v2', mongo_1.default);
/**
 * DB test route
 * TO BE REMOVED
 */
app.get('/test-db', async (req, res) => {
    try {
        const pool = await DBController_1.default.getConnection();
        if (pool) {
            const result = await pool.request().query('SELECT 1 AS number');
            res.status(HTTPCodes_1.default.OK).send({
                message: 'Database connected successfully!',
                result: result.recordset,
            });
        }
        else {
            throw new Error('Connection error in test-db');
        }
    }
    catch (error) {
        res
            .status(HTTPCodes_1.default.SERVER_ERR)
            .send({ message: 'Database connection failed', error });
    }
});
//Handle 404
app.use(errorHandler_1.notFoundHandler);
//Global Error Handler
app.use(errorHandler_1.errorHandler);
//Listen for requests
app.listen(PORT, () => {
    console.log(`Server listening on Port: ${PORT}`);
});
// This will make sure to capture unhandled async errors
process.on('unhandledRejection', (reason) => {
    Sentry.captureException(reason);
    console.error('Unhandled Rejection:', reason);
});
//# sourceMappingURL=index.js.map