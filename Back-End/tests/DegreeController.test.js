const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  DegreeController,
} = require('../controllers/mondoDBControllers/DegreeController');
const { Degree } = require('../models/Degree');

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

  describe('readDegree', () => {
    let testDegree;

    beforeEach(async () => {
      testDegree = await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [
          {
            id: 'COMP_CORE',
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
        id: 'COMP',
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
      degreeController.findById = jest.fn().mockRejectedValue(
        new Error('Database connection failed'),
      );

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
      expect(result.find((d) => d.id === 'COMP')).toBeDefined();
      expect(result.find((d) => d.id === 'SOEN')).toBeDefined();
      expect(result.find((d) => d.id === 'ECP')).toBeUndefined();
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
      degreeController.findAll = jest.fn().mockRejectedValue(
        new Error('Database connection failed'),
      );

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
      degreeController.findById = jest.fn().mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        degreeController.getCreditsForDegree('COMP'),
      ).rejects.toThrow('Database connection failed');

      // Restore original method
      degreeController.findById = originalFindById;
    });
  });

  describe('getAllCoursePools', () => {
    beforeEach(async () => {
      await Degree.create([
        {
          _id: 'COMP',
          name: 'Computer Science',
          totalCredits: 120,
          coursePools: [
            {
              id: 'COMP_CORE',
              name: 'Computer Science Core',
              creditsRequired: 60,
              courses: ['COMP101', 'COMP102'],
            },
            {
              id: 'MATH_REQ',
              name: 'Mathematics Requirements',
              creditsRequired: 12,
              courses: ['MATH101', 'MATH102'],
            },
          ],
        },
        {
          _id: 'SOEN',
          name: 'Software Engineering',
          totalCredits: 120,
          coursePools: [
            {
              id: 'SOEN_CORE',
              name: 'Software Engineering Core',
              creditsRequired: 50,
              courses: ['SOEN101', 'SOEN102'],
            },
            {
              id: 'MATH_REQ',
              name: 'Mathematics Requirements',
              creditsRequired: 12,
              courses: ['MATH101', 'MATH102'],
            },
          ],
        },
      ]);
    });

    it('should get all course pools aggregated and deduplicated', async () => {
      const result = await degreeController.getAllCoursePools();

      expect(result).toHaveLength(3); // COMP_CORE, MATH_REQ, SOEN_CORE
      expect(result.find((cp) => cp.id === 'COMP_CORE')).toBeDefined();
      expect(result.find((cp) => cp.id === 'SOEN_CORE')).toBeDefined();
      expect(result.find((cp) => cp.id === 'MATH_REQ')).toBeDefined();
    });

    it('should return course pools sorted by name', async () => {
      const result = await degreeController.getAllCoursePools();

      expect(result[0].name).toBe('Computer Science Core');
      expect(result[1].name).toBe('Mathematics Requirements');
      expect(result[2].name).toBe('Software Engineering Core');
    });

    it('should return empty array when no course pools exist', async () => {
      await Degree.deleteMany({});
      const result = await degreeController.getAllCoursePools();

      expect(result).toHaveLength(0);
    });

    it('should handle aggregation errors gracefully', async () => {
      // Mock controller's aggregate to return error
      const originalAggregate = degreeController.aggregate;
      degreeController.aggregate = jest.fn().mockRejectedValue(
        new Error('Aggregation failed'),
      );

      const result = await degreeController.getAllCoursePools();

      expect(result).toHaveLength(0);

      // Restore original method
      degreeController.aggregate = originalAggregate;
    });
  });

  describe('getCoursePool', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102'],
          },
        ],
      });
    });

    it('should get specific course pool by ID', async () => {
      const result = await degreeController.getCoursePool('COMP_CORE');

      expect(result).toMatchObject({
        id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
        courses: ['COMP101', 'COMP102'],
      });
    });

    it('should return undefined for non-existent course pool', async () => {
      const result = await degreeController.getCoursePool('NONEXISTENT');

      expect(result).toBeUndefined();
    });

    it('should handle aggregation errors gracefully', async () => {
      // Mock controller's aggregate to return error
      const originalAggregate = degreeController.aggregate;
      degreeController.aggregate = jest.fn().mockRejectedValue(
        new Error('Aggregation failed'),
      );

      const result = await degreeController.getCoursePool('COMP_CORE');

      expect(result).toBeUndefined();

      // Restore original method
      degreeController.aggregate = originalAggregate;
    });
  });

  describe('getCoursePoolsByDegree', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102'],
          },
          {
            id: 'MATH_REQ',
            name: 'Mathematics Requirements',
            creditsRequired: 12,
            courses: ['MATH101', 'MATH102'],
          },
        ],
      });
    });

    it('should get all course pools for specific degree', async () => {
      const result = await degreeController.getCoursePoolsByDegree('COMP');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
        courses: ['COMP101', 'COMP102'],
      });
      expect(result[1]).toMatchObject({
        id: 'MATH_REQ',
        name: 'Mathematics Requirements',
        creditsRequired: 12,
        courses: ['MATH101', 'MATH102'],
      });
    });

    it('should return empty array for non-existent degree', async () => {
      const result =
        await degreeController.getCoursePoolsByDegree('NONEXISTENT');

      expect(result).toHaveLength(0);
    });

    it('should return empty array for degree with no course pools', async () => {
      await Degree.create({
        _id: 'EMPTY',
        name: 'Empty Degree',
        totalCredits: 120,
        coursePools: [],
      });

      const result = await degreeController.getCoursePoolsByDegree('EMPTY');

      expect(result).toHaveLength(0);
    });

    it('should handle course pools with undefined courses', async () => {
      await Degree.create({
        _id: 'NOCOURSES',
        name: 'No Courses Degree',
        totalCredits: 120,
        coursePools: [
          {
            id: 'NOCOURSES_POOL',
            name: 'No Courses Pool',
            creditsRequired: 30,
            // courses field is undefined
          },
        ],
      });

      const result = await degreeController.getCoursePoolsByDegree('NOCOURSES');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'NOCOURSES_POOL',
        name: 'No Courses Pool',
        creditsRequired: 30,
        courses: [],
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock Degree.findById to throw an error in the exec() call
      const originalFindById = Degree.findById;
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(
          new Error('Database connection failed'),
        ),
      };
      Degree.findById = jest.fn().mockReturnValue(mockQuery);

      const result = await degreeController.getCoursePoolsByDegree('COMP');

      expect(result).toHaveLength(0);

      // Restore original method
      Degree.findById = originalFindById;
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

    it('should handle getAllCoursePools when aggregate returns no data', async () => {
      const originalAggregate = degreeController.aggregate;
      degreeController.aggregate = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await degreeController.getAllCoursePools();
      expect(result).toEqual([]);

      degreeController.aggregate = originalAggregate;
    });

    it('should handle getCoursePool when aggregate returns array with no data', async () => {
      const originalAggregate = degreeController.aggregate;
      degreeController.aggregate = jest.fn().mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await degreeController.getCoursePool('TEST');
      expect(result).toBeUndefined();

      degreeController.aggregate = originalAggregate;
    });

    it('should handle getCoursePoolsByDegree when degree has null coursePools', async () => {
      await Degree.create({
        _id: 'NULLPOOLS',
        name: 'Null Pools Degree',
        totalCredits: 120,
        coursePools: null,
      });

      const result = await degreeController.getCoursePoolsByDegree('NULLPOOLS');
      expect(result).toEqual([]);
    });
  });
});
