const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { UserController } = require('../dist/controllers/mondoDBControllers/UserController');
const { User } = require('../dist/models/User');
const { Course } = require('../dist/models/Course');
const { Degree } = require('../dist/models/Degree');
const { Timeline } = require('../dist/models/Timeline');

describe('UserController (MongoDB)', () => {
  let mongoServer, mongoUri, userController;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    userController = new UserController();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
    await Degree.deleteMany({});
    await Timeline.deleteMany({});
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP',
      };

      const result = await userController.createUser(userData);

      expect(result).toMatchObject({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP',
      });
      expect(result.id).toBeDefined();
    });

    it('should throw error when user with email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullname: 'Test User',
        type: 'student',
      };

      await userController.createUser(userData);

      // Try to create second user with same email
      await expect(userController.createUser(userData))
        .rejects.toThrow('User with this email already exists');
    });

    it('should handle database errors gracefully', async () => {
      // Mock exists to throw an error
      const originalExists = userController.exists;
      userController.exists = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullname: 'Test User',
        type: 'student',
      };

      await expect(userController.createUser(userData))
        .rejects.toThrow('Database connection failed');

      userController.exists = originalExists;
    });
  });

  describe('getUserById', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP',
      });
    });

    it('should get user by ID', async () => {
      const result = await userController.getUserById(testUser._id.toString());

      expect(result).toMatchObject({
        id: testUser._id.toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP',
      });
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.getUserById(fakeId))
        .rejects.toThrow('User with this id does not exist');
    });

    it('should handle database errors gracefully', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userController.getUserById(testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      userController.findById = originalFindById;
    });
  });

  describe('getAllUsers', () => {
    beforeEach(async () => {
      await User.create([
        {
          _id: new mongoose.Types.ObjectId().toString(),
          email: 'user1@example.com',
          password: 'hashedpassword',
          fullname: 'User One',
          type: 'student',
          degree: 'COMP',
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          email: 'user2@example.com',
          password: 'hashedpassword',
          fullname: 'User Two',
          type: 'advisor',
          degree: 'SOEN',
        },
      ]);
    });

    it('should get all users', async () => {
      const result = await userController.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('fullname');
      expect(result[0]).toHaveProperty('type');
    });

    it('should return empty array when no users exist', async () => {
      await User.deleteMany({});
      const result = await userController.getAllUsers();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      const originalFindAll = userController.findAll;
      userController.findAll = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userController.getAllUsers())
        .rejects.toThrow('Database connection failed');

      userController.findAll = originalFindAll;
    });
  });

  describe('updateUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP',
      });
    });

    it('should update user successfully', async () => {
      const updates = { fullname: 'Updated Name', degree: 'SOEN' };
      const result = await userController.updateUser(testUser._id.toString(), updates);

      expect(result.fullname).toBe('Updated Name');
      expect(result.degree).toBe('SOEN');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updates = { fullname: 'Updated Name' };

      await expect(userController.updateUser(fakeId, updates))
        .rejects.toThrow('User with this id does not exist');
    });

    it('should handle database errors gracefully', async () => {
      const originalUpdateById = userController.updateById;
      userController.updateById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const updates = { fullname: 'Updated Name' };
      await expect(userController.updateUser(testUser._id.toString(), updates))
        .rejects.toThrow('Database connection failed');

      userController.updateById = originalUpdateById;
    });
  });

  describe('deleteUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should delete user successfully', async () => {
      const result = await userController.deleteUser(testUser._id.toString());

      expect(result).toBe(`User with id ${testUser._id} has been successfully deleted.`);

      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.deleteUser(fakeId))
        .rejects.toThrow('User with this id does not exist');
    });

    it('should handle database errors gracefully', async () => {
      const originalDeleteById = userController.deleteById;
      userController.deleteById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userController.deleteUser(testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      userController.deleteById = originalDeleteById;
    });
  });

  describe('getUserData', () => {
    let testUser, testDegree, testTimeline;

    beforeEach(async () => {
      testDegree = await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
      });

      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP',
        deficiencies: [
          { coursepool: 'Core', creditsRequired: 30 },
        ],
        exemptions: ['COMP101'],
      });

      testTimeline = await Timeline.create({
        userId: testUser._id.toString(),
        items: [
          {
            season: 'Fall',
            year: 2023,
            courses: ['COMP101', 'COMP201'],
          },
        ],
      });
    });

    it('should get comprehensive user data', async () => {
      const result = await userController.getUserData(testUser._id.toString());

      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('deficiencies');
      expect(result).toHaveProperty('exemptions');
      expect(result).toHaveProperty('degree');
      expect(result.degree).toMatchObject({
        id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
      });
      expect(result.timeline.length).toBe(2);
    });

    it('should handle user without degree', async () => {
      await User.findByIdAndUpdate(testUser._id, { degree: null });

      const result = await userController.getUserData(testUser._id.toString());

      expect(result.degree).toBeNull();
    });

    it('should handle user with no timeline', async () => {
      await Timeline.deleteMany({});

      const result = await userController.getUserData(testUser._id.toString());

      expect(result.timeline).toEqual([]);
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.getUserData(fakeId))
        .rejects.toThrow('User with this id does not exist');
    });

    it('should handle database errors gracefully', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userController.getUserData(testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      userController.findById = originalFindById;
    });
  });

  describe('createDeficiency', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        deficiencies: [],
      });
    });

    it('should create deficiency successfully', async () => {
      const result = await userController.createDeficiency('Math', testUser._id.toString(), 6);

      expect(result).toMatchObject({
        coursepool: 'Math',
        user_id: testUser._id.toString(),
        creditsRequired: 6,
      });

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.deficiencies).toHaveLength(1);
    });

    it('should throw error when deficiency already exists', async () => {
      await userController.createDeficiency('Math', testUser._id.toString(), 6);

      await expect(userController.createDeficiency('Math', testUser._id.toString(), 8))
        .rejects.toThrow('Deficiency with this coursepool already exists');
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.createDeficiency('Math', fakeId, 6))
        .rejects.toThrow('User does not exist');
    });

    it('should handle database errors gracefully', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userController.createDeficiency('Math', testUser._id.toString(), 6))
        .rejects.toThrow('Database connection failed');

      userController.findById = originalFindById;
    });
  });

  describe('getAllDeficienciesByUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        deficiencies: [
          { coursepool: 'Math', creditsRequired: 6 },
          { coursepool: 'Science', creditsRequired: 3 },
        ],
      });
    });

    it('should get all deficiencies for user', async () => {
      const result = await userController.getAllDeficienciesByUser(testUser._id.toString());

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        coursepool: 'Math',
        user_id: testUser._id.toString(),
        creditsRequired: 6,
      });
    });

    it('should return empty array for user with no deficiencies', async () => {
      await User.findByIdAndUpdate(testUser._id, { deficiencies: [] });

      const result = await userController.getAllDeficienciesByUser(testUser._id.toString());

      expect(result).toEqual([]);
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.getAllDeficienciesByUser(fakeId))
        .rejects.toThrow('User does not exist');
    });
  });

  describe('updateDeficiency', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        deficiencies: [
          { coursepool: 'Math', creditsRequired: 6 },
        ],
      });
    });

    it('should update deficiency successfully', async () => {
      const result = await userController.updateDeficiency('Math', testUser._id.toString(), 8);

      expect(result).toMatchObject({
        coursepool: 'Math',
        user_id: testUser._id.toString(),
        creditsRequired: 8,
      });
    });

    it('should throw error when deficiency not found', async () => {
      await expect(userController.updateDeficiency('NonExistent', testUser._id.toString(), 8))
        .rejects.toThrow('Deficiency not found');
    });

    it('should handle database errors gracefully', async () => {
      const originalFindOneAndUpdate = User.findOneAndUpdate;
      User.findOneAndUpdate = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userController.updateDeficiency('Math', testUser._id.toString(), 8))
        .rejects.toThrow('Database connection failed');

      User.findOneAndUpdate = originalFindOneAndUpdate;
    });
  });

  describe('deleteDeficiency', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        deficiencies: [
          { coursepool: 'Math', creditsRequired: 6 },
        ],
      });
    });

    it('should delete deficiency successfully', async () => {
      const result = await userController.deleteDeficiency('Math', testUser._id.toString());

      expect(result).toBe('Deficiency with coursepool Math has been successfully deleted.');

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.deficiencies).toHaveLength(0);
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.deleteDeficiency('Math', fakeId))
        .rejects.toThrow('User does not exist');
    });

    it('should handle database errors gracefully', async () => {
      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userController.deleteDeficiency('Math', testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  describe('createExemptions', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        exemptions: [],
      });

      await Course.create([
        { _id: 'COMP101', title: 'Intro Programming', credits: 3, description: 'Intro' },
        { _id: 'COMP201', title: 'Data Structures', credits: 4, description: 'Data Structures' },
      ]);
    });

    it('should create exemptions successfully', async () => {
      const result = await userController.createExemptions(['COMP101', 'COMP201'], testUser._id.toString());

      expect(result.created).toHaveLength(2);
      expect(result.alreadyExists).toHaveLength(0);
    });

    it('should handle existing exemptions', async () => {
      await User.findByIdAndUpdate(testUser._id, { exemptions: ['COMP101'] });

      const result = await userController.createExemptions(['COMP101', 'COMP201'], testUser._id.toString());

      expect(result.created).toHaveLength(1);
      expect(result.alreadyExists).toContain('COMP101');
    });

    it('should throw error when course does not exist', async () => {
      await expect(userController.createExemptions(['NONEXIST'], testUser._id.toString()))
        .rejects.toThrow("Course with code 'NONEXIST' does not exist.");
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.createExemptions(['COMP101'], fakeId))
        .rejects.toThrow("User with id '");
    });

    it('should handle database errors gracefully', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userController.createExemptions(['COMP101'], testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      userController.findById = originalFindById;
    });
  });

  describe('getAllExemptionsByUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        exemptions: ['COMP101', 'COMP201'],
      });
    });

    it('should get all exemptions for user', async () => {
      const result = await userController.getAllExemptionsByUser(testUser._id.toString());

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('coursecode');
      expect(result[0]).toHaveProperty('user_id');
    });

    it('should return empty array for user with no exemptions', async () => {
      await User.findByIdAndUpdate(testUser._id, { exemptions: [] });

      const result = await userController.getAllExemptionsByUser(testUser._id.toString());

      expect(result).toEqual([]);
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.getAllExemptionsByUser(fakeId))
        .rejects.toThrow("User with id '");
    });
  });

  describe('deleteExemption', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        exemptions: ['COMP101'],
      });
    });

    it('should delete exemption successfully', async () => {
      const result = await userController.deleteExemption('COMP101', testUser._id.toString());

      expect(result).toBe('Exemption with coursecode COMP101 has been successfully deleted.');

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.exemptions).toHaveLength(0);
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.deleteExemption('COMP101', fakeId))
        .rejects.toThrow("User with id '");
    });

    it('should handle database errors gracefully', async () => {
      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userController.deleteExemption('COMP101', testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });
});

