"use strict";
/**
 * Purpose:
 *  - Controller module to fetch comprehensive user data.
 *  - Combines user profile, timeline, deficiencies, exemptions, and degree info.
 * Notes:
 *  - Errors are logged to Sentry and returned as 500 Internal Server Error.
 *  - If `Database.getConnection()` fails, returns 500 immediately.
 *  - Checks that user exists and returns 404 if not found.
 */
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
exports.getUserData = void 0;
const DBController_1 = __importDefault(require("../DBController/DBController"));
const Sentry = __importStar(require("@sentry/node"));
// Extract user ID from the request body
const getUserData = async (req, res) => {
    const { id } = req.body;
    // If no user ID is provided, return a 400 Bad Request response
    if (!id) {
        res.status(400).json({ message: 'User ID is required' });
        return;
    }
    // Attempt to connect to the database
    const conn = await DBController_1.default.getConnection();
    // If connection fails, log the issue to Sentry and return 500 Internal Server Error
    if (!conn) {
        res.status(500).json({ message: 'Database connection failed' });
        Sentry.captureMessage('Database connection failed');
        return;
    }
    try {
        // Check if the user exists in the AppUser table and retrieve basic profile info
        const userCheckResult = await conn
            .request()
            .input('id', DBController_1.default.msSQL.VarChar, id)
            .query(`SELECT id, email, fullname, degree, type 
                 FROM AppUser 
                 WHERE id = @id`);
        // If no user is found, return 404 Not Found
        if (userCheckResult.recordset.length === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const userData = userCheckResult.recordset[0];
        // Fetch the user's timeline (courses taken per season and year)
        const timelineResult = await conn
            .request()
            .input('id', DBController_1.default.msSQL.VarChar, id)
            .query(`SELECT season, year, coursecode 
                 FROM Timeline 
                 WHERE user_id = @id`);
        // Fetch all deficiencies associated with the user (credits they still need)
        const deficiencyResult = await conn
            .request()
            .input('id', DBController_1.default.msSQL.VarChar, id)
            .query(`SELECT coursepool, creditsRequired 
                 FROM Deficiency 
                 WHERE user_id = @id`);
        // Fetch all exemptions for the user (courses they are exempt from)
        const exemptionResult = await conn
            .request()
            .input('id', DBController_1.default.msSQL.VarChar, id)
            .query(`SELECT coursecode 
                 FROM Exemption 
                 WHERE user_id = @id`);
        // Fetch detailed degree information by joining AppUser and Degree tables
        const degreeResult = await conn
            .request()
            .input('id', DBController_1.default.msSQL.VarChar, id)
            .query(`SELECT Degree.id, Degree.name, Degree.totalCredits 
                 FROM AppUser 
                 JOIN Degree ON AppUser.degree = Degree.id 
                 WHERE AppUser.id = @id`);
        // Combine all retrieved data into a structured response object
        const response = {
            user: {
                id: userData.id,
                email: userData.email,
                fullname: userData.fullname,
                type: userData.type,
                degree: userData.degree, // This is the foreign key ID (may be null)
            },
            timeline: timelineResult.recordset,
            deficiencies: deficiencyResult.recordset,
            exemptions: exemptionResult.recordset,
            degree: degreeResult.recordset[0] || null, // Detailed degree info (or null)
        };
        // Send the structured response back to the client
        res.status(200).json(response);
    }
    catch (error) {
        // Log and report any unexpected errors, then return 500 Internal Server Error
        console.error('Error fetching user data:', error);
        Sentry.captureException(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getUserData = getUserData;
exports.default = exports.getUserData;
//# sourceMappingURL=userDataController.js.map