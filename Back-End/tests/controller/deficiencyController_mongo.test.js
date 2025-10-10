// tests/controller/deficiencyController_mongo.test.js

// Increase timeout for mongodb-memory-server or slow CI environments (optional)
jest.setTimeout(20000);

// Auto-mock the compiled model modules (we will override methods below)
jest.mock('../../dist/models/deficiencyModel');
jest.mock('../../dist/models/appUserModel');
jest.mock('../../dist/models/coursePoolModel');

// Mock Sentry to avoid noisy logs
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

const { captureException } = require('@sentry/node');

// Require the compiled controller and models from dist
const deficiencyControllerMongo = require('../../dist/controllers/deficiencyController/deficiencyController_mongo').default;
const DeficiencyModelModule = require('../../dist/models/deficiencyModel');
const AppUserModelModule = require('../../dist/models/appUserModel');
const CoursePoolModelModule = require('../../dist/models/coursePoolModel');

// Support both module.exports = model and export default
const DeficiencyModel = DeficiencyModelModule && DeficiencyModelModule.default ? DeficiencyModelModule.default : DeficiencyModelModule;
const AppUserModel = AppUserModelModule && AppUserModelModule.default ? AppUserModelModule.default : AppUserModelModule;
const CoursePoolModel = CoursePoolModelModule && CoursePoolModelModule.default ? CoursePoolModelModule.default : CoursePoolModelModule;

describe('deficiencyControllerMongo', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  // Reusable mock objects
  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    fullname: 'Test User',
  };

  const mockCoursePool = {
    id: 'pool-1',
    name: 'Core Courses',
    creditsRequired: 60,
    courses: ['CS101', 'CS102'],
  };

  const mockDeficiency = {
    id: 'def-1',
    coursepool: 'pool-1',
    user_id: 'user-1',
    creditsRequired: 12,
    toObject: () => ({ id: 'def-1', coursepool: 'pool-1', user_id: 'user-1', creditsRequired: 12 }),
  };

  // == CREATE DEFICIENCY =====================================================
  describe('createDeficiency', () => {
    it('should create and return a deficiency if none exists', async () => {
      // No existing deficiency
      DeficiencyModel.findOne = jest.fn().mockResolvedValue(null);
      // Course pool exists
      CoursePoolModel.findOne = jest.fn().mockResolvedValue(mockCoursePool);
      // App user exists
      AppUserModel.findOne = jest.fn().mockResolvedValue(mockUser);

      // Mock constructor behavior: new DeficiencyModel().save() and toObject()
      const saveMock = jest.fn().mockResolvedValue(mockDeficiency);
      if (DeficiencyModel.mock && DeficiencyModel.mockImplementation) {
        DeficiencyModel.mockImplementation(() => ({
          save: saveMock,
          toObject: mockDeficiency.toObject,
        }));
      } else {
        DeficiencyModel.mockImplementation = jest.fn().mockImplementation(() => ({
          save: saveMock,
          toObject: mockDeficiency.toObject,
        }));
      }

      const result = await deficiencyControllerMongo.createDeficiency('pool-1', 'user-1', 12);

      expect(DeficiencyModel.findOne).toHaveBeenCalledWith({ coursepool: 'pool-1', user_id: 'user-1' });
      expect(CoursePoolModel.findOne).toHaveBeenCalledWith({ id: 'pool-1' });
      expect(AppUserModel.findOne).toHaveBeenCalledWith({ id: 'user-1' });
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'def-1',
        coursepool: 'pool-1',
        user_id: 'user-1',
        creditsRequired: 12,
      });
    });

    it('should throw if deficiency already exists', async () => {
      DeficiencyModel.findOne = jest.fn().mockResolvedValue(mockDeficiency);
      CoursePoolModel.findOne = jest.fn().mockResolvedValue(mockCoursePool);
      AppUserModel.findOne = jest.fn().mockResolvedValue(mockUser);

      await expect(
        deficiencyControllerMongo.createDeficiency('pool-1', 'user-1', 12)
      ).rejects.toThrow('Deficiency with this coursepool and user_id already exists. Please use the update endpoint');

      expect(captureException).toHaveBeenCalled();
    });

    it('should throw if coursepool does not exist', async () => {
      DeficiencyModel.findOne = jest.fn().mockResolvedValue(null);
      CoursePoolModel.findOne = jest.fn().mockResolvedValue(null); // missing
      AppUserModel.findOne = jest.fn().mockResolvedValue(mockUser);

      await expect(
        deficiencyControllerMongo.createDeficiency('missing-pool', 'user-1', 12)
      ).rejects.toThrow('CoursePool does not exist.');

      expect(captureException).toHaveBeenCalled();
    });

    it('should throw if app user does not exist', async () => {
      DeficiencyModel.findOne = jest.fn().mockResolvedValue(null);
      CoursePoolModel.findOne = jest.fn().mockResolvedValue(mockCoursePool);
      AppUserModel.findOne = jest.fn().mockResolvedValue(null); // missing user

      await expect(
        deficiencyControllerMongo.createDeficiency('pool-1', 'missing-user', 12)
      ).rejects.toThrow('AppUser does not exist.');

      expect(captureException).toHaveBeenCalled();
    });
  });

  // == GET ALL DEFICIENCIES BY USER ==========================================
  describe('getAllDeficienciesByUser', () => {
    it('should return deficiencies array when found', async () => {
      AppUserModel.findOne = jest.fn().mockResolvedValue(mockUser);
      const defs = [
        { id: 'd1', coursepool: 'pool-1', user_id: 'user-1', creditsRequired: 12 },
        { id: 'd2', coursepool: 'pool-2', user_id: 'user-1', creditsRequired: 6 },
      ];
      DeficiencyModel.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(defs),
      });

      const result = await deficiencyControllerMongo.getAllDeficienciesByUser('user-1');
      expect(AppUserModel.findOne).toHaveBeenCalledWith({ id: 'user-1' });
      expect(DeficiencyModel.find).toHaveBeenCalledWith({ user_id: 'user-1' });
      expect(result).toEqual(defs);
    });

    it('should return undefined when no deficiencies found', async () => {
      AppUserModel.findOne = jest.fn().mockResolvedValue(mockUser);
      DeficiencyModel.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await deficiencyControllerMongo.getAllDeficienciesByUser('user-1');
      expect(result).toBeUndefined();
    });

    it('should throw if user does not exist', async () => {
      AppUserModel.findOne = jest.fn().mockResolvedValue(null); // missing user

      await expect(deficiencyControllerMongo.getAllDeficienciesByUser('missing-user')).rejects.toThrow('AppUser does not exist.');
      expect(captureException).toHaveBeenCalled();
    });
  });

  // == DELETE DEFICIENCY ====================================================
  describe('deleteDeficiencyByCoursepoolAndUserId', () => {
    it('should delete and return success message when found', async () => {
      DeficiencyModel.findOneAndDelete = jest.fn().mockResolvedValue(mockDeficiency);

      const result = await deficiencyControllerMongo.deleteDeficiencyByCoursepoolAndUserId('pool-1', 'user-1');
      expect(DeficiencyModel.findOneAndDelete).toHaveBeenCalledWith({ coursepool: 'pool-1', user_id: 'user-1' });
      expect(result).toBe('Deficiency with appUser user-1 and coursepool pool-1 has been successfully deleted.');
    });

    it('should throw if deficiency not found', async () => {
      DeficiencyModel.findOneAndDelete = jest.fn().mockResolvedValue(null);

      await expect(deficiencyControllerMongo.deleteDeficiencyByCoursepoolAndUserId('pool-1', 'user-1')).rejects.toThrow('Deficiency with this id does not exist.');
      expect(captureException).toHaveBeenCalled();
    });
  });
});
