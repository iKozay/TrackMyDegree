/* eslint-disable no-undef */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const { Degree } = require('../dist/models/Degree');
const CourseXCPController = require('../dist/controllers/CourseXCPController/CourseXCPController_mongoose').default;

const DB_OPS = require('../dist/Util/DB_Ops').default;

describe('CourseXCPController Mongoose', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Degree.deleteMany({});
  });



  describe('createCourseXCP', () => {
    it('should trigger Sentry logging on database error', async () => {
      const originalFindOne = Degree.findOne;
      Degree.findOne = jest.fn().mockRejectedValue(new Error('Mock database error'));

      const result = await CourseXCPController.createCourseXCP({
        coursecode: 'SOEN490',
        coursepool_id: 'pool123',
        group_id: 'group1'
      });

      expect(result).toBe(DB_OPS.FAILURE);
      Degree.findOne = originalFindOne;
    });

    it('should create a CourseXCP record successfully', async () => {
      await Degree.create({
        _id: 'degree1',
        name: 'Software Engineering',
        totalCredits: 120,
        coursePools: [{
          id: 'pool123',
          name: 'Core Courses',
          creditsRequired: 30,
          courses: []
        }]
      });

      const result = await CourseXCPController.createCourseXCP({
        coursecode: 'SOEN490',
        coursepool_id: 'pool123',
        group_id: 'group1'
      });

      expect(result).toBe(DB_OPS.SUCCESS);

      const degree = await Degree.findOne({ 'coursePools.id': 'pool123' });
      const coursePool = degree.coursePools.find(pool => pool.id === 'pool123');
      expect(coursePool.courses).toContain('SOEN490');
    });

    it('should return MOSTLY_OK when coursepool not found', async () => {
      const result = await CourseXCPController.createCourseXCP({
        coursecode: 'SOEN490',
        coursepool_id: 'nonexistent',
        group_id: 'group1'
      });

      expect(result).toBe(DB_OPS.MOSTLY_OK);
    });

    it('should return MOSTLY_OK when course already exists', async () => {
      await Degree.create({
        _id: 'degree1',
        name: 'Software Engineering',
        totalCredits: 120,
        coursePools: [{
          id: 'pool123',
          name: 'Core Courses',
          creditsRequired: 30,
          courses: ['SOEN490']
        }]
      });

      const result = await CourseXCPController.createCourseXCP({
        coursecode: 'SOEN490',
        coursepool_id: 'pool123',
        group_id: 'group1'
      });

      expect(result).toBe(DB_OPS.MOSTLY_OK);
    });
  });

  describe('getAllCourseXCP', () => {
    it('should trigger Sentry logging in getAllCourseXCP', async () => {
      const originalFindOne = Degree.findOne;
      Degree.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await CourseXCPController.getAllCourseXCP('pool123');

      expect(result).toBeUndefined();
      Degree.findOne = originalFindOne;
    });

    it('should return all course codes for a given coursepool', async () => {
      await Degree.create({
        _id: 'degree1',
        name: 'Software Engineering',
        totalCredits: 120,
        coursePools: [{
          id: 'pool123',
          name: 'Core Courses',
          creditsRequired: 30,
          courses: ['SOEN490', 'SOEN390']
        }]
      });

      const result = await CourseXCPController.getAllCourseXCP('pool123');

      expect(result).toBeDefined();
      expect(result.course_codes).toHaveLength(2);
      expect(result.course_codes).toContain('SOEN490');
      expect(result.course_codes).toContain('SOEN390');
    });

    it('should return empty array for non-existent coursepool', async () => {
      const result = await CourseXCPController.getAllCourseXCP('nonexistent');

      expect(result).toBeDefined();
      expect(result.course_codes).toHaveLength(0);
    });
  });

  describe('updateCourseXCP', () => {
    it('should trigger Sentry logging in updateCourseXCP', async () => {
      const originalFindOne = Degree.findOne;
      Degree.findOne = jest.fn().mockRejectedValue(new Error('Update error'));

      const result = await CourseXCPController.updateCourseXCP({
        id: 'test-id',
        coursecode: 'SOEN491',
        coursepool_id: 'pool456',
        group_id: 'group2'
      });

      expect(result).toBe(DB_OPS.FAILURE);
      Degree.findOne = originalFindOne;
    });

    it('should add course when updating (acts like create)', async () => {
      await Degree.create({
        _id: 'degree1',
        name: 'Software Engineering',
        totalCredits: 120,
        coursePools: [{
          id: 'pool123',
          name: 'Core Courses',
          creditsRequired: 30,
          courses: []
        }]
      });

      const result = await CourseXCPController.updateCourseXCP({
        id: 'test-id',
        coursecode: 'SOEN491',
        coursepool_id: 'pool123',
        group_id: 'group2'
      });

      expect(result).toBe(DB_OPS.SUCCESS);

      const degree = await Degree.findOne({ 'coursePools.id': 'pool123' });
      const coursePool = degree.coursePools.find(pool => pool.id === 'pool123');
      expect(coursePool.courses).toContain('SOEN491');
    });

    it('should return MOSTLY_OK when coursepool not found', async () => {
      const result = await CourseXCPController.updateCourseXCP({
        id: 'test-id',
        coursecode: 'SOEN491',
        coursepool_id: 'nonexistent',
        group_id: 'group2'
      });

      expect(result).toBe(DB_OPS.MOSTLY_OK);
    });

    it('should return MOSTLY_OK when course already exists in update', async () => {
      await Degree.create({
        _id: 'degree1',
        name: 'Software Engineering',
        totalCredits: 120,
        coursePools: [{
          id: 'pool123',
          name: 'Core Courses',
          creditsRequired: 30,
          courses: ['SOEN490']
        }]
      });

      const result = await CourseXCPController.updateCourseXCP({
        id: 'test-id',
        coursecode: 'SOEN490',
        coursepool_id: 'pool123',
        group_id: 'group2'
      });

      expect(result).toBe(DB_OPS.MOSTLY_OK);
    });
  });

  describe('removeDegreeXCP', () => {
    it('should trigger Sentry logging in removeDegreeXCP', async () => {
      const originalFindOne = Degree.findOne;
      Degree.findOne = jest.fn().mockRejectedValue(new Error('Delete error'));

      const result = await CourseXCPController.removeDegreeXCP({
        coursecode: 'SOEN490',
        coursepool_id: 'pool123',
        group_id: 'group1'
      });

      expect(result).toBe(DB_OPS.FAILURE);
      Degree.findOne = originalFindOne;
    });

    it('should delete a CourseXCP record successfully', async () => {
      await Degree.create({
        _id: 'degree1',
        name: 'Software Engineering',
        totalCredits: 120,
        coursePools: [{
          id: 'pool123',
          name: 'Core Courses',
          creditsRequired: 30,
          courses: ['SOEN490', 'SOEN390']
        }]
      });

      const result = await CourseXCPController.removeDegreeXCP({
        coursecode: 'SOEN390',
        coursepool_id: 'pool123',
      });

      expect(result).toBe(DB_OPS.SUCCESS);

      const degree = await Degree.findOne({ 'coursePools.id': 'pool123' });
      const coursePool = degree.coursePools.find(pool => pool.id === 'pool123');
      expect(coursePool.courses).not.toContain('SOEN390');
      expect(coursePool.courses).toContain('SOEN490');
    });

    it('should return MOSTLY_OK when coursepool not found', async () => {
      const result = await CourseXCPController.removeDegreeXCP({
        coursecode: 'SOEN490',
        coursepool_id: 'nonexistent',
        group_id: 'group1'
      });

      expect(result).toBe(DB_OPS.MOSTLY_OK);
    });

    it('should return MOSTLY_OK when course not found', async () => {
      await Degree.create({
        _id: 'degree1',
        name: 'Software Engineering',
        totalCredits: 120,
        coursePools: [{
          id: 'pool123',
          name: 'Core Courses',
          creditsRequired: 30,
          courses: ['SOEN390']
        }]
      });

      const result = await CourseXCPController.removeDegreeXCP({
        coursecode: 'NONEXISTENT',
        coursepool_id: 'pool123',
        group_id: 'group1'
      });

      expect(result).toBe(DB_OPS.MOSTLY_OK);
    });
  });
});