const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const coursepoolController =
  require('../dist/controllers/coursepoolController/coursepoolController_mongo').default;
const { Degree } = require('../dist/models/Degree');
const DB_OPS = require('../dist/Util/DB_Ops').default;

describe('CoursepoolController', () => {
  let mongoServer, testDegree1, testDegree2;

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
    // Clean up database before each test
    await Degree.deleteMany({});

    // Create test degrees with course pools
    testDegree1 = new Degree({
      name: 'Computer Science',
      totalCredits: 120,
      isAddon: false,
      coursePools: [
        {
          id: 'pool-1',
          name: 'Core Courses',
          creditsRequired: 60,
          courses: ['CS101', 'CS102'],
        },
        {
          id: 'pool-2',
          name: 'Electives',
          creditsRequired: 30,
          courses: ['CS201'],
        },
      ],
    });

    testDegree2 = new Degree({
      name: 'Software Engineering',
      totalCredits: 120,
      isAddon: false,
      coursePools: [
        {
          id: 'pool-1',
          name: 'Core Courses',
          creditsRequired: 60,
          courses: ['SOEN341'],
        },
        {
          id: 'pool-3',
          name: 'Mathematics',
          creditsRequired: 15,
          courses: ['MATH203'],
        },
      ],
    });

    testDegree1 = await testDegree1.save();
    testDegree2 = await testDegree2.save();
  });

  describe('createCoursePool', () => {
    it('should successfully create a new course pool', async () => {
      const result = await coursepoolController.createCoursePool('New Pool');

      expect(result).toBe(DB_OPS.SUCCESS);
    });

    it('should return success even with empty name', async () => {
      const result = await coursepoolController.createCoursePool('');

      expect(result).toBe(DB_OPS.SUCCESS);
    });
  });

  describe('getAllCoursePools', () => {
    it('should return all unique course pools from all degrees', async () => {
      const result = await coursepoolController.getAllCoursePools();

      expect(result).toHaveProperty('course_pools');
      expect(result.course_pools).toHaveLength(3); // pool-1, pool-2, pool-3

      const poolIds = result.course_pools.map((p) => p.id);
      expect(poolIds).toContain('pool-1');
      expect(poolIds).toContain('pool-2');
      expect(poolIds).toContain('pool-3');
    });

    it('should deduplicate course pools with same ID across degrees', async () => {
      const result = await coursepoolController.getAllCoursePools();

      expect(result).toHaveProperty('course_pools');

      // pool-1 exists in both degrees but should appear only once
      const pool1Occurrences = result.course_pools.filter(
        (p) => p.id === 'pool-1',
      );
      expect(pool1Occurrences).toHaveLength(1);
      expect(pool1Occurrences[0].name).toBe('Core Courses');
    });

    it('should return empty array when no degrees exist', async () => {
      await Degree.deleteMany({});

      const result = await coursepoolController.getAllCoursePools();

      expect(result).toHaveProperty('course_pools');
      expect(result.course_pools).toHaveLength(0);
    });

    it('should return empty array when degrees have no course pools', async () => {
      await Degree.deleteMany({});

      const emptyDegree = new Degree({
        _id: '507f1f77bcf86cd799439011',
        name: 'Empty Degree',
        totalCredits: 0,
        isAddon: false,
        coursePools: [],
      });
      await emptyDegree.save();

      const result = await coursepoolController.getAllCoursePools();

      expect(result).toHaveProperty('course_pools');
      expect(result.course_pools).toHaveLength(0);
    });
  });

  describe('getCoursePool', () => {
    it('should successfully retrieve a course pool by ID', async () => {
      const result = await coursepoolController.getCoursePool('pool-2');

      expect(result).toBeDefined();
      expect(result.id).toBe('pool-2');
      expect(result.name).toBe('Electives');
    });

    it('should retrieve course pool that exists in multiple degrees', async () => {
      const result = await coursepoolController.getCoursePool('pool-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('pool-1');
      expect(result.name).toBe('Core Courses');
    });

    it('should return undefined when course pool does not exist', async () => {
      const result =
        await coursepoolController.getCoursePool('non-existent-pool');

      expect(result).toBeUndefined();
    });

    it('should return undefined when no degrees exist', async () => {
      await Degree.deleteMany({});

      const result = await coursepoolController.getCoursePool('pool-1');

      expect(result).toBeUndefined();
    });
  });

  describe('updateCoursePool', () => {
    it('should successfully update course pool name in a single degree', async () => {
      const updateInfo = {
        id: 'pool-2',
        name: 'Updated Electives',
      };

      const result = await coursepoolController.updateCoursePool(updateInfo);

      expect(result).toBe(DB_OPS.SUCCESS);

      // Verify the update
      const degree = await Degree.findById(testDegree1._id.toString());
      const pool = degree.coursePools.find((cp) => cp.id === 'pool-2');
      expect(pool.name).toBe('Updated Electives');
    });

    it('should update course pool name in all degrees that contain it', async () => {
      const updateInfo = {
        id: 'pool-1',
        name: 'Updated Core Courses',
      };

      const result = await coursepoolController.updateCoursePool(updateInfo);

      expect(result).toBe(DB_OPS.SUCCESS);

      // Verify the update in both degrees
      const degree1 = await Degree.findById(testDegree1._id.toString());
      const pool1 = degree1.coursePools.find((cp) => cp.id === 'pool-1');
      expect(pool1.name).toBe('Updated Core Courses');

      const degree2 = await Degree.findById(testDegree2._id.toString());
      const pool2 = degree2.coursePools.find((cp) => cp.id === 'pool-1');
      expect(pool2.name).toBe('Updated Core Courses');
    });

    it('should return MOSTLY_OK when course pool does not exist', async () => {
      const updateInfo = {
        id: 'non-existent-pool',
        name: 'Updated Name',
      };

      const result = await coursepoolController.updateCoursePool(updateInfo);

      expect(result).toBe(DB_OPS.MOSTLY_OK);
    });

    it('should return FAILURE when updating with empty name', async () => {
      const updateInfo = {
        id: 'pool-2',
        name: '',
      };

      const result = await coursepoolController.updateCoursePool(updateInfo);

      expect(result).toBe(DB_OPS.FAILURE);

      // Verify the name wasn't changed
      const degree = await Degree.findById(testDegree1._id.toString());
      const pool = degree.coursePools.find((cp) => cp.id === 'pool-2');
      expect(pool.name).toBe('Electives'); // Still the original name
    });
  });

  describe('removeCoursePool', () => {
    it('should successfully remove course pool from a single degree', async () => {
      const result = await coursepoolController.removeCoursePool('pool-2');

      expect(result).toBe(DB_OPS.SUCCESS);

      // Verify removal
      const degree = await Degree.findById(testDegree1._id.toString());
      const pool = degree.coursePools.find((cp) => cp.id === 'pool-2');
      expect(pool).toBeUndefined();
      expect(degree.coursePools).toHaveLength(1);
    });

    it('should remove course pool from all degrees that contain it', async () => {
      const result = await coursepoolController.removeCoursePool('pool-1');

      expect(result).toBe(DB_OPS.SUCCESS);

      // Verify removal from both degrees
      const degree1 = await Degree.findById(testDegree1._id.toString());
      const pool1 = degree1.coursePools.find((cp) => cp.id === 'pool-1');
      expect(pool1).toBeUndefined();
      expect(degree1.coursePools).toHaveLength(1);

      const degree2 = await Degree.findById(testDegree2._id.toString());
      const pool2 = degree2.coursePools.find((cp) => cp.id === 'pool-1');
      expect(pool2).toBeUndefined();
      expect(degree2.coursePools).toHaveLength(1);
    });

    it('should return MOSTLY_OK when course pool does not exist', async () => {
      const result =
        await coursepoolController.removeCoursePool('non-existent-pool');

      expect(result).toBe(DB_OPS.MOSTLY_OK);
    });

    it('should return MOSTLY_OK when no degrees exist', async () => {
      await Degree.deleteMany({});

      const result = await coursepoolController.removeCoursePool('pool-1');

      expect(result).toBe(DB_OPS.MOSTLY_OK);
    });

    it('should not affect other course pools when removing one', async () => {
      const result = await coursepoolController.removeCoursePool('pool-2');

      expect(result).toBe(DB_OPS.SUCCESS);

      // Verify pool-1 still exists
      const degree = await Degree.findById(testDegree1._id.toString());
      const pool1 = degree.coursePools.find((cp) => cp.id === 'pool-1');
      expect(pool1).toBeDefined();
      expect(pool1.name).toBe('Core Courses');
    });
  });
});
