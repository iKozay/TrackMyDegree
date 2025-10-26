const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CourseXCPController } = require('../dist/controllers/mondoDBControllers/CourseXCPController');
const { Degree } = require('../dist/models/Degree');

describe('CourseXCPController', () => {
  let mongoServer, mongoUri, courseXCPController;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    courseXCPController = new CourseXCPController();
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Degree.deleteMany({});
  });

  describe('Constructor', () => {
    it('should initialize with Degree model', () => {
      expect(courseXCPController.model).toBe(Degree);
      expect(courseXCPController.modelName).toBe('CourseXCP');
    });
  });

  describe('createCourseXCP', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101']
          }
        ]
      });
    });

    it('should add course to course pool successfully', async () => {
      const result = await courseXCPController.createCourseXCP('COMP102', 'COMP_CORE');

      expect(result).toBe(true);

      // Verify course was added
      const degree = await Degree.findById('COMP');
      const coursePool = degree.coursePools.find(cp => cp.id === 'COMP_CORE');
      expect(coursePool.courses).toContain('COMP102');
    });

    it('should not add duplicate course to course pool', async () => {
      // Try to add same course again
      const result = await courseXCPController.createCourseXCP('COMP101', 'COMP_CORE');

      expect(result).toBe(false); // No modification since course already exists

      // Verify course list remains the same
      const degree = await Degree.findById('COMP');
      const coursePool = degree.coursePools.find(cp => cp.id === 'COMP_CORE');
      expect(coursePool.courses).toHaveLength(1);
      expect(coursePool.courses).toContain('COMP101');
    });

    it('should return false for non-existent course pool', async () => {
      const result = await courseXCPController.createCourseXCP('COMP102', 'NONEXISTENT');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Degree.updateOne to throw an error
      const originalUpdateOne = Degree.updateOne;
      Degree.updateOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await courseXCPController.createCourseXCP('COMP102', 'COMP_CORE');

      expect(result).toBe(false);

      // Restore original method
      Degree.updateOne = originalUpdateOne;
    });
  });

  describe('getAllCourseXCP', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102', 'COMP103']
          }
        ]
      });
    });

    it('should get all courses for course pool', async () => {
      const result = await courseXCPController.getAllCourseXCP('COMP_CORE');

      expect(result).toHaveLength(3);
      expect(result).toContain('COMP101');
      expect(result).toContain('COMP102');
      expect(result).toContain('COMP103');
    });

    it('should return empty array for non-existent course pool', async () => {
      const result = await courseXCPController.getAllCourseXCP('NONEXISTENT');

      expect(result).toHaveLength(0);
    });

    it('should return empty array for course pool with no courses', async () => {
      await Degree.create({
        _id: 'EMPTY',
        name: 'Empty Degree',
        coursePools: [
          {
            id: 'EMPTY_POOL',
            name: 'Empty Pool',
            creditsRequired: 30,
            courses: []
          }
        ]
      });

      const result = await courseXCPController.getAllCourseXCP('EMPTY_POOL');

      expect(result).toHaveLength(0);
    });

    it('should handle aggregation errors gracefully', async () => {
      // Mock Degree.aggregate to throw an error
      const originalAggregate = Degree.aggregate;
      Degree.aggregate = jest.fn().mockImplementation(() => {
        throw new Error('Aggregation failed');
      });

      const result = await courseXCPController.getAllCourseXCP('COMP_CORE');

      expect(result).toHaveLength(0);

      // Restore original method
      Degree.aggregate = originalAggregate;
    });
  });

  describe('removeCourseXCP', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102', 'COMP103']
          }
        ]
      });
    });

    it('should remove course from course pool successfully', async () => {
      const result = await courseXCPController.removeCourseXCP('COMP102', 'COMP_CORE');

      expect(result).toBe(true);

      // Verify course was removed
      const degree = await Degree.findById('COMP');
      const coursePool = degree.coursePools.find(cp => cp.id === 'COMP_CORE');
      expect(coursePool.courses).toHaveLength(2);
      expect(coursePool.courses).not.toContain('COMP102');
      expect(coursePool.courses).toContain('COMP101');
      expect(coursePool.courses).toContain('COMP103');
    });

    it('should return false when course not found in pool', async () => {
      const result = await courseXCPController.removeCourseXCP('NONEXISTENT', 'COMP_CORE');

      expect(result).toBe(false);
    });

    it('should return false for non-existent course pool', async () => {
      const result = await courseXCPController.removeCourseXCP('COMP101', 'NONEXISTENT');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Degree.updateOne to throw an error
      const originalUpdateOne = Degree.updateOne;
      Degree.updateOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await courseXCPController.removeCourseXCP('COMP102', 'COMP_CORE');

      expect(result).toBe(false);

      // Restore original method
      Degree.updateOne = originalUpdateOne;
    });
  });

  describe('courseExistsInPool', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102']
          }
        ]
      });
    });

    it('should return true when course exists in pool', async () => {
      const result = await courseXCPController.courseExistsInPool('COMP101', 'COMP_CORE');

      expect(result).toBe(true);
    });

    it('should return false when course does not exist in pool', async () => {
      const result = await courseXCPController.courseExistsInPool('COMP103', 'COMP_CORE');

      expect(result).toBe(false);
    });

    it('should return false for non-existent course pool', async () => {
      const result = await courseXCPController.courseExistsInPool('COMP101', 'NONEXISTENT');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Degree.exists to throw an error
      const originalExists = Degree.exists;
      Degree.exists = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await courseXCPController.courseExistsInPool('COMP101', 'COMP_CORE');

      expect(result).toBe(false);

      // Restore original method
      Degree.exists = originalExists;
    });
  });

  describe('bulkCreateCourseXCP', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101']
          }
        ]
      });
    });

    it('should bulk add courses to course pool', async () => {
      const coursecodes = ['COMP102', 'COMP103', 'COMP104'];
      const result = await courseXCPController.bulkCreateCourseXCP(coursecodes, 'COMP_CORE');

      expect(result).toBe(1); // One degree was modified

      // Verify courses were added
      const degree = await Degree.findById('COMP');
      const coursePool = degree.coursePools.find(cp => cp.id === 'COMP_CORE');
      expect(coursePool.courses).toHaveLength(4);
      expect(coursePool.courses).toContain('COMP101'); // Original
      expect(coursePool.courses).toContain('COMP102'); // New
      expect(coursePool.courses).toContain('COMP103'); // New
      expect(coursePool.courses).toContain('COMP104'); // New
    });

    it('should not add duplicate courses in bulk operation', async () => {
      const coursecodes = ['COMP101', 'COMP102']; // COMP101 already exists
      const result = await courseXCPController.bulkCreateCourseXCP(coursecodes, 'COMP_CORE');

      expect(result).toBe(1); // One degree was modified

      // Verify only new course was added
      const degree = await Degree.findById('COMP');
      const coursePool = degree.coursePools.find(cp => cp.id === 'COMP_CORE');
      expect(coursePool.courses).toHaveLength(2);
      expect(coursePool.courses).toContain('COMP101'); // Original
      expect(coursePool.courses).toContain('COMP102'); // New
    });

    it('should return 0 for non-existent course pool', async () => {
      const coursecodes = ['COMP102', 'COMP103'];
      const result = await courseXCPController.bulkCreateCourseXCP(coursecodes, 'NONEXISTENT');

      expect(result).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Degree.updateOne to throw an error
      const originalUpdateOne = Degree.updateOne;
      Degree.updateOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const coursecodes = ['COMP102', 'COMP103'];
      const result = await courseXCPController.bulkCreateCourseXCP(coursecodes, 'COMP_CORE');

      expect(result).toBe(0);

      // Restore original method
      Degree.updateOne = originalUpdateOne;
    });
  });
});
