// tests/controller/degreeController_mongo.test.ts

// Increase timeout for mongodb-memory-server or slow CI environments (optional)
jest.setTimeout(20000);

// Auto-mock the compiled model module (we will override methods below)
jest.mock('../../dist/models/degreeModel');

// Mock Sentry to avoid noisy logs
jest.mock('@sentry/node', () => ({
  captureException: jest.fn()
}));

const { captureException } = require('@sentry/node');

// Require the compiled controller and model from dist
const degreeControllerMongo = require('../../dist/controllers/degreeController/degreeController_mongo').default;
const DegreeModelModule = require('../../dist/models/degreeModel');
// Support both module.exports = model and export default
const DegreeModel = DegreeModelModule && DegreeModelModule.default ? DegreeModelModule.default : DegreeModelModule;

describe('degreeControllerMongo', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  // Reusable mock degree object
  const mockDegree = {
    id: 'CS',
    name: 'Computer Science',
    totalCredits: 120,
    toObject: () => ({ id: 'CS', name: 'Computer Science', totalCredits: 120 })
  };

  // == CREATE DEGREE =========================================================
  describe('createDegree', () => {
    it('should create and return a degree if id and name are unique', async () => {
      // mock static findOne => no existing degree
      DegreeModel.findOne = jest.fn().mockResolvedValue(null);

      // mock constructor behavior: new DegreeModel().save() and toObject
      const saveMock = jest.fn().mockResolvedValue(mockDegree);

      // If DegreeModel is a mock constructor, mock its implementation
      if (DegreeModel.mock && DegreeModel.mockImplementation) {
        DegreeModel.mockImplementation(() => ({
          save: saveMock,
          toObject: mockDegree.toObject
        }));
      } else {
        // Otherwise just ensure calls to new DegreeModel() will produce an object with save
        DegreeModel.mockImplementation = jest.fn().mockImplementation(() => ({
          save: saveMock,
          toObject: mockDegree.toObject
        }));
      }

      const result = await degreeControllerMongo.createDegree('CS', 'Computer Science', 120);

      expect(DegreeModel.findOne).toHaveBeenCalledWith({ $or: [{ id: 'CS' }, { name: 'Computer Science' }] });
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(mockDegree.toObject());

    });

    it('should throw an error if degree with same id or name already exists', async () => {
      DegreeModel.findOne = jest.fn().mockResolvedValue(mockDegree);

      await expect(
        degreeControllerMongo.createDegree('CS', 'Computer Science', 120)
      ).rejects.toThrow('Degree with this id or name already exists.');

      expect(captureException).toHaveBeenCalled();
    });
  });

  // == READ DEGREE ===========================================================
  describe('readDegree', () => {
    it('should return a degree if found', async () => {
      DegreeModel.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDegree)
      });

      const result = await degreeControllerMongo.readDegree('CS');
      expect(DegreeModel.findOne).toHaveBeenCalledWith({ id: 'CS' });
      expect(result).toEqual(mockDegree);
    });

    it('should throw an error if degree is not found', async () => {
      DegreeModel.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      await expect(degreeControllerMongo.readDegree('NOT_FOUND')).rejects.toThrow('Degree with this id does not exist.');
      expect(captureException).toHaveBeenCalled();
    });
  });

  // == READ ALL DEGREES ======================================================
  describe('readAllDegrees', () => {
    it('should return a list of all degrees except ECP', async () => {
      const degrees = [mockDegree, { id: 'SE', name: 'Software Engineering', totalCredits: 120 }];
      DegreeModel.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(degrees)
      });

      const result = await degreeControllerMongo.readAllDegrees();
      expect(DegreeModel.find).toHaveBeenCalledWith({ id: { $ne: 'ECP' } });
      expect(result).toEqual(degrees);
    });
  });

  // == UPDATE DEGREE =========================================================
  describe('updateDegree', () => {
    it('should update and return the degree', async () => {
      const updatedDegree = { ...mockDegree, name: 'Computer Science V2' };
      DegreeModel.findOneAndUpdate = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedDegree)
      });

      const result = await degreeControllerMongo.updateDegree('CS', 'Computer Science V2', 120);
      expect(DegreeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'CS' },
        { name: 'Computer Science V2', totalCredits: 120 },
        { new: true }
      );
      expect(result).toEqual(updatedDegree);
    });

    it('should throw an error if degree to update is not found', async () => {
      DegreeModel.findOneAndUpdate = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      await expect(degreeControllerMongo.updateDegree('NOT_FOUND', 'N/A', 100)).rejects.toThrow('Degree with this id does not exist.');
      expect(captureException).toHaveBeenCalled();
    });
  });

  // == DELETE DEGREE =========================================================
  describe('deleteDegree', () => {
    it('should delete a degree and return a success message', async () => {
      DegreeModel.findOneAndDelete = jest.fn().mockResolvedValue(mockDegree);

      const result = await degreeControllerMongo.deleteDegree('CS');
      expect(DegreeModel.findOneAndDelete).toHaveBeenCalledWith({ id: 'CS' });
      expect(result).toBe('Degree with id CS has been successfully deleted.');
    });

    it('should throw an error if degree to delete is not found', async () => {
      DegreeModel.findOneAndDelete = jest.fn().mockResolvedValue(null);

      await expect(degreeControllerMongo.deleteDegree('NOT_FOUND')).rejects.toThrow('Degree with this id does not exist.');
      expect(captureException).toHaveBeenCalled();
    });
  });

  // == GET CREDITS FOR DEGREE ===============================================
  describe('getCreditsForDegree', () => {
    it('should return the total credits for a given degree ID', async () => {
      DegreeModel.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDegree)
      });

      const result = await degreeControllerMongo.getCreditsForDegree('CS');
      expect(result).toBe(120);
    });

    it('should throw an error if the degree is not found', async () => {
      DegreeModel.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      await expect(degreeControllerMongo.getCreditsForDegree('NOT_FOUND')).rejects.toThrow('Degree with this id does not exist.');
      expect(captureException).toHaveBeenCalled();
    });
  });
});
