const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { DegreeController } = require('../controllers/degreeController');
const { Degree } = require('../models/degree');

describe('DegreeController', () => {
  let mongoServer, mongoUri, degreeController;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    degreeController = new DegreeController();
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
      expect(degreeController.model).toBe(Degree);
      expect(degreeController.modelName).toBe('Degree');
    });
  });

  describe('createDegree', () => {
    it('should create a new degree if not already exists', async () => {
      const degreeData = {
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [],
      };
      const result = await degreeController.createDegree(degreeData);
      expect(result).toBe(true);
      const createdDegree = await Degree.findById('COMP').lean();
      expect(createdDegree).toMatchObject(degreeData);
    });

    it('should skip creation if degree already exists', async () => {
      const degreeData = {
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [],
      };
      await Degree.create(degreeData);
      const result = await degreeController.createDegree(degreeData);
      expect(result).toBe(false);
      const createdDegree = await Degree.findById('COMP').lean();
      const degreeCount = await Degree.countDocuments({ _id: 'COMP' });
      expect(degreeCount).toBe(1);
      expect(createdDegree).toMatchObject(degreeData);
    });

    it('should handle errors during degree creation', async () => {
      // Mock the create method to throw an error
      const originalCreate = degreeController.model.create;
      degreeController.model.create = jest
        .fn()
        .mockRejectedValue(new Error('Database error during creation'));

      const degreeData = {
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [],
      };
      await expect(degreeController.createDegree(degreeData)).rejects.toThrow(
        'Database error during creation',
      );
      // Restore original method
      degreeController.model.create = originalCreate;
    });
  });

  describe('updateDegree', () => {
    it('should update an existing degree', async () => {
      const testDegree = await Degree.create({
        _id: 'COMP7',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [],
      });

      const degreeData = {
        name: 'Computer Science 1234',
        totalCredits: 123,
        coursePools: ['POOL1', 'POOL2'],
      };
      const result = await degreeController.updateDegree(
        testDegree._id,
        degreeData,
      );
      expect(result).toMatchObject(degreeData);
    });

    it('should handle errors during degree update', async () => {
      // Mock the update method to throw an error
      const originalUpdate = degreeController.updateById;
      degreeController.updateById = jest
        .fn()
        .mockRejectedValue(new Error('Database error during update'));

      const testDegree = await Degree.create({
        _id: 'MATH',
        name: 'Mathematics',
        totalCredits: 30,
        coursePools: [],
      });

      const degreeData = {
        _id: 'MATH',
        name: 'Mathematics 1234',
        totalCredits: 33,
        coursePools: ['POOL1', 'POOL2'],
      };
      await expect(
        degreeController.updateDegree(testDegree._id, degreeData),
      ).rejects.toThrow('Database error during update');
      // Restore original method
      degreeController.updateById = originalUpdate;
    });
  });

  describe('readDegree', () => {
    let testDegree;

    beforeEach(async () => {
      testDegree = await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [
          {
            _id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102'],
          },
        ],
      });
    });

    it('should get degree by ID', async () => {
      const result = await degreeController.readDegree('COMP');

      expect(result).toMatchObject({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
      });
    });

    it('should throw error for non-existent degree', async () => {
      await expect(degreeController.readDegree('NONEXISTENT')).rejects.toThrow(
        'Degree with this id does not exist',
      );
    });

    it('should handle database errors', async () => {
      // Mock controller's findById to throw error
      const originalFindById = degreeController.findById;
      degreeController.findById = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(degreeController.readDegree('COMP')).rejects.toThrow(
        'Database connection failed',
      );

      // Restore original method
      degreeController.findById = originalFindById;
    });
  });

  describe('readAllDegrees', () => {
    beforeEach(async () => {
      await Degree.create([
        {
          _id: 'COMP',
          name: 'Computer Science',
          totalCredits: 120,
        },
        {
          _id: 'SOEN',
          name: 'Software Engineering',
          totalCredits: 120,
        },
        {
          _id: 'ECP',
          name: 'Engineering Common Program',
          totalCredits: 30,
        },
      ]);
    });

    it('should get all degrees excluding ECP', async () => {
      const result = await degreeController.readAllDegrees();

      expect(result).toHaveLength(2);
      expect(result.find((d) => d._id === 'COMP')).toBeDefined();
      expect(result.find((d) => d._id === 'SOEN')).toBeDefined();
      expect(result.find((d) => d._id === 'ECP')).toBeUndefined();
    });

    it('should return degrees sorted by name', async () => {
      const result = await degreeController.readAllDegrees();

      expect(result[0].name).toBe('Computer Science');
      expect(result[1].name).toBe('Software Engineering');
    });

    it('should return empty array when no degrees exist', async () => {
      await Degree.deleteMany({});
      const result = await degreeController.readAllDegrees();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Mock controller's findAll to throw error
      const originalFindAll = degreeController.findAll;
      degreeController.findAll = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(degreeController.readAllDegrees()).rejects.toThrow(
        'Database connection failed',
      );

      // Restore original method
      degreeController.findAll = originalFindAll;
    });
  });

  describe('getCreditsForDegree', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
      });
    });

    it('should get credits for degree', async () => {
      const result = await degreeController.getCreditsForDegree('COMP');

      expect(result).toBe(120);
    });

    it('should throw error for non-existent degree', async () => {
      await expect(
        degreeController.getCreditsForDegree('NONEXISTENT'),
      ).rejects.toThrow('Degree with this id does not exist');
    });

    it('should handle database errors', async () => {
      // Mock controller's findById to throw error
      const originalFindById = degreeController.findById;
      degreeController.findById = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        degreeController.getCreditsForDegree('COMP'),
      ).rejects.toThrow('Database connection failed');

      // Restore original method
      degreeController.findById = originalFindById;
    });
  });

  describe('getCoursePoolsForDegree', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: ['COMP_CORE', 'COMP_ELECTIVES'],
      });
    });

    it('should get course pools for degree', async () => {
      await Degree.create({
        _id: 'COMP123',
        name: 'Computer Science123',
        totalCredits: 120,
        coursePools: ['COMP_CORE', 'COMP_ELECTIVES'],
      });

      const result = await degreeController.getCoursePoolsForDegree('COMP123');

      expect(result).toEqual(['COMP_CORE', 'COMP_ELECTIVES']);
    });

    it('should throw error for non-existent degree', async () => {
      await expect(
        degreeController.getCoursePoolsForDegree('NONEXISTENT'),
      ).rejects.toThrow('Degree with this id does not exist');
    });

    it('should handle database errors', async () => {
      // Mock controller's findById to throw error
      const originalFindById = degreeController.findById;
      degreeController.findById = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        degreeController.getCreditsForDegree('COMP'),
      ).rejects.toThrow('Database connection failed');

      // Restore original method
      degreeController.findById = originalFindById;
    });
  });

  describe('Additional Edge Cases for Coverage', () => {
    it('should handle readDegree when findById returns error without message', async () => {
      const originalFindById = degreeController.findById;
      degreeController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      await expect(degreeController.readDegree('TEST')).rejects.toThrow(
        'Degree with this id does not exist',
      );

      degreeController.findById = originalFindById;
    });

    it('should handle readAllDegrees when findAll returns error without message', async () => {
      const originalFindAll = degreeController.findAll;
      degreeController.findAll = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      await expect(degreeController.readAllDegrees()).rejects.toThrow(
        'Failed to fetch degrees',
      );

      degreeController.findAll = originalFindAll;
    });

    it('should handle readAllDegrees when findAll returns null data', async () => {
      const originalFindAll = degreeController.findAll;
      degreeController.findAll = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await degreeController.readAllDegrees();
      expect(result).toEqual([]);

      degreeController.findAll = originalFindAll;
    });

    it('should handle getCreditsForDegree when findById returns error without message', async () => {
      const originalFindById = degreeController.findById;
      degreeController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      await expect(
        degreeController.getCreditsForDegree('TEST'),
      ).rejects.toThrow('Degree with this id does not exist');

      degreeController.findById = originalFindById;
    });
  });
});
