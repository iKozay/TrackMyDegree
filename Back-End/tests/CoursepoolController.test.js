const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  CoursePoolController,
} = require('../controllers/mondoDBControllers/CoursepoolController');
const { CoursePool } = require('../models/Coursepool');

describe('CoursepoolController', () => {
  let mongoServer, mongoUri, coursepoolController;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    coursepoolController = new CoursePoolController();
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await CoursePool.deleteMany({});
  });

  describe('Constructor', () => {
    it('should initialize with CoursePool model', () => {
      expect(coursepoolController.model).toBe(CoursePool);
      expect(coursepoolController.modelName).toBe('CoursePool');
    });
  });

  describe('createCoursePool', () => {
    it('should create a new course pool successfully', async () => {
      const coursePoolData = {
        _id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
        courses: ['COMP101', 'COMP102'],
      };

      const result = await coursepoolController.createCoursePool(coursePoolData);

      expect(result).toMatchObject({
        _id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
        courses: ['COMP101', 'COMP102'],
      });
    });

    it('should create course pool without courses array', async () => {
      const coursePoolData = {
        _id: 'MATH_CORE',
        name: 'Mathematics Core',
        creditsRequired: 30,
      };

      const result = await coursepoolController.createCoursePool(coursePoolData);

      expect(result).toMatchObject({
        _id: 'MATH_CORE',
        name: 'Mathematics Core',
        creditsRequired: 30,
      });
      expect(result.courses).toEqual([]);
    });

    it('should handle database errors', async () => {
      // Mock findById to throw error
      const originalCreate = coursepoolController.create;
      coursepoolController.create = jest.fn().mockRejectedValue(
        new Error('Database connection failed'),
      );

      const coursePoolData = {
        _id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
      };

      await expect(
        coursepoolController.createCoursePool(coursePoolData),
      ).rejects.toThrow('Database connection failed');

      // Restore original method
      coursepoolController.create = originalCreate;
    });

    it('should handle create failure', async () => {
      // Mock create to return failure
      const originalCreate = coursepoolController.create;
      coursepoolController.create = jest.fn().mockResolvedValue({
        success: false,
        error: 'Create failed',
      });

      const coursePoolData = {
        _id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
      };

      await expect(
        coursepoolController.createCoursePool(coursePoolData),
      ).rejects.toThrow('Create failed');

      // Restore original method
      coursepoolController.create = originalCreate;
    });
  });

  describe('getAllCoursePools', () => {
    beforeEach(async () => {
      await CoursePool.create([
        {
          _id: 'COMP_CORE',
          name: 'Computer Science Core',
          creditsRequired: 60,
          courses: ['COMP101', 'COMP102'],
        },
        {
          _id: 'MATH_CORE',
          name: 'Mathematics Core',
          creditsRequired: 30,
          courses: ['MATH101'],
        },
        {
          _id: 'ELEC_CORE',
          name: 'Electrical Core',
          creditsRequired: 45,
        },
      ]);
    });

    it('should get all course pools', async () => {
      const result = await coursepoolController.getAllCoursePools();

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('_id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('creditsRequired');
      expect(result[0]).toHaveProperty('courses');
    });

    it('should return empty courses array for pools without courses', async () => {
      const result = await coursepoolController.getAllCoursePools();
      const elecPool = result.find((cp) => cp._id === 'ELEC_CORE');

      expect(elecPool.courses).toEqual([]);
    });

    it('should return empty array when no course pools exist', async () => {
      await CoursePool.deleteMany({});
      const result = await coursepoolController.getAllCoursePools();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Mock findAll to return error
      const originalFindAll = coursepoolController.findAll;
      coursepoolController.findAll = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      const result = await coursepoolController.getAllCoursePools();
      expect(result).toEqual([]);

      // Restore original method
      coursepoolController.findAll = originalFindAll;
    });

    it('should handle when findAll returns null data', async () => {
      const originalFindAll = coursepoolController.findAll;
      coursepoolController.findAll = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await coursepoolController.getAllCoursePools();
      expect(result).toEqual([]);

      coursepoolController.findAll = originalFindAll;
    });
  });

  describe('getCoursePool', () => {
    beforeEach(async () => {
      await CoursePool.create({
        _id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
        courses: ['COMP101', 'COMP102'],
      });
    });

    it('should get course pool by ID', async () => {
      const result = await coursepoolController.getCoursePool('COMP_CORE');

      expect(result).toMatchObject({
        _id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
        courses: ['COMP101', 'COMP102'],
      });
    });

    it('should return undefined for non-existent course pool', async () => {
      const result = await coursepoolController.getCoursePool('NONEXISTENT');
      expect(result).toBeUndefined();
    });

    it('should handle database errors', async () => {
      // Mock findById to throw error
      const originalFindById = coursepoolController.findById;
      coursepoolController.findById = jest.fn().mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await coursepoolController.getCoursePool('COMP_CORE');
      expect(result).toBeUndefined();

      // Restore original method
      coursepoolController.findById = originalFindById;
    });

    it('should return undefined when findById returns error', async () => {
      const originalFindById = coursepoolController.findById;
      coursepoolController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Not found',
      });

      const result = await coursepoolController.getCoursePool('COMP_CORE');
      expect(result).toBeUndefined();

      coursepoolController.findById = originalFindById;
    });

    it('should handle course pool without courses array', async () => {
      await CoursePool.create({
        _id: 'MATH_CORE',
        name: 'Mathematics Core',
        creditsRequired: 30,
      });

      const result = await coursepoolController.getCoursePool('MATH_CORE');
      expect(result.courses).toEqual([]);
    });
  });

  describe('updateCoursePool', () => {
    beforeEach(async () => {
      await CoursePool.create({
        _id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
        courses: ['COMP101', 'COMP102'],
      });
    });

    it('should update course pool successfully', async () => {
      const updates = {
        name: 'Updated Core',
        creditsRequired: 75,
      };

      const result = await coursepoolController.updateCoursePool(
        'COMP_CORE',
        updates,
      );

      expect(result).toMatchObject({
        _id: 'COMP_CORE',
        name: 'Updated Core',
        creditsRequired: 75,
      });
    });

    it('should return null for non-existent course pool', async () => {
      const updates = { name: 'Updated Name' };
      const result = coursepoolController.updateCoursePool(
        'NONEXISTENT',
        updates,
      );

      await expect(result).rejects.toThrow('CoursePool not found');
    });

    it('should handle database errors on findById', async () => {
      // Mock findById to throw error
      const originalFindById = coursepoolController.findById;
      coursepoolController.findById = jest.fn().mockRejectedValue(
        new Error('Database connection failed'),
      );

      const updates = { name: 'Updated Name' };
      const result = coursepoolController.updateCoursePool(
        'COMP_CORE',
        updates,
      );

      await expect(result).rejects.toThrow('Database connection failed');

      // Restore original method
      coursepoolController.findById = originalFindById;
    });

    it('should handle update failure', async () => {
      // Mock updateById to return failure
      const originalUpdateById = coursepoolController.updateById;
      coursepoolController.updateById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Update failed',
      });

      const updates = { name: 'Updated Name' };
      const result = coursepoolController.updateCoursePool(
        'COMP_CORE',
        updates,
      );

      await expect(result).rejects.toThrow('Update failed');

      // Restore original method
      coursepoolController.updateById = originalUpdateById;
    });

    it('should handle when findById returns null', async () => {
      const originalFindById = coursepoolController.findById;
      coursepoolController.findById = jest.fn().mockResolvedValue(null);

      const updates = { name: 'Updated Name' };
      const result = coursepoolController.updateCoursePool(
        'COMP_CORE',
        updates,
      );

      await expect(result).rejects.toThrow('Course pool not found');

      coursepoolController.findById = originalFindById;
    });
  });

  describe('deleteCoursePool', () => {
    beforeEach(async () => {
      await CoursePool.create({
        _id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
        courses: ['COMP101', 'COMP102'],
      });
    });

    it('should delete course pool successfully', async () => {
      const result = await coursepoolController.deleteCoursePool('COMP_CORE');

      expect(result).toBe(true);

      // Verify course pool is deleted
      const deletedPool = await CoursePool.findById('COMP_CORE');
      expect(deletedPool).toBeNull();
    });

    it('should handle errors for non-existent course pool', async () => {
      const result = coursepoolController.deleteCoursePool('NONEXISTENT');
      await expect(result).rejects.toThrow('CoursePool not found');
    });

    it('should handle database errors', async () => {
      // Mock deleteById to throw error
      const originalDeleteById = coursepoolController.deleteById;
      coursepoolController.deleteById = jest.fn().mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = coursepoolController.deleteCoursePool('COMP_CORE');
      
       await expect(result).rejects.toThrow('Database connection failed');

      // Restore original method
      coursepoolController.deleteById = originalDeleteById;
    });

    it('should handle delete failure', async () => {
      // Mock deleteById to return failure
      const originalDeleteById = coursepoolController.deleteById;
      coursepoolController.deleteById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Delete failed',
      });

      const result = coursepoolController.deleteCoursePool('COMP_CORE');
      await expect(result).rejects.toThrow('Delete failed');

      // Restore original method
      coursepoolController.deleteById = originalDeleteById;
    });
  });

  describe('Additional Edge Cases for Coverage', () => {
    it('should handle createCoursePool when create returns error without message', async () => {
      const originalFindById = coursepoolController.findById;
      const originalCreate = coursepoolController.create;

      coursepoolController.findById = jest.fn().mockResolvedValue(null);
      coursepoolController.create = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      const coursePoolData = {
        _id: 'TEST_POOL',
        name: 'Test Pool',
        creditsRequired: 30,
      };

      await expect(
        coursepoolController.createCoursePool(coursePoolData),
      ).rejects.toThrow('Failed to create course pool');

      coursepoolController.findById = originalFindById;
      coursepoolController.create = originalCreate;
    });

    it('should handle updateCoursePool when updateById returns error without message', async () => {
      await CoursePool.create({
        _id: 'TEST_POOL',
        name: 'Test Pool',
        creditsRequired: 30,
      });

      const originalUpdateById = coursepoolController.updateById;
      coursepoolController.updateById = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      const updates = { name: 'Updated Name' };
      const result = coursepoolController.updateCoursePool(
        'TEST_POOL',
        updates,
      );

      await expect(result).rejects.toThrow('Failed to update course pool');

      coursepoolController.updateById = originalUpdateById;
    });

    it('should handle deleteCoursePool when deleteById returns error without message', async () => {
      const originalDeleteById = coursepoolController.deleteById;
      coursepoolController.deleteById = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      const result = coursepoolController.deleteCoursePool('TEST_POOL');
      await expect(result).rejects.toThrow('Failed to delete course pool');

      coursepoolController.deleteById = originalDeleteById;
    });
  });
});


