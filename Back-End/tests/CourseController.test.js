const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { CourseController } = require('../dist/controllers/mondoDBControllers/CourseController');
const { Course } = require('../dist/models/Course');

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
          corequisites: []
        },
        {
          _id: 'COMP102',
          title: 'Data Structures',
          description: 'Advanced data structures',
          credits: 3,
          offeredIn: ['Winter', 'Summer'],
          prerequisites: ['COMP101'],
          corequisites: []
        },
        {
          _id: 'MATH101',
          title: 'Calculus I',
          description: 'Differential calculus',
          credits: 4,
          offeredIn: ['Fall', 'Winter', 'Summer'],
          prerequisites: [],
          corequisites: []
        }
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
      expect(result.every(course => course.offeredIn.includes('Fall'))).toBe(true);
    });

    it('should search courses by title and description', async () => {
      const result = await courseController.getAllCourses({ search: 'programming' });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Introduction to Programming');
    });

    it('should paginate results', async () => {
      const result = await courseController.getAllCourses({ page: 1, limit: 2 });

      expect(result).toHaveLength(2);
    });

    it('should sort courses by specified field', async () => {
      const result = await courseController.getAllCourses({ sort: 'credits' });

      expect(result[0].credits).toBeLessThanOrEqual(result[1].credits);
    });

    it('should use default title sort when no sort specified', async () => {
      const result = await courseController.getAllCourses({ page: 1, limit: 10 });

      // Should be sorted by title (alphabetically)
      expect(result).toHaveLength(3);
      expect(result[0]._id).toBe('COMP101'); // C comes before M
    });

    it('should handle pool parameter correctly', async () => {
      const result = await courseController.getAllCourses({ pool: 'Winter' });

      expect(result).toHaveLength(3);
      expect(result.every(course => course.offeredIn.includes('Winter'))).toBe(true);
    });

    it('should handle multiple parameters together', async () => {
      const result = await courseController.getAllCourses({
        pool: 'Fall',
        search: 'programming',
        page: 1,
        limit: 10,
        sort: 'credits'
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
      // Mock Course.find to throw an error
      const originalFind = Course.find;
      Course.find = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(courseController.getAllCourses()).rejects.toThrow('Database connection failed');

      // Restore original method
      Course.find = originalFind;
    });

    it('should handle errors in findAll and trigger handleError', async () => {
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockImplementation(() => {
        throw new Error('FindAll error');
      });

      await expect(courseController.getAllCourses({ pool: 'Test' }))
        .rejects.toThrow('FindAll error');

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
        corequisites: []
      });
    });

    it('should get course by code', async () => {
      const result = await courseController.getCourseByCode('COMP101');

      expect(result).toMatchObject({
        _id: 'COMP101',
        title: 'Introduction to Programming',
        description: 'Basic programming concepts',
        credits: 3
      });
    });

    it('should throw error for non-existent course', async () => {
      await expect(courseController.getCourseByCode('NONEXISTENT'))
        .rejects.toThrow('Course not found');
    });

    it('should handle database errors', async () => {
      // Mock Course.findById to throw an error
      const originalFindById = Course.findById;
      Course.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(courseController.getCourseByCode('COMP101'))
        .rejects.toThrow('Database connection failed');

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
          offeredIn: ['Fall', 'Winter']
        },
        {
          _id: 'COMP102',
          title: 'Data Structures',
          offeredIn: ['Winter', 'Summer']
        },
        {
          _id: 'MATH101',
          title: 'Calculus I',
          offeredIn: ['Fall', 'Winter', 'Summer']
        }
      ]);
    });

    it('should get courses by pool', async () => {
      const result = await courseController.getCoursesByPool('Fall');

      expect(result).toHaveLength(2);
      expect(result.every(course => course.offeredIn.includes('Fall'))).toBe(true);
    });

    it('should return empty array for non-existent pool', async () => {
      const result = await courseController.getCoursesByPool('NonExistent');

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Mock Course.find to throw an error
      const originalFind = Course.find;
      Course.find = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(courseController.getCoursesByPool('Fall'))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      Course.find = originalFind;
    });
  });

  describe('createRequisite', () => {
    beforeEach(async () => {
      await Course.create([
        {
          _id: 'COMP101',
          title: 'Introduction to Programming',
          prerequisites: [],
          corequisites: []
        },
        {
          _id: 'COMP102',
          title: 'Data Structures',
          prerequisites: [],
          corequisites: []
        }
      ]);
    });

    it('should create prerequisite requisite', async () => {
      const result = await courseController.createRequisite('COMP102', 'COMP101', 'pre');

      expect(result).toMatchObject({
        code1: 'COMP102',
        code2: 'COMP101',
        type: 'pre'
      });

      // Verify prerequisite was added
      const course = await Course.findById('COMP102');
      expect(course.prerequisites).toContain('COMP101');
    });

    it('should create corequisite requisite', async () => {
      const result = await courseController.createRequisite('COMP101', 'COMP102', 'co');

      expect(result).toMatchObject({
        code1: 'COMP101',
        code2: 'COMP102',
        type: 'co'
      });

      // Verify corequisite was added
      const course = await Course.findById('COMP101');
      expect(course.corequisites).toContain('COMP102');
    });

    it('should handle type pre in createRequisite field selection', async () => {
      const result = await courseController.createRequisite('COMP102', 'COMP101', 'pre');

      expect(result.type).toBe('pre');

      // Verify it used prerequisites field
      const course = await Course.findById('COMP102');
      expect(course.prerequisites).toContain('COMP101');
      expect(course.corequisites).not.toContain('COMP101');
    });

    it('should handle type co in createRequisite field selection', async () => {
      const result = await courseController.createRequisite('COMP101', 'COMP102', 'co');

      expect(result.type).toBe('co');

      // Verify it used corequisites field
      const course = await Course.findById('COMP101');
      expect(course.corequisites).toContain('COMP102');
      expect(course.prerequisites).not.toContain('COMP102');
    });

    it('should not add duplicate requisites', async () => {
      // Add prerequisite first time
      await courseController.createRequisite('COMP102', 'COMP101', 'pre');

      // Try to add same prerequisite again
      await expect(courseController.createRequisite('COMP102', 'COMP101', 'pre'))
        .rejects.toThrow('Requisite already exists or course not found');
    });

    it('should throw error when first course does not exist', async () => {
      await expect(courseController.createRequisite('NONEXISTENT', 'COMP101', 'pre'))
        .rejects.toThrow("One or both courses ('NONEXISTENT', 'COMP101') do not exist");
    });

    it('should throw error when second course does not exist', async () => {
      await expect(courseController.createRequisite('COMP101', 'NONEXISTENT', 'pre'))
        .rejects.toThrow("One or both courses ('COMP101', 'NONEXISTENT') do not exist");
    });

    it('should throw error when both courses do not exist', async () => {
      await expect(courseController.createRequisite('NONEXISTENT1', 'NONEXISTENT2', 'pre'))
        .rejects.toThrow("One or both courses ('NONEXISTENT1', 'NONEXISTENT2') do not exist");
    });

    it('should throw error when only first course exists', async () => {
      await expect(courseController.createRequisite('COMP101', 'DOESNOTEXIST', 'pre'))
        .rejects.toThrow("One or both courses ('COMP101', 'DOESNOTEXIST') do not exist");
    });

    it('should throw error when only second course exists', async () => {
      await expect(courseController.createRequisite('DOESNOTEXIST', 'COMP102', 'pre'))
        .rejects.toThrow("One or both courses ('DOESNOTEXIST', 'COMP102') do not exist");
    });

    it('should handle database errors', async () => {
      // Mock Course.exists to throw an error
      const originalExists = Course.exists;
      Course.exists = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(courseController.createRequisite('COMP101', 'COMP102', 'pre'))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      Course.exists = originalExists;
    });
  });

  describe('getRequisites', () => {
    beforeEach(async () => {
      await Course.create({
        _id: 'COMP102',
        title: 'Data Structures',
        prerequisites: ['COMP101', 'MATH101'],
        corequisites: ['COMP103']
      });
    });

    it('should get all requisites for a course', async () => {
      const result = await courseController.getRequisites('COMP102');

      expect(result).toHaveLength(3);
      
      const prerequisites = result.filter(r => r.type === 'pre');
      const corequisites = result.filter(r => r.type === 'co');

      expect(prerequisites).toHaveLength(2);
      expect(corequisites).toHaveLength(1);

      expect(prerequisites.some(r => r.code2 === 'COMP101')).toBe(true);
      expect(prerequisites.some(r => r.code2 === 'MATH101')).toBe(true);
      expect(corequisites.some(r => r.code2 === 'COMP103')).toBe(true);
    });

    it('should correctly set type to pre for prerequisites', async () => {
      const result = await courseController.getRequisites('COMP102');

      const prereqs = result.filter(r => r.type === 'pre');
      expect(prereqs.length).toBeGreaterThan(0);
      prereqs.forEach(req => {
        expect(req.type).toBe('pre');
        expect(req.code1).toBe('COMP102');
      });
    });

    it('should correctly set type to co for corequisites', async () => {
      const result = await courseController.getRequisites('COMP102');

      const coreqs = result.filter(r => r.type === 'co');
      expect(coreqs.length).toBeGreaterThan(0);
      coreqs.forEach(req => {
        expect(req.type).toBe('co');
        expect(req.code1).toBe('COMP102');
      });
    });

    it('should return empty array for course with no requisites', async () => {
      await Course.create({
        _id: 'COMP101',
        title: 'Introduction to Programming',
        prerequisites: [],
        corequisites: []
      });

      const result = await courseController.getRequisites('COMP101');

      expect(result).toHaveLength(0);
    });

    it('should handle course with only prerequisites (no corequisites)', async () => {
      await Course.create({
        _id: 'TESTCOURSE',
        title: 'Test Course',
        prerequisites: ['COMP101'],
        corequisites: []
      });

      const result = await courseController.getRequisites('TESTCOURSE');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('pre');
    });

    it('should handle course with only corequisites (no prerequisites)', async () => {
      await Course.create({
        _id: 'TESTCOURSE2',
        title: 'Test Course 2',
        prerequisites: [],
        corequisites: ['COMP101']
      });

      const result = await courseController.getRequisites('TESTCOURSE2');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('co');
    });

    it('should throw error for non-existent course', async () => {
      await expect(courseController.getRequisites('NONEXISTENT'))
        .rejects.toThrow("Course 'NONEXISTENT' does not exist");
    });

    it('should handle database errors', async () => {
      // Mock Course.findById to throw an error
      const originalFindById = Course.findById;
      Course.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(courseController.getRequisites('COMP102'))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      Course.findById = originalFindById;
    });
  });

  describe('deleteRequisite', () => {
    beforeEach(async () => {
      await Course.create({
        _id: 'COMP102',
        title: 'Data Structures',
        prerequisites: ['COMP101', 'MATH101'],
        corequisites: ['COMP103']
      });
    });

    it('should delete prerequisite', async () => {
      const result = await courseController.deleteRequisite('COMP102', 'COMP101', 'pre');

      expect(result).toBe('Requisite deleted successfully');

      // Verify prerequisite was removed
      const course = await Course.findById('COMP102');
      expect(course.prerequisites).not.toContain('COMP101');
      expect(course.prerequisites).toContain('MATH101'); // Other prerequisite should remain
    });

    it('should delete corequisite', async () => {
      const result = await courseController.deleteRequisite('COMP102', 'COMP103', 'co');

      expect(result).toBe('Requisite deleted successfully');

      // Verify corequisite was removed
      const course = await Course.findById('COMP102');
      expect(course.corequisites).not.toContain('COMP103');
    });

    it('should handle type pre in deleteRequisite field selection', async () => {
      const result = await courseController.deleteRequisite('COMP102', 'COMP101', 'pre');

      expect(result).toBe('Requisite deleted successfully');

      // Verify it removed from prerequisites field
      const course = await Course.findById('COMP102');
      expect(course.prerequisites).not.toContain('COMP101');
    });

    it('should handle type co in deleteRequisite field selection', async () => {
      const result = await courseController.deleteRequisite('COMP102', 'COMP103', 'co');

      expect(result).toBe('Requisite deleted successfully');

      // Verify it removed from corequisites field
      const course = await Course.findById('COMP102');
      expect(course.corequisites).not.toContain('COMP103');
    });

    it('should throw error when requisite does not exist', async () => {
      await expect(courseController.deleteRequisite('COMP102', 'NONEXISTENT', 'pre'))
        .rejects.toThrow('Requisite not found or already deleted');
    });

    it('should throw error when course does not exist', async () => {
      await expect(courseController.deleteRequisite('NONEXISTENT', 'COMP101', 'pre'))
        .rejects.toThrow('Requisite not found or already deleted');
    });

    it('should handle database errors', async () => {
      // Mock Course.updateOne to throw an error
      const originalUpdateOne = Course.updateOne;
      Course.updateOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(courseController.deleteRequisite('COMP102', 'COMP101', 'pre'))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      Course.updateOne = originalUpdateOne;
    });
  });

  describe('Additional Edge Cases for Coverage', () => {
    it('should handle getAllCourses when findAll returns no data', async () => {
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockResolvedValue({
        success: true,
        data: null
      });

      const result = await courseController.getAllCourses();
      expect(result).toEqual([]);

      courseController.findAll = originalFindAll;
    });

    it('should handle getCoursesByPool when findAll returns no data', async () => {
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockResolvedValue({
        success: true,
        data: null
      });

      const result = await courseController.getCoursesByPool('TestPool');
      expect(result).toEqual([]);

      courseController.findAll = originalFindAll;
    });

    it('should handle getCoursesByPool when findAll returns error', async () => {
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockResolvedValue({
        success: false,
        error: 'Test error'
      });

      await expect(courseController.getCoursesByPool('TestPool'))
        .rejects.toThrow('Test error');

      courseController.findAll = originalFindAll;
    });

    it('should handle getCourseByCode when findById returns error without message', async () => {
      const originalFindById = courseController.findById;
      courseController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: null
      });

      await expect(courseController.getCourseByCode('TEST'))
        .rejects.toThrow('Course not found');

      courseController.findById = originalFindById;
    });

    it('should handle getRequisites with course having undefined prerequisites/corequisites', async () => {
      await Course.create({
        _id: 'COMP999',
        title: 'Test Course'
      });

      const result = await courseController.getRequisites('COMP999');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
