const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const appUserController =
  require('../controllers/appUserController/appUserController_mongo').default;
const { User } = require('../models/User');

describe('AppUser Controller', () => {
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
  });

  test('updateAppUser updates an existing user', async () => {
    const user = await new User({
      _id: '1',
      email: 'old@test.com',
      password: 'old123',
      fullname: 'Old Name',
      degree: 'CS',
      type: 'student',
    }).save();

    const updated = await appUserController.updateAppUser(
      '1',
      'new@test.com',
      'newpass',
      'New Name',
      'CS',
      'student',
    );

    expect(updated.email).toBe('new@test.com');
    expect(updated.fullname).toBe('New Name');
  });

  test('updateAppUser throws error if user does not exist', async () => {
    await expect(
      appUserController.updateAppUser(
        'nonexistent-id',
        'email@test.com',
        'pass',
        'Name',
        'CS',
        'student',
      ),
    ).rejects.toThrow('AppUser with this id does not exist.');
  });

  test('updateAppUser returns undefined if connection not ready', async () => {
    await mongoose.disconnect();
    const result = await appUserController.updateAppUser(
      '1',
      'a@b.com',
      'pass',
      'Name',
      'CS',
      'student',
    );
    expect(result).toBeUndefined();
    await mongoose.connect(mongoUri);
  });

  test('deleteAppUser deletes an existing user', async () => {
    const user = await new User({
      _id: '2',
      email: 'delete@test.com',
      password: '123',
      fullname: 'Delete Me',
      type: 'student',
    }).save();

    const msg = await appUserController.deleteAppUser('2');
    expect(msg).toMatch(/successfully deleted/);
    const found = await User.findById('2');
    expect(found).toBeNull();
  });

  test('deleteAppUser throws error if user does not exist', async () => {
    await expect(
      appUserController.deleteAppUser('nonexistent'),
    ).rejects.toThrow('AppUser with this id does not exist.');
  });

  test('deleteAppUser returns undefined if connection not ready', async () => {
    await mongoose.disconnect();
    const result = await appUserController.deleteAppUser('1');
    expect(result).toBeUndefined();
    await mongoose.connect(mongoUri);
  });
});
