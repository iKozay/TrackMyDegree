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
const timelineRepository_1 = __importDefault(require("./timelineRepository"));
const log = console.log;
/**
 * Save or update a timeline
 */
async function saveTimeline(timeline) {
    const transaction = await timelineRepository_1.default.startTransaction();
    try {
        const { user_id, name, degree_id, items } = timeline;
        if (!user_id || !name || !degree_id) {
            throw new Error('User ID, timeline name, and degree ID are required');
        }
        // Upsert timeline metadata
        const timelineId = await timelineRepository_1.default.upsertTimeline(transaction, timeline);
        // Remove old timeline items before reinserting
        await timelineRepository_1.default.deleteTimelineItems(transaction, timelineId);
        // Insert new timeline items
        await timelineRepository_1.default.insertTimelineItems(transaction, timelineId, items);
        await transaction.commit();
        return { ...timeline, id: timelineId, last_modified: new Date() };
    }
    catch (error) {
        await transaction.rollback();
        Sentry.captureException(error);
        log('Error saving timeline:', error);
        throw error;
    }
}
/**
 * Fetch all timelines for a user
 */
async function getTimelinesByUser(user_id) {
    const transaction = await timelineRepository_1.default.startTransaction();
    try {
        const timelines = await timelineRepository_1.default.getTimelinesByUser(transaction, user_id);
        await transaction.commit();
        return timelines;
    }
    catch (error) {
        await transaction.rollback();
        Sentry.captureException(error);
        log('Error fetching timelines for user:', error);
        throw error;
    }
}
/**
 * Remove a timeline by ID
 */
async function removeUserTimeline(timeline_id) {
    const transaction = await timelineRepository_1.default.startTransaction();
    try {
        const deletedCount = await timelineRepository_1.default.deleteTimeline(transaction, timeline_id);
        await transaction.commit();
        return deletedCount > 0
            ? {
                success: true,
                message: `Timeline ${timeline_id} deleted successfully`,
            }
            : { success: false, message: `Timeline ${timeline_id} not found` };
    }
    catch (error) {
        await transaction.rollback();
        Sentry.captureException(error);
        log('Error removing timeline:', error);
        return {
            success: false,
            message: 'Error occurred while deleting timeline.',
        };
    }
}
exports.default = { saveTimeline, getTimelinesByUser, removeUserTimeline };
//# sourceMappingURL=timelineController.js.map