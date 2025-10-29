const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const DegreeXCPController =
  require('../dist/controllers/DegreeXCPController/DegreeXCPController_mongo').default;
const { Degree } = require('../dist/models/Degree');
const DB_OPS = require('../dist/Util/DB_Ops').default;

describe('DegreeXCPController', () => {
  let mongoServer;
  let testDegreeId;
  let testDegreeId2;

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

    // Create test degrees
    const testDegree1 = new Degree({
      _id: 'test-degree-1',
      name: 'Test Degree 1',
      totalCredits: 120,
      isAddon: false,
      coursePools: [],
    });

    const testDegree2 = new Degree({
      _id: 'test-degree-2',
      name: 'Test Degree 2',
      totalCredits: 90,
      isAddon: false,
      coursePools: [
        {
          id: 'existing-coursepool',
          name: 'Existing Pool',
          creditsRequired: 15,
          courses: [],
        },
      ],
    });

    await testDegree1.save();
    await testDegree2.save();

    testDegreeId = 'test-degree-1';
    testDegreeId2 = 'test-degree-2';
  });

  describe('createDegreeXCP', () => {
    it('should successfully create a new DegreeXCP record', async () => {
      const newRecord = {
        degree_id: testDegreeId,
        coursepool_id: 'new-coursepool-1',
        credits: 12,
      };

      const result = await DegreeXCPController.createDegreeXCP(newRecord);

      expect(result).toBe(DB_OPS.SUCCESS);

      // Verify the course pool was added
      const degree = await Degree.findById(testDegreeId);
      expect(degree.coursePools).toHaveLength(1);
      expect(degree.coursePools[0].id).toBe('new-coursepool-1');
      expect(degree.coursePools[0].creditsRequired).toBe(12);
    });

    it('should fail when degree does not exist', async () => {
      const newRecord = {
        degree_id: 'non-existent-degree',
        coursepool_id: 'new-coursepool-1',
        credits: 12,
      };

      const result = await DegreeXCPController.createDegreeXCP(newRecord);

      expect(result).toBe(DB_OPS.FAILURE);
    });

    it('should fail when course pool already exists in the degree', async () => {
      const newRecord = {
        degree_id: testDegreeId2,
        coursepool_id: 'existing-coursepool',
        credits: 12,
      };

      const result = await DegreeXCPController.createDegreeXCP(newRecord);

      expect(result).toBe(DB_OPS.FAILURE);
    });
  });

  describe('getAllDegreeXCP', () => {
    it('should return all course pools for a valid degree', async () => {
      const result = await DegreeXCPController.getAllDegreeXCP(testDegreeId2);

      expect(result).toHaveProperty('course_pools');
      expect(result.course_pools).toHaveLength(1);
      expect(result.course_pools[0].id).toBe('existing-coursepool');
      expect(result.course_pools[0].name).toBe('Existing Pool');
      expect(result.course_pools[0].creditsRequired).toBe(15);
    });

    it('should return empty array when degree does not exist', async () => {
      const result = await DegreeXCPController.getAllDegreeXCP(
        'non-existent-degree',
      );

      expect(result).toHaveProperty('course_pools');
      expect(result.course_pools).toHaveLength(0);
    });

    it('should return empty array when degree has no course pools', async () => {
      const result = await DegreeXCPController.getAllDegreeXCP(testDegreeId);

      expect(result).toHaveProperty('course_pools');
      expect(result.course_pools).toHaveLength(0);
    });
  });

  describe('updateDegreeXCP', () => {
    beforeEach(async () => {
      // Add a course pool to test degree 1 for update tests
      const degree = await Degree.findById(testDegreeId);
      degree.coursePools.push({
        id: 'update-test-pool',
        name: 'Update Test Pool',
        creditsRequired: 10,
        courses: [],
      });
      await degree.save();
    });

    it('should successfully update credits when course pool is in the same degree', async () => {
      const updateRecord = {
        id: 'update-record-id',
        degree_id: testDegreeId,
        coursepool_id: 'update-test-pool',
        credits: 20,
      };

      const result = await DegreeXCPController.updateDegreeXCP(updateRecord);

      expect(result).toBe(DB_OPS.SUCCESS);

      // Verify the credits were updated
      const degree = await Degree.findById(testDegreeId);
      const coursePool = degree.coursePools.find(
        (cp) => cp.id === 'update-test-pool',
      );
      expect(coursePool.creditsRequired).toBe(20);
    });

    it('should successfully move course pool to different degree', async () => {
      const updateRecord = {
        id: 'update-record-id',
        degree_id: testDegreeId2,
        coursepool_id: 'update-test-pool',
        credits: 25,
      };

      const result = await DegreeXCPController.updateDegreeXCP(updateRecord);

      expect(result).toBe(DB_OPS.SUCCESS);

      // Verify course pool was removed from original degree
      const originalDegree = await Degree.findById(testDegreeId);
      const originalPool = originalDegree.coursePools.find(
        (cp) => cp.id === 'update-test-pool',
      );
      expect(originalPool).toBeUndefined();

      // Verify course pool was added to target degree
      const targetDegree = await Degree.findById(testDegreeId2);
      const targetPool = targetDegree.coursePools.find(
        (cp) => cp.id === 'update-test-pool',
      );
      expect(targetPool).toBeDefined();
      expect(targetPool.creditsRequired).toBe(25);
    });

    it('should fail when course pool does not exist', async () => {
      const updateRecord = {
        id: 'update-record-id',
        degree_id: testDegreeId,
        coursepool_id: 'non-existent-pool',
        credits: 15,
      };

      const result = await DegreeXCPController.updateDegreeXCP(updateRecord);

      expect(result).toBe(DB_OPS.FAILURE);
    });

    it('should fail when target degree does not exist', async () => {
      const updateRecord = {
        id: 'update-record-id',
        degree_id: 'non-existent-degree',
        coursepool_id: 'update-test-pool',
        credits: 15,
      };

      const result = await DegreeXCPController.updateDegreeXCP(updateRecord);

      expect(result).toBe(DB_OPS.FAILURE);
    });
  });

  describe('removeDegreeXCP', () => {
    it('should successfully remove a course pool from a degree', async () => {
      const deleteRecord = {
        degree_id: testDegreeId2,
        coursepool_id: 'existing-coursepool',
      };

      const result = await DegreeXCPController.removeDegreeXCP(deleteRecord);

      expect(result).toBe(DB_OPS.SUCCESS);

      // Verify the course pool was removed
      const degree = await Degree.findById(testDegreeId2);
      const coursePool = degree.coursePools.find(
        (cp) => cp.id === 'existing-coursepool',
      );
      expect(coursePool).toBeUndefined();
      expect(degree.coursePools).toHaveLength(0);
    });

    it('should fail when degree does not exist', async () => {
      const deleteRecord = {
        degree_id: 'non-existent-degree',
        coursepool_id: 'existing-coursepool',
      };

      const result = await DegreeXCPController.removeDegreeXCP(deleteRecord);

      expect(result).toBe(DB_OPS.FAILURE);
    });

    it('should fail when course pool does not exist in the degree', async () => {
      const deleteRecord = {
        degree_id: testDegreeId2,
        coursepool_id: 'non-existent-pool',
      };

      const result = await DegreeXCPController.removeDegreeXCP(deleteRecord);

      expect(result).toBe(DB_OPS.FAILURE);
    });

    it('should fail when course pool exists but not in the specified degree', async () => {
      const deleteRecord = {
        degree_id: testDegreeId, // Empty degree
        coursepool_id: 'existing-coursepool', // Exists in testDegreeId2
      };

      const result = await DegreeXCPController.removeDegreeXCP(deleteRecord);

      expect(result).toBe(DB_OPS.FAILURE);
    });
  });
});
