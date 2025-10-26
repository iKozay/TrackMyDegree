const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { UserController } = require('../dist/controllers/mondoDBControllers/UserController');
const { User } = require('../dist/models/User');
const { Course } = require('../dist/models/Course');
const { Degree } = require('../dist/models/Degree');
const { Timeline } = require('../dist/models/Timeline');

describe('UserController', () => {
  let mongoServer, mongoUri, userController;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    userController = new UserController();
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
    await Degree.deleteMany({});
    await Timeline.deleteMany({});
  });

  describe('Constructor', () => {
    it('should initialize with User model', () => {
      expect(userController.model).toBe(User);
      expect(userController.modelName).toBe('User');
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP',
        deficiencies: [],
        exemptions: []
      };

      const result = await userController.createUser(userData);

      expect(result).toMatchObject({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP'
      });
      expect(result.id).toBeDefined();
    });

    it('should throw error when user with email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullname: 'Test User',
        type: 'student'
      };

      // Create first user
      await userController.createUser(userData);

      // Try to create second user with same email
      await expect(userController.createUser(userData))
        .rejects.toThrow('User with this email already exists');
    });

    it('should handle database errors', async () => {
      // Mock User.exists to throw an error
      const originalExists = User.exists;
      User.exists = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullname: 'Test User',
        type: 'student'
      };

      await expect(userController.createUser(userData))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      User.exists = originalExists;
    });
  });

  describe('getUserById', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP',
        deficiencies: [],
        exemptions: []
      });
    });

    it('should get user by ID', async () => {
      const result = await userController.getUserById(testUser._id.toString());

      expect(result).toMatchObject({
        id: testUser._id.toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP'
      });
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.getUserById(fakeId))
        .rejects.toThrow('User with this id does not exist');
    });

    it('should handle database errors', async () => {
      // Mock User.findById to throw an error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(userController.getUserById(testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      User.findById = originalFindById;
    });
  });

  describe('getAllUsers', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'user1@example.com',
          fullname: 'User One',
          type: 'student',
          degree: 'COMP'
        },
        {
          email: 'user2@example.com',
          fullname: 'User Two',
          type: 'advisor',
          degree: 'SOEN'
        }
      ]);
    });

    it('should get all users', async () => {
      const result = await userController.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('fullname');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('degree');
    });

    it('should return empty array when no users exist', async () => {
      await User.deleteMany({});
      const result = await userController.getAllUsers();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Mock User.find to throw an error
      const originalFind = User.find;
      User.find = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(userController.getAllUsers())
        .rejects.toThrow('Database connection failed');

      // Restore original method
      User.find = originalFind;
    });
  });

  describe('updateUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP'
      });
    });

    it('should update user successfully', async () => {
      const updates = { fullname: 'Updated Name', degree: 'SOEN' };
      const result = await userController.updateUser(testUser._id.toString(), updates);

      expect(result.fullname).toBe('Updated Name');
      expect(result.degree).toBe('SOEN');
      expect(result.email).toBe('test@example.com'); // Should remain unchanged
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updates = { fullname: 'Updated Name' };

      await expect(userController.updateUser(fakeId, updates))
        .rejects.toThrow('User with this id does not exist');
    });

    it('should handle database errors', async () => {
      // Mock User.findByIdAndUpdate to throw an error
      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const updates = { fullname: 'Updated Name' };
      await expect(userController.updateUser(testUser._id.toString(), updates))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  describe('deleteUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student'
      });
    });

    it('should delete user successfully', async () => {
      const result = await userController.deleteUser(testUser._id.toString());

      expect(result).toBe(`User with id ${testUser._id} has been successfully deleted`);

      // Verify user is deleted
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.deleteUser(fakeId))
        .rejects.toThrow('User with this id does not exist');
    });

    it('should handle database errors', async () => {
      // Mock User.findByIdAndDelete to throw an error
      const originalFindByIdAndDelete = User.findByIdAndDelete;
      User.findByIdAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(userController.deleteUser(testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      User.findByIdAndDelete = originalFindByIdAndDelete;
    });
  });

  describe('getUserData', () => {
    let testUser, testDegree, testTimeline;

    beforeEach(async () => {
      testDegree = await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120
      });

      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP',
        deficiencies: [{ coursepool: 'Math', creditsRequired: 6 }],
        exemptions: ['COMP101', 'COMP102']
      });

      testTimeline = await Timeline.create({
        userId: testUser._id.toString(),
        items: [
          {
            season: 'Fall',
            year: 2023,
            courses: ['COMP101', 'MATH101']
          },
          {
            season: 'Winter',
            year: 2024,
            courses: ['COMP102']
          }
        ]
      });
    });

    it('should get comprehensive user data', async () => {
      const result = await userController.getUserData(testUser._id.toString());

      expect(result.user).toMatchObject({
        id: testUser._id.toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP'
      });

      expect(result.timeline).toHaveLength(3);
      expect(result.timeline[0]).toMatchObject({
        season: 'Fall',
        year: 2023,
        coursecode: 'COMP101'
      });

      expect(result.deficiencies).toHaveLength(1);
      expect(result.deficiencies[0]).toMatchObject({
        coursepool: 'Math',
        creditsRequired: 6
      });

      expect(result.exemptions).toHaveLength(2);
      expect(result.exemptions[0]).toMatchObject({ coursecode: 'COMP101' });

      expect(result.degree).toMatchObject({
        id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120
      });
    });

    it('should handle user without degree', async () => {
      await User.findByIdAndUpdate(testUser._id, { degree: null });
      const result = await userController.getUserData(testUser._id.toString());

      expect(result.degree).toBeNull();
    });

    it('should handle user with no timeline', async () => {
      await Timeline.deleteMany({});
      const result = await userController.getUserData(testUser._id.toString());

      expect(result.timeline).toHaveLength(0);
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.getUserData(fakeId))
        .rejects.toThrow('User with this id does not exist');
    });

    it('should handle database errors', async () => {
      // Mock User.findById to throw an error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(userController.getUserData(testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      User.findById = originalFindById;
    });
  });

  describe('createDeficiency', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        deficiencies: []
      });
    });

    it('should create deficiency successfully', async () => {
      const result = await userController.createDeficiency('Math', testUser._id.toString(), 6);

      expect(result).toMatchObject({
        coursepool: 'Math',
        user_id: testUser._id.toString(),
        creditsRequired: 6
      });

      // Verify deficiency was added
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.deficiencies).toHaveLength(1);
      expect(updatedUser.deficiencies[0]).toMatchObject({
        coursepool: 'Math',
        creditsRequired: 6
      });
    });

    it('should throw error when deficiency already exists', async () => {
      // Create first deficiency
      await userController.createDeficiency('Math', testUser._id.toString(), 6);

      // Try to create same deficiency again
      await expect(userController.createDeficiency('Math', testUser._id.toString(), 8))
        .rejects.toThrow('Deficiency with this coursepool already exists. Please use the update endpoint');
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.createDeficiency('Math', fakeId, 6))
        .rejects.toThrow('User does not exist');
    });

    it('should handle database errors', async () => {
      // Mock User.findById to throw an error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(userController.createDeficiency('Math', testUser._id.toString(), 6))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      User.findById = originalFindById;
    });
  });

  describe('getAllDeficienciesByUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        deficiencies: [
          { coursepool: 'Math', creditsRequired: 6 },
          { coursepool: 'Science', creditsRequired: 3 }
        ]
      });
    });

    it('should get all deficiencies for user', async () => {
      const result = await userController.getAllDeficienciesByUser(testUser._id.toString());

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        coursepool: 'Math',
        user_id: testUser._id.toString(),
        creditsRequired: 6
      });
      expect(result[1]).toMatchObject({
        coursepool: 'Science',
        user_id: testUser._id.toString(),
        creditsRequired: 3
      });
    });

    it('should return empty array for user with no deficiencies', async () => {
      await User.findByIdAndUpdate(testUser._id, { deficiencies: [] });
      const result = await userController.getAllDeficienciesByUser(testUser._id.toString());

      expect(result).toHaveLength(0);
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
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        deficiencies: [{ coursepool: 'Math', creditsRequired: 6 }]
      });
    });

    it('should update deficiency successfully', async () => {
      const result = await userController.updateDeficiency('Math', testUser._id.toString(), 9);

      expect(result).toMatchObject({
        coursepool: 'Math',
        user_id: testUser._id.toString(),
        creditsRequired: 9
      });

      // Verify deficiency was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.deficiencies[0].creditsRequired).toBe(9);
    });

    it('should throw error when deficiency not found', async () => {
      await expect(userController.updateDeficiency('Science', testUser._id.toString(), 9))
        .rejects.toThrow('Deficiency not found');
    });

    it('should handle database errors', async () => {
      // Mock User.findOneAndUpdate to throw an error
      const originalFindOneAndUpdate = User.findOneAndUpdate;
      User.findOneAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(userController.updateDeficiency('Math', testUser._id.toString(), 9))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      User.findOneAndUpdate = originalFindOneAndUpdate;
    });
  });

  describe('deleteDeficiency', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        deficiencies: [
          { coursepool: 'Math', creditsRequired: 6 },
          { coursepool: 'Science', creditsRequired: 3 }
        ]
      });
    });

    it('should delete deficiency successfully', async () => {
      const result = await userController.deleteDeficiency('Math', testUser._id.toString());

      expect(result).toBe('Deficiency with coursepool Math has been successfully deleted');

      // Verify deficiency was removed
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.deficiencies).toHaveLength(1);
      expect(updatedUser.deficiencies[0].coursepool).toBe('Science');
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.deleteDeficiency('Math', fakeId))
        .rejects.toThrow('User does not exist');
    });

    it('should handle database errors', async () => {
      // Mock User.findByIdAndUpdate to throw an error
      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(userController.deleteDeficiency('Math', testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  describe('createExemptions', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        exemptions: []
      });

      await Course.create([
        { _id: 'COMP101', title: 'Intro to Programming' },
        { _id: 'COMP102', title: 'Data Structures' },
        { _id: 'MATH101', title: 'Calculus I' }
      ]);
    });

    it('should create exemptions successfully', async () => {
      const coursecodes = ['COMP101', 'COMP102'];
      const result = await userController.createExemptions(coursecodes, testUser._id.toString());

      expect(result.created).toHaveLength(2);
      expect(result.alreadyExists).toHaveLength(0);
      expect(result.created[0]).toMatchObject({
        coursecode: 'COMP101',
        user_id: testUser._id.toString()
      });

      // Verify exemptions were added
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.exemptions).toContain('COMP101');
      expect(updatedUser.exemptions).toContain('COMP102');
    });

    it('should handle existing exemptions', async () => {
      // Add first exemption
      await userController.createExemptions(['COMP101'], testUser._id.toString());

      // Try to add same exemption plus new one
      const coursecodes = ['COMP101', 'COMP102'];
      const result = await userController.createExemptions(coursecodes, testUser._id.toString());

      expect(result.created).toHaveLength(1);
      expect(result.alreadyExists).toHaveLength(1);
      expect(result.created[0].coursecode).toBe('COMP102');
      expect(result.alreadyExists[0]).toBe('COMP101');
    });

    it('should throw error when course does not exist', async () => {
      const coursecodes = ['COMP101', 'NONEXISTENT'];
      await expect(userController.createExemptions(coursecodes, testUser._id.toString()))
        .rejects.toThrow("Course with code 'NONEXISTENT' does not exist");
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const coursecodes = ['COMP101'];
      await expect(userController.createExemptions(coursecodes, fakeId))
        .rejects.toThrow(`User with id '${fakeId}' does not exist`);
    });

    it('should handle database errors', async () => {
      // Mock User.findById to throw an error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const coursecodes = ['COMP101'];
      await expect(userController.createExemptions(coursecodes, testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      User.findById = originalFindById;
    });
  });

  describe('getAllExemptionsByUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        exemptions: ['COMP101', 'COMP102']
      });
    });

    it('should get all exemptions for user', async () => {
      const result = await userController.getAllExemptionsByUser(testUser._id.toString());

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        coursecode: 'COMP101',
        user_id: testUser._id.toString()
      });
      expect(result[1]).toMatchObject({
        coursecode: 'COMP102',
        user_id: testUser._id.toString()
      });
    });

    it('should return empty array for user with no exemptions', async () => {
      await User.findByIdAndUpdate(testUser._id, { exemptions: [] });
      const result = await userController.getAllExemptionsByUser(testUser._id.toString());

      expect(result).toHaveLength(0);
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.getAllExemptionsByUser(fakeId))
        .rejects.toThrow(`User with id '${fakeId}' does not exist`);
    });
  });

  describe('deleteExemption', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        exemptions: ['COMP101', 'COMP102']
      });
    });

    it('should delete exemption successfully', async () => {
      const result = await userController.deleteExemption('COMP101', testUser._id.toString());

      expect(result).toBe('Exemption with coursecode COMP101 has been successfully deleted');

      // Verify exemption was removed
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.exemptions).toHaveLength(1);
      expect(updatedUser.exemptions).toContain('COMP102');
      expect(updatedUser.exemptions).not.toContain('COMP101');
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.deleteExemption('COMP101', fakeId))
        .rejects.toThrow(`User with id '${fakeId}' does not exist`);
    });

    it('should handle database errors', async () => {
      // Mock User.findByIdAndUpdate to throw an error
      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(userController.deleteExemption('COMP101', testUser._id.toString()))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  describe('Additional Edge Cases for Coverage', () => {
    let testUser, testDegree;

    beforeEach(async () => {
      testDegree = await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120
      });

      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP',
        deficiencies: [],
        exemptions: []
      });
    });

    it('should handle createUser when exists check returns data', async () => {
      const originalExists = userController.exists;
      userController.exists = jest.fn().mockResolvedValue({
        success: true,
        data: true
      });

      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        fullname: 'Duplicate User',
        type: 'student'
      };

      await expect(userController.createUser(userData))
        .rejects.toThrow('User with this email already exists');

      userController.exists = originalExists;
    });

    it('should handle createUser when create returns error without message', async () => {
      const originalExists = userController.exists;
      const originalCreate = userController.create;

      userController.exists = jest.fn().mockResolvedValue({ success: true, data: false });
      userController.create = jest.fn().mockResolvedValue({
        success: false,
        error: null
      });

      const userData = {
        email: 'test2@example.com',
        password: 'password123',
        fullname: 'Test User 2',
        type: 'student'
      };

      await expect(userController.createUser(userData))
        .rejects.toThrow('Failed to create user');

      userController.exists = originalExists;
      userController.create = originalCreate;
    });

    it('should handle getAllUsers when findAll returns null data', async () => {
      const originalFindAll = userController.findAll;
      userController.findAll = jest.fn().mockResolvedValue({
        success: true,
        data: null
      });

      const result = await userController.getAllUsers();
      expect(result).toEqual([]);

      userController.findAll = originalFindAll;
    });

    it('should handle getAllUsers when findAll returns error without message', async () => {
      const originalFindAll = userController.findAll;
      userController.findAll = jest.fn().mockResolvedValue({
        success: false,
        error: null
      });

      await expect(userController.getAllUsers())
        .rejects.toThrow('Failed to fetch users');

      userController.findAll = originalFindAll;
    });

    it('should handle getUserData with user having no degree field', async () => {
      await User.findByIdAndUpdate(testUser._id, { $unset: { degree: 1 } });
      const result = await userController.getUserData(testUser._id.toString());

      expect(result.user.degree).toBeNull();
      expect(result.degree).toBeNull();
    });

    it('should handle getUserData with user having invalid degree reference', async () => {
      await User.findByIdAndUpdate(testUser._id, { degree: 'NONEXISTENT' });
      const result = await userController.getUserData(testUser._id.toString());

      expect(result.degree).toBeNull();
    });

    it('should handle getUserData with timeline items having no courses', async () => {
      await Timeline.create({
        userId: testUser._id.toString(),
        items: [
          {
            season: 'Fall',
            year: 2023,
            courses: []
          }
        ]
      });

      const result = await userController.getUserData(testUser._id.toString());
      expect(result.timeline).toHaveLength(0);
    });

    it('should handle getUserData with timeline items having undefined courses', async () => {
      await Timeline.create({
        userId: testUser._id.toString(),
        items: [
          {
            season: 'Fall',
            year: 2023
            // courses is undefined
          }
        ]
      });

      const result = await userController.getUserData(testUser._id.toString());
      expect(result.timeline).toHaveLength(0);
    });

    it('should handle getUserData with user having undefined deficiencies', async () => {
      await User.findByIdAndUpdate(testUser._id, { $unset: { deficiencies: 1 } });
      const result = await userController.getUserData(testUser._id.toString());

      expect(result.deficiencies).toEqual([]);
    });

    it('should handle getUserData with user having undefined exemptions', async () => {
      await User.findByIdAndUpdate(testUser._id, { $unset: { exemptions: 1 } });
      const result = await userController.getUserData(testUser._id.toString());

      expect(result.exemptions).toEqual([]);
    });

    it('should handle getUserData when findById returns error without data', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockResolvedValue({
        success: false,
        data: null
      });

      await expect(userController.getUserData('fake123'))
        .rejects.toThrow('User with this id does not exist');

      userController.findById = originalFindById;
    });

    it('should handle createDeficiency when user has undefined deficiencies array', async () => {
      const userWithoutDeficiencies = await User.create({
        email: 'nodef@example.com',
        fullname: 'No Def User',
        type: 'student'
        // deficiencies is undefined
      });

      const result = await userController.createDeficiency('Math', userWithoutDeficiencies._id.toString(), 6);
      expect(result).toMatchObject({
        coursepool: 'Math',
        user_id: userWithoutDeficiencies._id.toString(),
        creditsRequired: 6
      });
    });

    it('should handle createDeficiency when findByIdAndUpdate returns null', async () => {
      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null)
        })
      });

      await expect(userController.createDeficiency('Math', testUser._id.toString(), 6))
        .rejects.toThrow('Failed to update user deficiencies');

      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should handle getAllDeficienciesByUser with user having undefined deficiencies', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockResolvedValue({
        success: true,
        data: {
          _id: testUser._id,
          // deficiencies is undefined
        }
      });

      const result = await userController.getAllDeficienciesByUser(testUser._id.toString());
      expect(result).toEqual([]);

      userController.findById = originalFindById;
    });

    it('should handle getAllExemptionsByUser with user having undefined exemptions', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockResolvedValue({
        success: true,
        data: {
          _id: testUser._id,
          exemptions: undefined
        }
      });

      const result = await userController.getAllExemptionsByUser(testUser._id.toString());
      expect(result).toEqual([]);

      userController.findById = originalFindById;
    });

    it('should handle createExemptions with user having undefined exemptions field', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockResolvedValue({
        success: true,
        data: {
          _id: testUser._id,
          // exemptions is undefined
        }
      });

      await Course.create({ _id: 'COMP201', title: 'Test Course' });

      const result = await userController.createExemptions(['COMP201'], testUser._id.toString());
      expect(result.created).toHaveLength(1);
      expect(result.alreadyExists).toHaveLength(0);

      userController.findById = originalFindById;
    });

    it('should handle createExemptions when no courses need to be created', async () => {
      await User.findByIdAndUpdate(testUser._id, { exemptions: ['COMP101'] });
      await Course.create({ _id: 'COMP101', title: 'Test Course' });

      const result = await userController.createExemptions(['COMP101'], testUser._id.toString());
      expect(result.created).toHaveLength(0);
      expect(result.alreadyExists).toHaveLength(1);
    });

    it('should handle createExemptions when Course.exists throws error', async () => {
      const originalExists = Course.exists;
      Course.exists = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(userController.createExemptions(['COMP999'], testUser._id.toString()))
        .rejects.toThrow('Database error');

      Course.exists = originalExists;
    });

    it('should handle deleteUser when deleteById returns error without message', async () => {
      const originalDeleteById = userController.deleteById;
      userController.deleteById = jest.fn().mockResolvedValue({
        success: false,
        error: null
      });

      await expect(userController.deleteUser(testUser._id.toString()))
        .rejects.toThrow('User with this id does not exist');

      userController.deleteById = originalDeleteById;
    });

    it('should handle updateUser when updateById returns error without message', async () => {
      const originalUpdateById = userController.updateById;
      userController.updateById = jest.fn().mockResolvedValue({
        success: false,
        error: null
      });

      await expect(userController.updateUser(testUser._id.toString(), { fullname: 'Updated' }))
        .rejects.toThrow('User with this id does not exist');

      userController.updateById = originalUpdateById;
    });

    it('should handle getUserById when findById returns error without message', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: null
      });

      await expect(userController.getUserById('fake123'))
        .rejects.toThrow('User with this id does not exist');

      userController.findById = originalFindById;
    });

    it('should handle getAllDeficienciesByUser when findById returns error without message', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: null
      });

      await expect(userController.getAllDeficienciesByUser('fake123'))
        .rejects.toThrow('User does not exist');

      userController.findById = originalFindById;
    });

    it('should handle getAllExemptionsByUser when findById returns error without message', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: null
      });

      await expect(userController.getAllExemptionsByUser('fake123'))
        .rejects.toThrow(`User with id 'fake123' does not exist`);

      userController.findById = originalFindById;
    });

    it('should handle createExemptions when findById returns error without message', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: null
      });

      await expect(userController.createExemptions(['COMP101'], 'fake123'))
        .rejects.toThrow(`User with id 'fake123' does not exist`);

      userController.findById = originalFindById;
    });
  });
});
