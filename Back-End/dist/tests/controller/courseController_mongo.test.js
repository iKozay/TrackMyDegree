"use strict";
/**
 * @file Tests for CourseController_Mongo
 * Covers all controller methods with 100% coverage
 */
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
const courseController_mongo_1 = __importDefault(require("../../controllers/courseController/courseController_mongo"));
const mongoose_1 = __importDefault(require("mongoose"));
// Mock the Mongoose model
jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');
    return Object.assign(Object.assign({}, actual), { model: jest.fn(() => ({
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            findOneAndDelete: jest.fn(),
            save: jest.fn(),
        })) });
});
// Utility function to mock Express response
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
describe('CourseController_Mongo', () => {
    let req;
    let res;
    let mockCourseModel;
    beforeEach(() => {
        req = {};
        res = mockResponse();
        mockCourseModel = mongoose_1.default.model('Course');
        jest.clearAllMocks();
    });
    // ========================================
    // getAllCourses
    // ========================================
    it('should return all courses successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        const fakeCourses = [
            { code: 'COMP101', title: 'Intro', credits: 3, offeredIn: 'Fall', description: 'Basic', requisites: [] },
        ];
        mockCourseModel.find.mockResolvedValue(fakeCourses);
        yield courseController_mongo_1.default.getAllCourses(req, res);
        expect(mockCourseModel.find).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(fakeCourses);
    }));
    it('should handle error in getAllCourses', () => __awaiter(void 0, void 0, void 0, function* () {
        mockCourseModel.find.mockRejectedValue(new Error('DB error'));
        yield courseController_mongo_1.default.getAllCourses(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    }));
    // ========================================
    // getCourseByCode
    // ========================================
    it('should return a course by code', () => __awaiter(void 0, void 0, void 0, function* () {
        req.params = { code: 'COMP101' };
        const fakeCourse = {
            code: 'COMP101',
            title: 'Intro',
            credits: 3,
            offeredIn: 'Fall',
            description: 'Basic',
            requisites: [],
            toObject: jest.fn().mockReturnValue({ code: 'COMP101' }),
        };
        mockCourseModel.findOne.mockResolvedValue(fakeCourse);
        yield courseController_mongo_1.default.getCourseByCode(req, res);
        expect(mockCourseModel.findOne).toHaveBeenCalledWith({ code: 'COMP101' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ code: 'COMP101' });
    }));
    it('should return 404 if course not found', () => __awaiter(void 0, void 0, void 0, function* () {
        req.params = { code: 'COMP404' };
        mockCourseModel.findOne.mockResolvedValue(null);
        yield courseController_mongo_1.default.getCourseByCode(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    }));
    it('should handle error in getCourseByCode', () => __awaiter(void 0, void 0, void 0, function* () {
        req.params = { code: 'COMP500' };
        mockCourseModel.findOne.mockRejectedValue(new Error('DB fail'));
        yield courseController_mongo_1.default.getCourseByCode(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'DB fail' });
    }));
    // ========================================
    // createCourse
    // ========================================
    it('should create a new course successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        req.body = {
            code: 'COMP102',
            title: 'DS',
            credits: 3,
            offeredIn: 'Winter',
            description: 'Data structures',
            requisites: [],
        };
        mockCourseModel.findOne.mockResolvedValue(null);
        const saveMock = jest.fn().mockResolvedValue({
            toObject: jest.fn().mockReturnValue(req.body),
        });
        mockCourseModel.mockImplementation(() => ({ save: saveMock }));
        yield courseController_mongo_1.default.createCourse(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(req.body);
    }));
    it('should not create course if it exists', () => __awaiter(void 0, void 0, void 0, function* () {
        req.body = { code: 'COMP101' };
        mockCourseModel.findOne.mockResolvedValue({ code: 'COMP101' });
        yield courseController_mongo_1.default.createCourse(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Course already exists' });
    }));
    it('should handle error in createCourse', () => __awaiter(void 0, void 0, void 0, function* () {
        req.body = { code: 'COMP999' };
        mockCourseModel.findOne.mockRejectedValue(new Error('DB fail'));
        yield courseController_mongo_1.default.createCourse(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'DB fail' });
    }));
    // ========================================
    // updateCourse
    // ========================================
    it('should update a course successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        req.params = { code: 'COMP101' };
        req.body = { title: 'Updated Title' };
        const fakeUpdated = { toObject: jest.fn().mockReturnValue(req.body) };
        mockCourseModel.findOneAndUpdate.mockResolvedValue(fakeUpdated);
        yield courseController_mongo_1.default.updateCourse(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(req.body);
    }));
    it('should return 404 if update target not found', () => __awaiter(void 0, void 0, void 0, function* () {
        req.params = { code: 'COMP404' };
        mockCourseModel.findOneAndUpdate.mockResolvedValue(null);
        yield courseController_mongo_1.default.updateCourse(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    }));
    it('should handle error in updateCourse', () => __awaiter(void 0, void 0, void 0, function* () {
        req.params = { code: 'COMP999' };
        mockCourseModel.findOneAndUpdate.mockRejectedValue(new Error('Update fail'));
        yield courseController_mongo_1.default.updateCourse(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Update fail' });
    }));
    // ========================================
    // deleteCourse
    // ========================================
    it('should delete a course successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        req.params = { code: 'COMP101' };
        mockCourseModel.findOneAndDelete.mockResolvedValue({});
        yield courseController_mongo_1.default.deleteCourse(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Course deleted successfully' });
    }));
    it('should return 404 if course not found for deletion', () => __awaiter(void 0, void 0, void 0, function* () {
        req.params = { code: 'COMP404' };
        mockCourseModel.findOneAndDelete.mockResolvedValue(null);
        yield courseController_mongo_1.default.deleteCourse(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    }));
    it('should handle error in deleteCourse', () => __awaiter(void 0, void 0, void 0, function* () {
        req.params = { code: 'COMP999' };
        mockCourseModel.findOneAndDelete.mockRejectedValue(new Error('Delete fail'));
        yield courseController_mongo_1.default.deleteCourse(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Delete fail' });
    }));
    // ========================================
    // getCoursesByPool
    // ========================================
    it('should get courses by pool', () => __awaiter(void 0, void 0, void 0, function* () {
        req.params = { poolName: 'Fall' };
        const fakeCourses = [{ code: 'COMP101' }];
        mockCourseModel.find.mockResolvedValue(fakeCourses);
        yield courseController_mongo_1.default.getCoursesByPool(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(fakeCourses);
    }));
    it('should handle error in getCoursesByPool', () => __awaiter(void 0, void 0, void 0, function* () {
        req.params = { poolName: 'Winter' };
        mockCourseModel.find.mockRejectedValue(new Error('Pool fail'));
        yield courseController_mongo_1.default.getCoursesByPool(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Pool fail' });
    }));
});
