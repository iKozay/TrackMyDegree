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
exports.saveTimeline = saveTimeline;
exports.getTimelinesByUser = getTimelinesByUser;
exports.removeUserTimeline = removeUserTimeline;
const mongoose_1 = __importStar(require("mongoose"));
const Sentry = __importStar(require("@sentry/node"));
const log = console.log;
const TimelineItemSchema = new mongoose_1.Schema({
    season: { type: String, required: true },
    year: { type: Number, required: true },
    courses: { type: [String], required: true },
});
const TimelineSchema = new mongoose_1.Schema({
    user_id: { type: String, required: true },
    name: { type: String, required: true },
    degree_id: { type: String, required: true },
    items: { type: [TimelineItemSchema], default: [] },
    isExtendedCredit: { type: Boolean, required: true },
    last_modified: { type: Date, default: Date.now },
}, { timestamps: true });
const TimelineModel = mongoose_1.default.models.Timeline || mongoose_1.default.model('Timeline', TimelineSchema);
// ----------------------
// Controller Functions
// ----------------------
/**
 * Save or update a timeline (upsert)
 */
function saveTimeline(timeline) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { user_id, name, degree_id, items, isExtendedCredit } = timeline;
            if (!user_id || !name || !degree_id) {
                throw new Error('User ID, timeline name, and degree ID are required');
            }
            const updatedTimeline = yield TimelineModel.findOneAndUpdate({ user_id, name, degree_id }, {
                user_id,
                name,
                degree_id,
                items,
                isExtendedCredit,
                last_modified: new Date(),
            }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
            return {
                id: updatedTimeline._id.toString(),
                user_id: updatedTimeline.user_id,
                name: updatedTimeline.name,
                degree_id: updatedTimeline.degree_id,
                items: updatedTimeline.items.map((item) => {
                    var _a;
                    return ({
                        id: (_a = item._id) === null || _a === void 0 ? void 0 : _a.toString(),
                        season: item.season,
                        year: item.year,
                        courses: item.courses,
                    });
                }),
                isExtendedCredit: updatedTimeline.isExtendedCredit,
                last_modified: updatedTimeline.last_modified,
            };
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error saving timeline (Mongo):', error);
            throw error;
        }
    });
}
/**
 * Fetch all timelines for a given user
 */
function getTimelinesByUser(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const timelines = yield TimelineModel.find({ user_id }).lean();
            return timelines.map((t) => ({
                id: t._id.toString(),
                user_id: t.user_id,
                name: t.name,
                degree_id: t.degree_id,
                items: t.items.map((item) => {
                    var _a;
                    return ({
                        id: (_a = item._id) === null || _a === void 0 ? void 0 : _a.toString(),
                        season: item.season,
                        year: item.year,
                        courses: item.courses,
                    });
                }),
                isExtendedCredit: t.isExtendedCredit,
                last_modified: t.last_modified,
            }));
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error fetching timelines (Mongo):', error);
            throw error;
        }
    });
}
/**
 * Remove a timeline by ID
 */
function removeUserTimeline(timeline_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield TimelineModel.findByIdAndDelete(timeline_id);
            if (!result) {
                return { success: false, message: `Timeline ${timeline_id} not found` };
            }
            return { success: true, message: `Timeline ${timeline_id} deleted successfully` };
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error deleting timeline (Mongo):', error);
            return { success: false, message: 'Error occurred while deleting timeline.' };
        }
    });
}
exports.default = { saveTimeline, getTimelinesByUser, removeUserTimeline };
