// tests/controller/deficiencyController_mongo.test.js

jest.setTimeout(20000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Require compiled controller and models from dist (support default and named exports)
const deficiencyControllerModule = require('../dist/controllers/deficiencyController/deficiencyController_mongo');
const deficiencyController =
  deficiencyControllerModule && deficiencyControllerModule.default
    ? deficiencyControllerModule.default
    : deficiencyControllerModule;

const UserModule = require('../dist/models/User');
const DegreeModule = require('../dist/models/Degree');

const User =
  UserModule && UserModule.User
    ? UserModule.User
    : UserModule.default
      ? UserModule.default
      : UserModule;
const Degree =
  DegreeModule && DegreeModule.Degree
    ? DegreeModule.Degree
    : DegreeModule.default
      ? DegreeModule.default
      : DegreeModule;

describe('deficiencyControllerMongo (integration with in-memory MongoDB)', () => {
  let mongoServer;
  let mongoUri;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      // options to silence deprecation warnings
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean DB collections used
    await User.deleteMany({});
    await Degree.deleteMany({});
  });

  describe('createDeficiency', () => {
    it('creates and returns a deficiency when user and coursepool exist', async () => {
      // Create a degree with the course pool
      const degree = new Degree({
        _id: 'deg-1',
        name: 'CS',
        totalCredits: 120,
        isAddon: false,
        coursePools: [
          {
            id: 'pool-1',
            name: 'Core',
            creditsRequired: 60,
            courses: ['CS101', 'CS102'],
          },
        ],
      });
      await degree.save();

      // Create a user without deficiencies
      const user = new User({
        _id: 'user-1',
        email: 'user@example.com',
        password: 'pw',
        fullname: 'Test User',
        type: 'student',
        degree: 'deg-1',
        deficiencies: [],
        exemptions: [],
      });
      await user.save();

      const result = await deficiencyController.createDeficiency(
        'pool-1',
        'user-1',
        12,
      );

      expect(result).toHaveProperty('id');
      expect(result.coursepool).toBe('pool-1');
      expect(result.user_id).toBe('user-1');
      expect(result.creditsRequired).toBe(12);

      const updatedUser = await User.findOne({ _id: 'user-1' }).lean();
      expect(Array.isArray(updatedUser.deficiencies)).toBe(true);
      expect(updatedUser.deficiencies).toHaveLength(1);
      expect(updatedUser.deficiencies[0].coursepool).toBe('pool-1');
    });

    it('throws if deficiency already exists for user and coursepool', async () => {
      // Seed degree and user with an existing deficiency
      const degree = new Degree({
        _id: 'deg-1',
        name: 'CS',
        totalCredits: 120,
        isAddon: false,
        coursePools: [
          { id: 'pool-1', name: 'Core', creditsRequired: 60, courses: [] },
        ],
      });
      await degree.save();

      const user = new User({
        _id: 'user-1',
        email: 'user@example.com',
        password: 'pw',
        fullname: 'Test User',
        type: 'student',
        degree: 'deg-1',
        deficiencies: [{ coursepool: 'pool-1', creditsRequired: 12 }],
        exemptions: [],
      });
      await user.save();

      await expect(
        deficiencyController.createDeficiency('pool-1', 'user-1', 12),
      ).rejects.toThrow(
        'Deficiency with this coursepool and user_id already exists. Please use the update endpoint',
      );
    });

    it('throws when coursepool does not exist in any degree', async () => {
      // Create user but no degree/coursepool
      const user = new User({
        _id: 'user-1',
        email: 'user@example.com',
        password: 'pw',
        fullname: 'Test User',
        type: 'student',
        degree: null,
        deficiencies: [],
        exemptions: [],
      });
      await user.save();

      await expect(
        deficiencyController.createDeficiency('missing-pool', 'user-1', 12),
      ).rejects.toThrow('CoursePool does not exist.');
    });

    it('should initialize deficiencies array if user has none', async () => {
      // Create a degree with the course pool
      const degree = new Degree({
        _id: 'deg-1',
        name: 'CS',
        totalCredits: 120,
        coursePools: [
          { id: 'pool-1', name: 'Core', creditsRequired: 60, courses: [] },
        ],
      });
      await degree.save();

      // Create user without deficiencies field
      const user = new User({
        _id: 'user-no-def',
        email: 'nodef@example.com',
        password: 'pw',
        fullname: 'No Def User',
        type: 'student',
      });
      await user.save();

      const result = await deficiencyController.createDeficiency(
        'pool-1',
        'user-no-def',
        10,
      );

      expect(result).toHaveProperty('coursepool', 'pool-1');
      expect(result).toHaveProperty('creditsRequired', 10);

      const updatedUser = await User.findOne({ _id: 'user-no-def' }).lean();
      expect(Array.isArray(updatedUser.deficiencies)).toBe(true);
      expect(updatedUser.deficiencies).toHaveLength(1);
    });

    it('throws when user does not exist', async () => {
      // Create degree with pool but no user
      const degree = new Degree({
        _id: 'deg-1',
        name: 'CS',
        totalCredits: 120,
        isAddon: false,
        coursePools: [
          { id: 'pool-1', name: 'Core', creditsRequired: 60, courses: [] },
        ],
      });
      await degree.save();

      await expect(
        deficiencyController.createDeficiency('pool-1', 'missing-user', 12),
      ).rejects.toThrow('AppUser does not exist.');
    });
  });

  describe('getAllDeficienciesByUser', () => {
    it('returns deficiencies array when found', async () => {
      // Seed user with deficiencies
      const user = new User({
        _id: 'user-1',
        email: 'user@example.com',
        password: 'pw',
        fullname: 'Test User',
        type: 'student',
        degree: null,
        deficiencies: [
          { coursepool: 'pool-1', creditsRequired: 12 },
          { coursepool: 'pool-2', creditsRequired: 6 },
        ],
        exemptions: [],
      });
      await user.save();

      const result =
        await deficiencyController.getAllDeficienciesByUser('user-1');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result.find((d) => d.coursepool === 'pool-1')).toBeTruthy();
      expect(result.find((d) => d.coursepool === 'pool-2')).toBeTruthy();
    });

    it('returns empty array when no deficiencies exist', async () => {
      const user = new User({
        _id: 'user-2',
        email: 'user2@example.com',
        password: 'pw',
        fullname: 'No Def User',
        type: 'student',
        degree: null,
        deficiencies: [],
        exemptions: [],
      });
      await user.save();

      const result =
        await deficiencyController.getAllDeficienciesByUser('user-2');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('throws when user does not exist', async () => {
      await expect(
        deficiencyController.getAllDeficienciesByUser('missing-user'),
      ).rejects.toThrow('AppUser does not exist.');
    });

    it('returns empty array when user has undefined deficiencies', async () => {
      // Create user without deficiencies field
      const user = new User({
        _id: 'user-no-def',
        email: 'nodef@example.com',
        password: 'pw',
        fullname: 'No Def User',
        type: 'student',
      });
      await user.save();

      const result =
        await deficiencyController.getAllDeficienciesByUser('user-no-def');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteDeficiencyByCoursepoolAndUserId', () => {
    it('deletes an existing deficiency and returns success message', async () => {
      const user = new User({
        _id: 'user-1',
        email: 'user@example.com',
        password: 'pw',
        fullname: 'Test User',
        type: 'student',
        degree: null,
        deficiencies: [{ coursepool: 'pool-1', creditsRequired: 12 }],
        exemptions: [],
      });
      await user.save();

      const result =
        await deficiencyController.deleteDeficiencyByCoursepoolAndUserId(
          'pool-1',
          'user-1',
        );
      expect(result).toBe(
        'Deficiency with appUser user-1 and coursepool pool-1 has been successfully deleted.',
      );

      const updatedUser = await User.findOne({ _id: 'user-1' }).lean();
      expect(Array.isArray(updatedUser.deficiencies)).toBe(true);
      expect(updatedUser.deficiencies).toHaveLength(0);
    });

    it('throws when deficiency to delete does not exist', async () => {
      const user = new User({
        _id: 'user-1',
        email: 'user@example.com',
        password: 'pw',
        fullname: 'Test User',
        type: 'student',
        degree: null,
        deficiencies: [],
        exemptions: [],
      });
      await user.save();

      await expect(
        deficiencyController.deleteDeficiencyByCoursepoolAndUserId(
          'pool-1',
          'user-1',
        ),
      ).rejects.toThrow('Deficiency with this id does not exist.');
    });

    it('throws when user has no deficiencies field', async () => {
      // Create user without deficiencies field
      const user = new User({
        _id: 'user-no-def',
        email: 'nodef@example.com',
        password: 'pw',
        fullname: 'No Def User',
        type: 'student',
      });
      await user.save();

      await expect(
        deficiencyController.deleteDeficiencyByCoursepoolAndUserId(
          'pool-1',
          'user-no-def',
        ),
      ).rejects.toThrow('Deficiency with this id does not exist.');
    });

    it('should delete specific deficiency from multiple deficiencies', async () => {
      const user = new User({
        _id: 'user-multi',
        email: 'multi@example.com',
        password: 'pw',
        fullname: 'Multi Def User',
        type: 'student',
        deficiencies: [
          { coursepool: 'pool-1', creditsRequired: 12 },
          { coursepool: 'pool-2', creditsRequired: 6 },
          { coursepool: 'pool-3', creditsRequired: 9 },
        ],
        exemptions: [],
      });
      await user.save();

      const result =
        await deficiencyController.deleteDeficiencyByCoursepoolAndUserId(
          'pool-2',
          'user-multi',
        );
      expect(result).toContain('successfully deleted');

      const updatedUser = await User.findOne({ _id: 'user-multi' }).lean();
      expect(updatedUser.deficiencies).toHaveLength(2);
      expect(
        updatedUser.deficiencies.find((d) => d.coursepool === 'pool-1'),
      ).toBeTruthy();
      expect(
        updatedUser.deficiencies.find((d) => d.coursepool === 'pool-3'),
      ).toBeTruthy();
      expect(
        updatedUser.deficiencies.find((d) => d.coursepool === 'pool-2'),
      ).toBeFalsy();
    });
  });
});
