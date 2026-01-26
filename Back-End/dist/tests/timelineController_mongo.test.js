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
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const timelineController_mongo_1 = __importDefault(require("../controllers/timelineController/timelineController_mongo"));
describe('TimelineController (MongoDB)', () => {
    let mongoServer;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        mongoServer = yield mongodb_memory_server_1.MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        yield mongoose_1.default.connect(uri);
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield mongoose_1.default.disconnect();
        yield mongoServer.stop();
    }));
    let createdTimelineId;
    const testTimeline = {
        user_id: 'user123',
        name: 'Test Timeline',
        degree_id: 'degreeABC',
        items: [
            {
                season: 'fall',
                year: 2025,
                courses: ['COMP479', 'COMP6791'],
            },
        ],
        isExtendedCredit: false,
    };
    it('should save a new timeline', () => __awaiter(void 0, void 0, void 0, function* () {
        const saved = yield timelineController_mongo_1.default.saveTimeline(testTimeline);
        expect(saved).toHaveProperty('id');
        expect(saved.user_id).toBe(testTimeline.user_id);
        expect(saved.items.length).toBe(1);
        createdTimelineId = saved.id;
    }));
    it('should fetch timelines by user', () => __awaiter(void 0, void 0, void 0, function* () {
        const timelines = yield timelineController_mongo_1.default.getTimelinesByUser(testTimeline.user_id);
        expect(timelines.length).toBeGreaterThan(0);
        const fetched = timelines.find((t) => t.id === createdTimelineId);
        expect(fetched).toBeDefined();
        expect(fetched === null || fetched === void 0 ? void 0 : fetched.name).toBe(testTimeline.name);
    }));
    it('should delete a timeline', () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield timelineController_mongo_1.default.removeUserTimeline(createdTimelineId);
        expect(result.success).toBe(true);
        expect(result.message).toMatch(/deleted successfully/);
        const timelinesAfterDelete = yield timelineController_mongo_1.default.getTimelinesByUser(testTimeline.user_id);
        const deleted = timelinesAfterDelete.find((t) => t.id === createdTimelineId);
        expect(deleted).toBeUndefined();
    }));
    it('should return failure if deleting non-existing timeline', () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield timelineController_mongo_1.default.removeUserTimeline('nonexistentid123');
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/not found|Error occurred/);
    }));
});
