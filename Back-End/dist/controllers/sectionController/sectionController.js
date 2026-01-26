"use strict";
// Controller responsible for fetching course schedules from Concordia's Open Data API
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
const axios_1 = __importDefault(require("axios"));
const Sentry = __importStar(require("@sentry/node"));
const API_BASE = 'https://opendata.concordia.ca/API/v1/course/schedule/filter';
// courseController.ts
// Fetch the schedule of a specific course (based on subject + catalog number) from Concordia's API
async function getCourseSchedule(subject, catalog) {
    try {
        // Build the authentication header using credentials stored in environment variables
        // The API requires Basic Auth, so we encode username:password as base64
        const authHeader = 'Basic ' +
            Buffer.from(`${process.env.SCHEDULE_USER}:${process.env.SCHEDULE_PASS}`).toString('base64');
        // Send GET request to Concordia's schedule API with subject + catalog
        // Example: subject = COMP, catalog = 674 → fetch COMP 674 schedule
        const response = await axios_1.default.get(`https://opendata.concordia.ca/API/v1/course/schedule/filter/*/${subject}/${catalog}`, {
            headers: {
                Authorization: authHeader,
                Accept: 'application/json',
            },
        });
        // Return the raw API response so it can be used by the caller
        return response;
    }
    catch (error) {
        // Log the error to Sentry for monitoring/alerting
        Sentry.captureException(error);
        // Add detailed error logging
        if (axios_1.default.isAxiosError(error)) {
            // If it's an Axios-specific error, log extra details about the failed request
            console.error('External API Error:', {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers,
            });
        }
        // Rethrow a simplified error so the caller knows the schedule fetch failed
        throw new Error(`Failed to fetch course schedule.`);
    }
}
// Group the controller methods under one object for exporting
const courseController = {
    getCourseSchedule,
};
exports.default = courseController;
//# sourceMappingURL=sectionController.js.map