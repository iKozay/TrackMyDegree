const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CourseController } = require('../controllers/courseController');
const { Course } = require('../models/course');

describe('CourseController', () => {
  let mongoServer, mongoUri, courseController;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    courseController = new CourseController();
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Course.deleteMany({});
  });

  describe('Constructor', () => {
    it('should initialize with Course model', () => {
      expect(courseController.model).toBe(Course);
      expect(courseController.modelName).toBe('Course');
    });
  });

  describe('bulkCreateCourses', () => {
    it('should create multiple courses in bulk', async () => {
      const courseData = [
        {
          _id: 'COMP101',
          title: 'Introduction to Programming',
          description: 'Basic programming concepts',
          credits: 3,
          offeredIn: ['Fall', 'Winter'],
          prereqCoreqText: "",
          rules: {
            prereq: [['MATH101']],
            coreq: [],
            not_taken: [],
          },
        },
        {
          _id: 'COMP102',
          title: 'Introduction to Programming 2',
          description: 'Basic programming concepts',
          credits: 3,
          offeredIn: ['Fall', 'Winter'],
          prereqCoreqText: "",
          rules: {
            prereq: [['MATH102']],
            coreq: [],
            not_taken: [],
          },
        },
      ];

      const result = await courseController.bulkCreateCourses(courseData);
      expect(result).toBe(true);

      const createdCourses = await Course.find({});
      expect(createdCourses).toHaveLength(2);
      expect(createdCourses[0]).toMatchObject(courseData[0]);
      expect(createdCourses[1]).toMatchObject(courseData[1]);
    });

    it('should handle database errors', async () => {
      // Mock create to throw an error
      const originalBulkWrite = courseController.bulkWrite;
      courseController.bulkWrite = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });
      const courseData = [
        {
          _id: 'COMP101',
          title: 'Introduction to Programming',
          description: 'Basic programming concepts',
          credits: 3,
          offeredIn: ['Fall', 'Winter'],
          prerequisites: ['MATH101'],
          corequisites: [],
        },
        {
          _id: 'COMP102',
          title: 'Introduction to Programming 2',
          description: 'Basic programming concepts',
          credits: 3,
          offeredIn: ['Fall', 'Winter'],
          prerequisites: ['MATH102'],
          corequisites: [],
        },
      ];

      await expect(
        courseController.bulkCreateCourses(courseData),
      ).rejects.toThrow('Database connection failed');

      // Restore original method
      courseController.bulkWrite = originalBulkWrite;
    });
  });

  describe('updateCourse', () => {
    it('should update an existing course', async () => {
      const courseData = {
        _id: 'COMP101',
        title: 'Introduction to Programming',
        description: 'Basic programming concepts',
        credits: 3,
        offeredIn: ['Fall', 'Winter'],
        prerequisites: ['MATH101'],
        corequisites: [],
      };

      await Course.create(courseData);

      const result = await courseController.updateCourse(courseData);
      expect(result).toHaveProperty('_id', courseData._id);
    });

    it('should handle database errors', async () => {
      // Mock update to throw an error
      const originalUpdate = courseController.updateById;
      courseController.updateById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });
      const courseData = {
        _id: 'COMP101',
        title: 'Introduction to Programming',
        description: 'Basic programming concepts',
        credits: 3,
        offeredIn: ['Fall', 'Winter'],
        prerequisites: ['MATH101'],
        corequisites: [],
      };

      await expect(courseController.updateCourse(courseData)).rejects.toThrow(
        'Database connection failed',
      );

      // Restore original method
      courseController.updateById = originalUpdate;
    });
  });

  describe('getAllCourses', () => {
    beforeEach(async () => {
      await Course.create([
        {
          _id: 'COMP101',
          title: 'Introduction to Programming',
          description: 'Basic programming concepts',
          credits: 3,
          offeredIn: ['Fall', 'Winter'],
          prerequisites: ['MATH101'],
          corequisites: [],
        },
        {
          _id: 'COMP102',
          title: 'Data Structures',
          description: 'Advanced data structures',
          credits: 3,
          offeredIn: ['Winter', 'Summer'],
          prerequisites: ['COMP101'],
          corequisites: [],
        },
        {
          _id: 'MATH101',
          title: 'Calculus I',
          description: 'Differential calculus',
          credits: 4,
          offeredIn: ['Fall', 'Winter', 'Summer'],
          prerequisites: [],
          corequisites: [],
        },
      ]);
    });

    it('should get all courses without filters', async () => {
      const result = await courseController.getAllCourses();

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('_id');
    });

    it('should get all courses with empty params object', async () => {
      const result = await courseController.getAllCourses({});

      expect(result).toHaveLength(3);
    });

    it('should filter courses by pool', async () => {
      const result = await courseController.getAllCourses({ pool: 'Fall' });

      expect(result).toHaveLength(2);
      expect(result.every((course) => course.offeredIn.includes('Fall'))).toBe(
        true,
      );
    });

    it('should search courses by title and description', async () => {
      const result = await courseController.getAllCourses({
        search: 'programming',
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Introduction to Programming');
    });

    it('should paginate results', async () => {
      const result = await courseController.getAllCourses({
        page: 1,
        limit: 2,
      });

      expect(result).toHaveLength(2);
    });

    it('should sort courses by specified field', async () => {
      const result = await courseController.getAllCourses({ sort: 'credits' });

      expect(result[0].credits).toBeLessThanOrEqual(result[1].credits);
    });

    it('should use default title sort when no sort specified', async () => {
      const result = await courseController.getAllCourses({
        page: 1,
        limit: 10,
      });

      // Should be sorted by title (alphabetically)
      expect(result).toHaveLength(3);
      // Verify sorting by checking that titles are in alphabetical order
      const titles = result.map((course) => course.title);
      expect(titles).toEqual([...titles].sort());
    });

    it('should handle pool parameter correctly', async () => {
      const result = await courseController.getAllCourses({ pool: 'Winter' });

      expect(result).toHaveLength(3);
      expect(
        result.every((course) => course.offeredIn.includes('Winter')),
      ).toBe(true);
    });

    it('should handle multiple parameters together', async () => {
      const result = await courseController.getAllCourses({
        pool: 'Fall',
        search: 'programming',
        page: 1,
        limit: 10,
        sort: 'credits',
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('Programming');
    });

    it('should handle empty results', async () => {
      await Course.deleteMany({});
      const result = await courseController.getAllCourses();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Mock findAll to throw an error
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(courseController.getAllCourses()).rejects.toThrow(
        'Database connection failed',
      );

      // Restore original method
      courseController.findAll = originalFindAll;
    });

    it('should handle errors in findAll and trigger handleError', async () => {
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockImplementation(() => {
        throw new Error('FindAll error');
      });

      await expect(
        courseController.getAllCourses({ pool: 'Test' }),
      ).rejects.toThrow('FindAll error');

      courseController.findAll = originalFindAll;
    });
  });

  describe('getAllCourseCodes', () => {
    beforeEach(async () => {
      await Course.create([
        {
          _id: 'CODES101',
          title: 'Introduction to Programming',
          description: 'Basic programming concepts',
          credits: 3,
          offeredIn: ['Fall', 'Winter'],
        },
        {
          _id: 'CODES102',
          title: 'Data Structures',
          description: 'Advanced data structures',
          credits: 3,
          offeredIn: ['Winter', 'Summer'],
        },
      ]);
    });

    it('should get all course codes', async () => {
      const result = await courseController.getAllCourseCodes();

      expect(result).toContain('CODES101');
      expect(result).toContain('CODES102');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle database errors', async () => {
      // Mock findAll to throw an error
      const originalFindAll = courseController.findAll;
      const mockFindAll = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });
      courseController.findAll = mockFindAll;

      try {
        await expect(courseController.getAllCourseCodes()).rejects.toThrow(
          'Database connection failed',
        );
      } finally {
        // Restore original method immediately
        courseController.findAll = originalFindAll;
      }
    });

    it('should handle when findAll returns no data', async () => {
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await courseController.getAllCourseCodes();
      expect(result).toEqual([]);

      courseController.findAll = originalFindAll;
    });

    it('should handle when findAll returns error response', async () => {
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const result = await courseController.getAllCourseCodes();
      expect(result).toEqual([]);

      courseController.findAll = originalFindAll;
    });
  });

  describe('getCourseByCode', () => {
    beforeEach(async () => {
      await Course.create({
        _id: 'COMP101',
        title: 'Introduction to Programming',
        description: 'Basic programming concepts',
        credits: 3,
        offeredIn: ['Fall', 'Winter'],
        prerequisites: ['MATH101'],
        corequisites: [],
      });
    });

    it('should get course by code', async () => {
      const result = await courseController.getCourseByCode('COMP101');

      expect(result).toMatchObject({
        _id: 'COMP101',
        title: 'Introduction to Programming',
        description: 'Basic programming concepts',
        credits: 3,
      });
    });

    it('should throw error for non-existent course', async () => {
      await expect(
        courseController.getCourseByCode('NONEXISTENT'),
      ).rejects.toThrow('Course not found');
    });

    it('should handle database errors', async () => {
      // Mock Course.findById to throw an error
      const originalFindById = Course.findById;
      Course.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(courseController.getCourseByCode('COMP101')).rejects.toThrow(
        'Database connection failed',
      );

      // Restore original method
      Course.findById = originalFindById;
    });
  });

  describe('getCoursesByPool', () => {
    beforeEach(async () => {
      await Course.create([
        {
          _id: 'COMP101',
          title: 'Introduction to Programming',
          description: 'Basic programming concepts',
          credits: 3,
          offeredIn: ['Fall', 'Winter'],
        },
        {
          _id: 'COMP102',
          title: 'Data Structures',
          description: 'Advanced data structures',
          credits: 3,
          offeredIn: ['Winter', 'Summer'],
        },
        {
          _id: 'MATH101',
          title: 'Calculus I',
          description: 'Differential calculus',
          credits: 4,
          offeredIn: ['Fall', 'Winter', 'Summer'],
        },
      ]);
    });

    it('should get courses by pool', async () => {
      const result = await courseController.getCoursesByPool('Fall');

      expect(result).toHaveLength(2);
      expect(result.every((course) => course.offeredIn.includes('Fall'))).toBe(
        true,
      );
    });

    it('should return empty array for non-existent pool', async () => {
      const result = await courseController.getCoursesByPool('NonExistent');

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Mock findAll to throw an error
      const originalFindAll = courseController.findAll;
      const mockFindAll = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });
      courseController.findAll = mockFindAll;

      try {
        await expect(courseController.getCoursesByPool('Fall')).rejects.toThrow(
          'Database connection failed',
        );
      } finally {
        // Restore original method immediately
        courseController.findAll = originalFindAll;
      }
    });
  });

  describe('deleteCourse', () => {
    it('should delete an existing course', async () => {
      const courseData = {
        _id: 'COMP101',
        title: 'Introduction to Programming',
        description: 'Basic programming concepts',
        credits: 3,
        offeredIn: ['Fall', 'Winter'],
        prerequisites: ['MATH101'],
        corequisites: [],
      };

      await Course.create(courseData);
      const result = await courseController.deleteCourse('COMP101');
      expect(result).toBe("Course 'COMP101' deleted successfully.");
    });

    it('should handle database errors', async () => {
      // Mock deleteById to throw an error
      const originalDeleteById = courseController.deleteById;
      courseController.deleteById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(courseController.deleteCourse('COMP101')).rejects.toThrow(
        'Database connection failed',
      );
      // Restore original method
      courseController.deleteById = originalDeleteById;
    });
  });

  describe('Additional Edge Cases for Coverage', () => {
    it('should handle getAllCourses when findAll returns no data', async () => {
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await courseController.getAllCourses();
      expect(result).toEqual([]);

      courseController.findAll = originalFindAll;
    });

    it('should handle getCoursesByPool when findAll returns no data', async () => {
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await courseController.getCoursesByPool('TestPool');
      expect(result).toEqual([]);

      courseController.findAll = originalFindAll;
    });

    it('should handle getCoursesByPool when findAll returns error', async () => {
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockResolvedValue({
        success: false,
        error: 'Test error',
      });

      await expect(
        courseController.getCoursesByPool('TestPool'),
      ).rejects.toThrow('Test error');

      courseController.findAll = originalFindAll;
    });

    it('should handle getCourseByCode when findById returns error without message', async () => {
      const originalFindById = courseController.findById;
      courseController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      await expect(courseController.getCourseByCode('TEST')).rejects.toThrow(
        'Course not found',
      );

      courseController.findById = originalFindById;
    });
  });
});
