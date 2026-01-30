"use strict";
/**
 * Purpose:
 *  - Controller module to fetch comprehensive user data from MongoDB.
 *  - Combines user profile, timeline, deficiencies, exemptions, and degree info.
 * Notes:
 *  - Errors are logged to console and returned as 500 Internal Server Error.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserData = void 0;
const User_1 = require("../../models/User");
const Degree_1 = require("../../models/Degree");
const Timeline_1 = require("../../models/Timeline");
const Sentry = __importStar(require("@sentry/node"));
// Extract user ID from the request body
const getUserData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.body;
    // If no user ID is provided, return a 400 Bad Request response
    if (!id) {
        res.status(400).json({ message: 'User ID is required' });
        return;
    }
    try {
        // Check if the user exists and retrieve basic profile info
        const user = yield User_1.User.findById(id);
        // If no user is found, return 404 Not Found
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Fetch the user's timeline (flatten nested structure to match SQL output format)
        const timelineResult = yield Timeline_1.Timeline.find({ userId: id });
        const timeline = [];
        // Flatten timeline items to match the SQL structure (season, year, coursecode)
        for (const tl of timelineResult) {
            for (const item of tl.items) {
                for (const coursecode of item.courses) {
                    timeline.push({
                        season: item.season,
                        year: item.year,
                        coursecode: coursecode
                    });
                }
            }
        }
        // Fetch all deficiencies from the user document (already embedded)
        const deficiencies = user.deficiencies.map(def => ({
            coursepool: def.coursepool,
            creditsRequired: def.creditsRequired
        }));
        // Fetch all exemptions from the user document (already embedded as course references)
        const exemptions = user.exemptions.map(coursecode => ({
            coursecode: coursecode
        }));
        // Fetch detailed degree information if user has a degree assigned
        let degree = null;
        if (user.degree) {
            const degreeDoc = yield Degree_1.Degree.findById(user.degree);
            if (degreeDoc) {
                degree = {
                    id: degreeDoc._id,
                    name: degreeDoc.name,
                    totalCredits: degreeDoc.totalCredits
                };
            }
        }
        // Combine all retrieved data into a structured response object
        const response = {
            user: {
                id: user._id,
                email: user.email,
                fullname: user.fullname,
                type: user.type,
                degree: user.degree || null
            },
            timeline,
            deficiencies,
            exemptions,
            degree: degree
                ? {
                    id: degree.id,
                    name: degree.name,
                    totalCredits: degree.totalCredits
                }
                : null,
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
});
exports.getUserData = getUserData;
exports.default = exports.getUserData;
