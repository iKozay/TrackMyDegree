const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { UserController } = require('../controllers/userController');
const { User } = require('../models/user');
const { Timeline } = require('../models/timeline');

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
      };

      const result = await userController.createUser(userData);

      expect(result).toMatchObject({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
      expect(result._id).toBeDefined();
    });

    it('should throw error when user with email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullname: 'Test User',
        type: 'student',
      };

      // Create first user
      await userController.createUser(userData);

      // Try to create second user with same email
      await expect(userController.createUser(userData)).rejects.toThrow(
        'User with this email already exists',
      );
    });

    it('should handle database errors', async () => {
      // Mock userController.exists to throw an error
      const originalExists = userController.exists;
      userController.exists = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullname: 'Test User',
        type: 'student',
      };

      await expect(userController.createUser(userData)).rejects.toThrow(
        'Database connection failed',
      );

      // Restore original method
      userController.exists = originalExists;
    });

    it('should reject unsupported user types', async () => {
      await expect(
        userController.createUser({
          email: 'admin@example.com',
          fullname: 'Admin',
          type: 'admin',
        }),
      ).rejects.toThrow('User type (admin) is not supported');
    });

  });

  describe('getUserById', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should get user by ID', async () => {
      const result = await userController.getUserById(testUser._id.toString());

      expect(result).toMatchObject({
        _id: testUser._id,
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.getUserById(fakeId)).rejects.toThrow(
        'User with this id does not exist',
      );
    });

    it('should handle database errors', async () => {
      // Mock userController.findById to throw an error
      const originalFindById = userController.findById;
      userController.findById = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        userController.getUserById(testUser._id.toString()),
      ).rejects.toThrow('Database connection failed');

      // Restore original method
      userController.findById = originalFindById;
    });
  });

  describe('getAllUsers', () => {
    beforeEach(async () => {
      await User.create([
        {
          _id: new mongoose.Types.ObjectId().toString(),
          email: 'user1@example.com',
          fullname: 'User One',
          type: 'student',
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          email: 'user2@example.com',
          fullname: 'User Two',
          type: 'advisor',
        },
      ]);
    });

    it('should get all users', async () => {
      const result = await userController.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('_id');
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('fullname');
      expect(result[0]).toHaveProperty('type');
    });

    it('should return empty array when no users exist', async () => {
      await User.deleteMany({});
      const result = await userController.getAllUsers();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Mock userController.findAll to throw an error
      const originalFindAll = userController.findAll;
      userController.findAll = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(userController.getAllUsers()).rejects.toThrow(
        'Database connection failed',
      );

      // Restore original method
      userController.findAll = originalFindAll;
    });
  });

  describe('updateUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should update user successfully', async () => {
      const updates = { fullname: 'Updated Name'};
      const result = await userController.updateUser(
        testUser._id.toString(),
        updates,
      );

      expect(result.fullname).toBe('Updated Name');
      expect(result.email).toBe('test@example.com'); // Should remain unchanged
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updates = { fullname: 'Updated Name' };

      await expect(userController.updateUser(fakeId, updates)).rejects.toThrow(
        'User with this id does not exist',
      );
    });

    it('should handle database errors', async () => {
      // Mock userController.updateById to throw an error
      const originalUpdateById = userController.updateById;
      userController.updateById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      const updates = { fullname: 'Updated Name' };
      await expect(
        userController.updateUser(testUser._id.toString(), updates),
      ).rejects.toThrow('User with this id does not exist');

      // Restore original method
      userController.updateById = originalUpdateById;
    });
    it('should ignore attempts to update user type', async () => {
    const originalType = testUser.type;

    const result = await userController.updateUser(
      testUser._id.toString(),
      {
        type: 'advisor', // attempt to escalate privileges
        fullname: 'Still Allowed Update',
      },
    );

    // Allowed fields should update
    expect(result.fullname).toBe('Still Allowed Update');

    // Type should remain unchanged in the database
    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser.type).toBe(originalType);
  });

  });

  describe('deleteUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should delete user successfully', async () => {
      const result = await userController.deleteUser(testUser._id.toString());

      expect(result).toBe(
        `User with id ${testUser._id} has been successfully deleted.`,
      );

      // Verify user is deleted
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.deleteUser(fakeId)).rejects.toThrow(
        'User with this id does not exist',
      );
    });

    it('should handle database errors', async () => {
      // Mock userController.deleteById to throw an error
      const originalDeleteById = userController.deleteById;
      userController.deleteById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      await expect(
        userController.deleteUser(testUser._id.toString()),
      ).rejects.toThrow('User with this id does not exist');

      // Restore original method
      userController.deleteById = originalDeleteById;
    });
  });

  describe('getUserData', () => {
    let testUser, testTimeline;
    beforeEach(async () => {
        testUser = await User.create({
          _id: new mongoose.Types.ObjectId().toString(),
          email: 'test@example.com',
          fullname: 'Test User',
          type: 'student',
        });

        testTimeline = await Timeline.create({
          userId: testUser._id.toString(),
          degreeId: 'COMP',
          name: 'Test Timeline',
          isExtendedCredit: false,
          isCoop: false,
        });
      });

      it('should get user data with timelines', async () => {
        const result = await userController.getUserData(testUser._id.toString());

        expect(result.user.email).toBe('test@example.com');
        expect(result.timelines).toHaveLength(1);
        expect(result.timelines[0]).toMatchObject({
          _id: expect.any(String),
          degreeId: 'COMP',
          name: 'Test Timeline',
          isExtendedCredit: false,
          isCoop: false,
        })
      });

   
    it('should handle user with no timeline', async () => {
      await Timeline.deleteMany({});
      const result = await userController.getUserData(testUser._id.toString());

      expect(result.timelines).toHaveLength(0);
      expect(result.timelines).toEqual([]);
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userController.getUserData(fakeId)).rejects.toThrow(
        'User with this id does not exist',
      );
    });

    it('should handle database errors', async () => {
      // Mock userController.findById to throw an error
      const originalFindById = userController.findById;
      userController.findById = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        userController.getUserData(testUser._id.toString()),
      ).rejects.toThrow('Database connection failed');

      // Restore original method
      userController.findById = originalFindById;
    });
  });

  describe('Additional Edge Cases for Coverage', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should handle createUser when exists check returns data', async () => {
      const originalExists = userController.exists;
      userController.exists = jest.fn().mockResolvedValue({
        success: true,
        data: true,
      });

      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        fullname: 'Duplicate User',
        type: 'student',
      };

      await expect(userController.createUser(userData)).rejects.toThrow(
        'User with this email already exists',
      );

      userController.exists = originalExists;
    });

    it('should handle createUser when create returns error without message', async () => {
      const originalExists = userController.exists;
      const originalCreate = userController.create;

      userController.exists = jest
        .fn()
        .mockResolvedValue({ success: true, data: false });
      userController.create = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      const userData = {
        email: 'test2@example.com',
        password: 'password123',
        fullname: 'Test User 2',
        type: 'student',
      };

      await expect(userController.createUser(userData)).rejects.toThrow(
        'Failed to create user',
      );

      userController.exists = originalExists;
      userController.create = originalCreate;
    });

    it('should handle getAllUsers when findAll returns null data', async () => {
      const originalFindAll = userController.findAll;
      userController.findAll = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await userController.getAllUsers();
      expect(result).toEqual([]);

      userController.findAll = originalFindAll;
    });

    it('should handle getAllUsers when findAll returns error without message', async () => {
      const originalFindAll = userController.findAll;
      userController.findAll = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      await expect(userController.getAllUsers()).rejects.toThrow(
        'Failed to fetch users',
      );

      userController.findAll = originalFindAll;
    });

    it('should handle getUserData when findById returns error without data', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockResolvedValue({
        success: false,
        data: null,
      });

      await expect(userController.getUserData('fake123')).rejects.toThrow(
        'User with this id does not exist',
      );

      userController.findById = originalFindById;
    });

    it('should handle deleteUser when deleteById returns error without message', async () => {
      const originalDeleteById = userController.deleteById;
      userController.deleteById = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      await expect(
        userController.deleteUser(testUser._id.toString()),
      ).rejects.toThrow('User with this id does not exist');

      userController.deleteById = originalDeleteById;
    });

    it('should handle updateUser when updateById returns error without message', async () => {
      const originalUpdateById = userController.updateById;
      userController.updateById = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      await expect(
        userController.updateUser(testUser._id.toString(), {
          fullname: 'Updated',
        }),
      ).rejects.toThrow('User with this id does not exist');

      userController.updateById = originalUpdateById;
    });

    it('should handle getUserById when findById returns error without message', async () => {
      const originalFindById = userController.findById;
      userController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: null,
      });

      await expect(userController.getUserById('fake123')).rejects.toThrow(
        'User with this id does not exist',
      );

      userController.findById = originalFindById;
    });
  });
});
