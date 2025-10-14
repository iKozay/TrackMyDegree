/* eslint-disable */
/* eslint-disable */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');
const { User } = require('../../dist/models/User');
const { Timeline } = require('../../dist/models/Timeline');
const { Feedback } = require('../../dist/models/Feedback');
const { Course } = require('../../dist/models/Course');
const { Degree } = require('../../dist/models/Degree');

// Mock backup directory
const BACKUP_DIR = path.join(__dirname, '../../test-backups');
process.env.BACKUP_DIR = BACKUP_DIR;

const {
  adminController,
} = require('../../dist/controllers/adminController/adminController_mongo');

describe('Admin Controller', () => {
  let mongoServer, mongoUri;
  let mockReq, mockRes, mockNext;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean up
    await mongoose.disconnect();
    await mongoServer.stop();

    // Remove test backup directory
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR);
      files.forEach((file) => {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
      });
      fs.rmdirSync(BACKUP_DIR);
    }
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await User.deleteMany({});
    await Timeline.deleteMany({});
    await Feedback.deleteMany({});
    await Course.deleteMany({});
    await Degree.deleteMany({});

    // Clear backup directory
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR);
      files.forEach((file) => {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
      });
    }

    // Setup mock request, response, and next
    mockReq = {
      body: {},
      params: {},
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('createBackup', () => {
    test('should create backup successfully with user data', async () => {
      // Seed some test data
      await User.create({
        _id: 'user1',
        email: 'test@example.com',
        password: 'hashedpass',
        fullname: 'Test User',
        type: 'student',
      });

      await Feedback.create({
        user_id: 'user1',
        message: 'Test feedback',
      });

      await Timeline.create({
        _id: 'timeline1',
        userId: 'user1',
        name: 'My Timeline',
        items: [],
      });

      // Create backup
      await adminController.createBackup(mockReq, mockRes, mockNext);

      // Verify response
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('message', 'Backup created');
      expect(response).toHaveProperty('data');
      expect(typeof response.data).toBe('string');
      expect(response.data).toMatch(/^backup-.*\.json$/);
    });

    test('should create backup even with empty collections', async () => {
      await adminController.createBackup(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('message', 'Backup created');
      expect(response).toHaveProperty('data');
      expect(typeof response.data).toBe('string');
      expect(response.data).toMatch(/^backup-.*\.json$/);
    });

    test('should handle errors during backup creation', async () => {
      // Close mongoose connection to force error
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      await adminController.createBackup(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('error');

      // Restore connection
      mongoose.connection.db = originalDb;
    });
  });

  describe('listBackups', () => {
    test('should list all backup files', async () => {
      // Create some test backup files
      const backup1 = { users: [], timelines: [], feedback: [] };
      const backup2 = { users: [], timelines: [], feedback: [] };

      fs.writeFileSync(
        path.join(BACKUP_DIR, 'backup-2024-01-01.json'),
        JSON.stringify(backup1),
      );
      fs.writeFileSync(
        path.join(BACKUP_DIR, 'backup-2024-01-02.json'),
        JSON.stringify(backup2),
      );

      await adminController.listBackups(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThanOrEqual(2);
    });

    test('should return empty array when no backups exist', async () => {
      await adminController.listBackups(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('restoreBackup', () => {
    test('should restore backup successfully', async () => {
      // Create test data
      const backupData = {
        users: [
          {
            _id: 'user1',
            email: 'restored@example.com',
            password: 'hashedpass',
            fullname: 'Restored User',
            type: 'student',
            deficiencies: [],
            exemptions: [],
          },
        ],
        timelines: [
          {
            _id: 'timeline1',
            userId: 'user1',
            name: 'Restored Timeline',
            items: [],
            isExtendedCredit: false,
          },
        ],
        feedback: [],
      };

      const backupFileName = 'backup-test-restore.json';
      fs.writeFileSync(
        path.join(BACKUP_DIR, backupFileName),
        JSON.stringify(backupData),
      );

      mockReq.body = { file: backupFileName };

      await adminController.restoreBackup(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty(
        'message',
        'Backup restored successfully',
      );

      // Verify restored data
      const users = await User.find({});
      expect(users).toHaveLength(1);
      expect(users[0]._id).toBe('user1');
    }, 30000);

    test('should return error when backup file is missing', async () => {
      mockReq.body = { file: 'nonexistent-backup.json' };

      await adminController.restoreBackup(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('error');
    });

    test('should return error when file parameter is missing', async () => {
      mockReq.body = {};

      await adminController.restoreBackup(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('error');
    });
  });

  describe('deleteBackup', () => {
    test('should delete backup file successfully', async () => {
      const backupFileName = 'backup-to-delete.json';
      const backupPath = path.join(BACKUP_DIR, backupFileName);

      // Create backup file
      fs.writeFileSync(
        backupPath,
        JSON.stringify({ users: [], timelines: [], feedback: [] }),
      );
      expect(fs.existsSync(backupPath)).toBe(true);

      mockReq.body = { file: backupFileName };

      await adminController.deleteBackup(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('message', 'Backup deleted');

      // Verify file is deleted
      expect(fs.existsSync(backupPath)).toBe(false);
    });

    test('should return error when backup file does not exist', async () => {
      mockReq.body = { file: 'nonexistent.json' };

      await adminController.deleteBackup(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('error');
    });

    test('should return error when file parameter is missing', async () => {
      mockReq.body = {};

      await adminController.deleteBackup(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('error');
    });
  });

  describe('getCollections', () => {
    test('should return list of all collections', async () => {
      // Create some collections by inserting data
      await User.create({
        _id: 'user1',
        email: 'test@example.com',
        password: 'pass',
        fullname: 'Test',
        type: 'student',
      });
      await Course.create({
        _id: 'COMP101',
        title: 'Intro to Programming',
        credits: 3,
        description: 'Test course',
      });

      await adminController.getCollections(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data');
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    test('should handle database connection errors', async () => {
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      await adminController.getCollections(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty(
        'message',
        'Database connection not available',
      );

      mongoose.connection.db = originalDb;
    });
  });

  describe('getCollectionDocuments', () => {
    test('should return all documents from a collection', async () => {
      // Create test users
      await User.create([
        {
          _id: 'user1',
          email: 'user1@example.com',
          password: 'pass',
          fullname: 'User One',
          type: 'student',
        },
        {
          _id: 'user2',
          email: 'user2@example.com',
          password: 'pass',
          fullname: 'User Two',
          type: 'advisor',
        },
      ]);

      mockReq.params = { collectionName: 'users' };

      await adminController.getCollectionDocuments(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data');
      expect(response.data).toHaveLength(2);
    });

    test('should filter documents by keyword', async () => {
      await User.create([
        {
          _id: 'user1',
          email: 'john@example.com',
          password: 'pass',
          fullname: 'John Doe',
          type: 'student',
        },
        {
          _id: 'user2',
          email: 'jane@example.com',
          password: 'pass',
          fullname: 'Jane Smith',
          type: 'student',
        },
      ]);

      mockReq.params = { collectionName: 'users' };
      mockReq.query = { keyword: 'john' };

      await adminController.getCollectionDocuments(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.data).toHaveLength(1);
      expect(response.data[0].email).toBe('john@example.com');
    });

    test('should return empty array for non-existent collection', async () => {
      mockReq.params = { collectionName: 'nonexistent' };

      await adminController.getCollectionDocuments(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.data).toHaveLength(0);
    });

    test('should handle database connection errors', async () => {
      mockReq.params = { collectionName: 'users' };

      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      await adminController.getCollectionDocuments(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('success', false);

      mongoose.connection.db = originalDb;
    });
  });
});
