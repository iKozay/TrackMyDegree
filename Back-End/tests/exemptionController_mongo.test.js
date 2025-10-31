const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const exemptionController =
  require('../controllers/exemptionController/exemptionController_mongo').default;
const { User } = require('../models/User');
const { Course } = require('../models/Course');
const Sentry = require('@sentry/node');

jest.spyOn(Sentry, 'captureException').mockImplementation(() => {}); // silence Sentry

describe('Exemption Controller (MongoDB, Embedded in User)', () => {
  let mongoServer;
  let mongoUri;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { dbName: 'jest' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
    jest.clearAllMocks();
  });

  // ✅ helper for creating valid courses
  async function createCourse(id) {
    return await new Course({
      _id: id,
      code: id, // match controller query
      title: `${id} Title`,
      credits: 3,
      description: `${id} Description`,
    }).save();
  }

  test('✅ createExemptions adds new exemptions to user', async () => {
    const user = await new User({
      _id: 'u1',
      email: 'user1@test.com',
      password: 'p',
      fullname: 'User One',
      degree: 'CS',
      type: 'student',
    }).save();

    await createCourse('COMP101');
    await createCourse('COMP202');

    const result = await exemptionController.createExemptions(
      ['COMP101', 'COMP202'],
      user._id,
    );

    expect(result.created.length).toBe(2);
    expect(result.alreadyExists.length).toBe(0);

    const updated = await User.findById('u1');
    expect(updated.exemptions).toEqual(
      expect.arrayContaining(['COMP101', 'COMP202']),
    );
    expect(result).toEqual({
      created: [
        { coursecode: 'COMP101', user_id: user._id },
        { coursecode: 'COMP202', user_id: user._id },
      ],
      alreadyExists: [],
    });
  });

  test('✅ createExemptions skips existing course exemptions', async () => {
    const user = await new User({
      _id: 'u2',
      email: 'user2@test.com',
      password: 'p',
      fullname: 'User Two',
      degree: 'CS',
      type: 'student',
      exemptions: ['COMP303'],
    }).save();

    await createCourse('COMP303');
    const result = await exemptionController.createExemptions(
      ['COMP303'],
      user._id,
    );

    expect(result.created).toEqual([]);
    expect(result.alreadyExists).toEqual(['COMP303']);
  });

  test('✅ throws error if user missing', async () => {
    await createCourse('COMP404');
    await expect(
      exemptionController.createExemptions(['COMP404'], 'fakeUser'),
    ).rejects.toThrow("AppUser with id 'fakeUser' does not exist.");
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  test('✅ throws error if course missing', async () => {
    const user = await new User({
      _id: 'u3',
      email: 'user3@test.com',
      password: 'p',
      fullname: 'User Three',
      degree: 'CS',
      type: 'student',
    }).save();

    await expect(
      exemptionController.createExemptions(['FAKE101'], user._id),
    ).rejects.toThrow("Course with code 'FAKE101' does not exist.");
  });

  test('✅ getAllExemptionsByUser returns all exemptions', async () => {
    const user = await new User({
      _id: 'u4',
      email: 'user4@test.com',
      password: 'p',
      fullname: 'User Four',
      degree: 'CS',
      type: 'student',
      exemptions: ['COMP111', 'COMP249'],
    }).save();

    const result = await exemptionController.getAllExemptionsByUser(user._id);
    expect(result.length).toBe(2);
    expect(result.map((r) => r.coursecode)).toEqual(
      expect.arrayContaining(['COMP111', 'COMP249']),
    );
  });

  test('✅ getAllExemptionsByUser throws when user missing', async () => {
    await expect(
      exemptionController.getAllExemptionsByUser('fake'),
    ).rejects.toThrow("AppUser with id 'fake' does not exist.");
  });

  test('✅ getAllExemptionsByUser throws when no exemptions', async () => {
    const user = await new User({
      _id: 'u7',
      email: 'user7@test.com',
      password: 'p',
      fullname: 'User Seven',
      degree: 'CS',
      type: 'student',
      exemptions: [],
    }).save();

    await expect(
      exemptionController.getAllExemptionsByUser('u7'),
    ).rejects.toThrow("No exemptions found for user with id 'u7'.");
  });

  test('✅ deleteExemptionByCoursecodeAndUserId removes exemption', async () => {
    const user = await new User({
      _id: 'u5',
      email: 'user5@test.com',
      password: 'p',
      fullname: 'User Five',
      degree: 'CS',
      type: 'student',
      exemptions: ['COMP222', 'COMP333'],
    }).save();

    const msg = await exemptionController.deleteExemptionByCoursecodeAndUserId(
      'COMP222',
      user._id,
    );
    expect(msg).toMatch(/successfully deleted/);

    const updated = await User.findById('u5');
    expect(updated.exemptions).toEqual(['COMP333']);
  });

  test('✅ deleteExemptionByCoursecodeAndUserId throws if user missing', async () => {
    await expect(
      exemptionController.deleteExemptionByCoursecodeAndUserId(
        'COMP111',
        'fakeUser',
      ),
    ).rejects.toThrow("AppUser with id 'fakeUser' does not exist.");
  });

  test('✅ deleteExemptionByCoursecodeAndUserId throws if exemption not exist', async () => {
    const user = await new User({
      _id: 'u6',
      email: 'user6@test.com',
      password: 'p',
      fullname: 'User Six',
      degree: 'CS',
      type: 'student',
      exemptions: ['COMP444'],
    }).save();

    await expect(
      exemptionController.deleteExemptionByCoursecodeAndUserId(
        'COMP999',
        user._id,
      ),
    ).rejects.toThrow(
      'Exemption with this coursecode and user_id does not exist.',
    );
  });

  test('✅ returns undefined if mongoose not connected', async () => {
    await mongoose.disconnect();

    const res1 = await exemptionController.createExemptions(['COMP999'], 'u9');
    const res2 = await exemptionController.getAllExemptionsByUser('u9');
    const res3 = await exemptionController.deleteExemptionByCoursecodeAndUserId(
      'COMP999',
      'u9',
    );

    expect(res1).toEqual({ created: [], alreadyExists: [] });
    expect(res2).toBeUndefined();
    expect(res3).toBeUndefined();

    await mongoose.connect(mongoUri, { dbName: 'jest' });
  });
});
