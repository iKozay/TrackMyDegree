// tests/controller/degreeController_mongo.test.js

jest.setTimeout(20000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Require compiled controller and Degree model from dist (support default and named exports)
const degreeControllerModule = require('../../dist/controllers/degreeController/degreeController_mongo');
const degreeController = degreeControllerModule && degreeControllerModule.default ? degreeControllerModule.default : degreeControllerModule;

const DegreeModule = require('../../dist/models/Degree');
const Degree = DegreeModule && DegreeModule.Degree ? DegreeModule.Degree : (DegreeModule.default ? DegreeModule.default : DegreeModule);

describe('degreeControllerMongo (integration with in-memory MongoDB)', () => {
  let mongoServer;
  let mongoUri;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    // Connect mongoose to the in-memory server
    await mongoose.connect(mongoUri, {
      // options are fine for older mongoose versions; newer ignore extras
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear degrees between tests
    await Degree.deleteMany({});
  });

  // == CREATE DEGREE =========================================================
  describe('createDegree', () => {
    it('should create and return a degree if id and name are unique', async () => {
      const result = await degreeController.createDegree('CS', 'Computer Science', 120);

      expect(result).toHaveProperty('id');
      expect(result.id).toBe('CS');
      expect(result.name).toBe('Computer Science');
      expect(result.totalCredits).toBe(120);

      // verify it actually exists in DB
      const dbDegree = await Degree.findOne({ id: 'CS' }).lean();
      expect(dbDegree).toBeTruthy();
      expect(dbDegree.name).toBe('Computer Science');
    });

    it('should throw an error if degree with same id or name already exists', async () => {
      // seed degree
      await new Degree({ id: 'CS', name: 'Computer Science', totalCredits: 120 }).save();

      await expect(
        degreeController.createDegree('CS', 'Computer Science', 120)
      ).rejects.toThrow('Degree with this id or name already exists.');
    });
  });

  // == READ DEGREE ===========================================================
  describe('readDegree', () => {
    it('should return a degree if found', async () => {
      await new Degree({ id: 'CS', name: 'Computer Science', totalCredits: 120 }).save();

      const result = await degreeController.readDegree('CS');
      expect(result).toBeTruthy();
      expect(result.id).toBe('CS');
      expect(result.name).toBe('Computer Science');
      expect(result.totalCredits).toBe(120);
    });

    it('should throw an error if degree is not found', async () => {
      await expect(degreeController.readDegree('NOT_FOUND')).rejects.toThrow('Degree with this id does not exist.');
    });
  });

  // == READ ALL DEGREES ======================================================
  describe('readAllDegrees', () => {
    it('should return a list of all degrees except ECP', async () => {
      await Degree.insertMany([
        { id: 'CS', name: 'Computer Science', totalCredits: 120 },
        { id: 'SE', name: 'Software Engineering', totalCredits: 120 },
        { id: 'ECP', name: 'ECP Degree', totalCredits: 30 }
      ]);

      const result = await degreeController.readAllDegrees();
      expect(Array.isArray(result)).toBe(true);

      // should not include ECP
      const ids = result.map(d => d.id);
      expect(ids).toContain('CS');
      expect(ids).toContain('SE');
      expect(ids).not.toContain('ECP');
    });
  });

  // == UPDATE DEGREE =========================================================
  describe('updateDegree', () => {
    it('should update and return the degree', async () => {
      await new Degree({ id: 'CS', name: 'Computer Science', totalCredits: 120 }).save();

      const result = await degreeController.updateDegree('CS', 'Computer Science V2', 130);
      expect(result).toBeTruthy();
      expect(result.name).toBe('Computer Science V2');
      expect(result.totalCredits).toBe(130);

      const dbDegree = await Degree.findOne({ id: 'CS' }).lean();
      expect(dbDegree.name).toBe('Computer Science V2');
      expect(dbDegree.totalCredits).toBe(130);
    });

    it('should throw an error if degree to update is not found', async () => {
      await expect(degreeController.updateDegree('NOT_FOUND', 'N/A', 100)).rejects.toThrow('Degree with this id does not exist.');
    });
  });

  // == DELETE DEGREE =========================================================
  describe('deleteDegree', () => {
    it('should delete a degree and return a success message', async () => {
      await new Degree({ id: 'CS', name: 'Computer Science', totalCredits: 120 }).save();

      const result = await degreeController.deleteDegree('CS');
      expect(result).toBe('Degree with id CS has been successfully deleted.');

      const dbDegree = await Degree.findOne({ id: 'CS' }).lean();
      expect(dbDegree).toBeNull();
    });

    it('should throw an error if degree to delete is not found', async () => {
      await expect(degreeController.deleteDegree('NOT_FOUND')).rejects.toThrow('Degree with this id does not exist.');
    });
  });

  // == GET CREDITS FOR DEGREE ===============================================
  describe('getCreditsForDegree', () => {
    it('should return the total credits for a given degree ID', async () => {
      await new Degree({ id: 'CS', name: 'Computer Science', totalCredits: 120 }).save();

      const result = await degreeController.getCreditsForDegree('CS');
      expect(result).toBe(120);
    });

    it('should throw an error if the degree is not found', async () => {
      await expect(degreeController.getCreditsForDegree('NOT_FOUND')).rejects.toThrow('Degree with this id does not exist.');
    });
  });
});
