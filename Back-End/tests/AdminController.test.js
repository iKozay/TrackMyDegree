const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  AdminController,
} = require('../controllers/mondoDBControllers/AdminController');
const { User } = require('../models/User');
const { Course } = require('../models/Course');

describe('AdminController', () => {
  let mongoServer, mongoUri, adminController;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    adminController = new AdminController();
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
  });

  describe('Constructor', () => {
    it('should initialize with null model and Admin name', () => {
      expect(adminController.model).toBeNull();
      expect(adminController.modelName).toBe('Admin');
    });
  });

  describe('getCollections', () => {
    beforeEach(async () => {
      // Create some documents to ensure collections exist
      await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
      await Course.create({
        _id: 'COMP101',
        title: 'Introduction to Programming',
        credits: 3,
        description: 'Test description',
      });
    });

    it('should get all collections in database', async () => {
      const result = await adminController.getCollections();

      expect(result).toContain('users');
      expect(result).toContain('courses');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle database connection errors', async () => {
      // Mock mongoose.connection.db to be null
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      await expect(adminController.getCollections()).rejects.toThrow(
        'Database connection not available',
      );

      // Restore original db
      mongoose.connection.db = originalDb;
    });

    it('should handle database errors gracefully', async () => {
      // Mock db.listCollections to throw an error
      const originalDb = mongoose.connection.db;
      const mockDb = {
        listCollections: jest.fn().mockImplementation(() => {
          throw new Error('Database error');
        }),
      };
      mongoose.connection.db = mockDb;

      await expect(adminController.getCollections()).rejects.toThrow(
        'Error fetching collections',
      );

      // Restore original db
      mongoose.connection.db = originalDb;
    });
  });

  describe('getCollectionDocuments', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'user1@example.com',
          fullname: 'User One',
          type: 'student',
        },
        {
          email: 'user2@example.com',
          fullname: 'User Two',
          type: 'advisor',
        },
        {
          email: 'admin@example.com',
          fullname: 'Admin User',
          type: 'admin',
        },
      ]);
    });

    it('should get all documents from collection', async () => {
      const result = await adminController.getCollectionDocuments('users');

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('fullname');
      expect(result[0]).toHaveProperty('type');
    });

    it('should paginate results', async () => {
      const result = await adminController.getCollectionDocuments('users', {
        page: 1,
        limit: 2,
      });

      expect(result).toHaveLength(2);
    });

    it('should filter by keyword', async () => {
      const result = await adminController.getCollectionDocuments('users', {
        keyword: 'admin',
      });

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('admin@example.com');
    });

    it('should select specific fields', async () => {
      const result = await adminController.getCollectionDocuments('users', {
        select: ['email', 'type'],
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).not.toHaveProperty('fullname');
    });

    it('should return empty array for non-existent collection', async () => {
      const result =
        await adminController.getCollectionDocuments('nonexistent');

      expect(result).toHaveLength(0);
    });

    it('should handle database connection errors', async () => {
      // Mock mongoose.connection.db to be null
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      await expect(
        adminController.getCollectionDocuments('users'),
      ).rejects.toThrow('Database connection not available');

      // Restore original db
      mongoose.connection.db = originalDb;
    });

    it('should handle database errors gracefully', async () => {
      // Mock db.collection to throw an error
      const originalDb = mongoose.connection.db;
      const mockDb = {
        collection: jest.fn().mockImplementation(() => {
          throw new Error('Collection error');
        }),
      };
      mongoose.connection.db = mockDb;

      await expect(
        adminController.getCollectionDocuments('users'),
      ).rejects.toThrow('Error fetching documents from collection');

      // Restore original db
      mongoose.connection.db = originalDb;
    });
  });

  describe('getCollectionStats', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'user1@example.com',
          fullname: 'User One',
          type: 'student',
        },
        {
          email: 'user2@example.com',
          fullname: 'User Two',
          type: 'advisor',
        },
      ]);
    });

    it('should get collection statistics', async () => {
      const result = await adminController.getCollectionStats('users');

      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('avgDocSize');
      expect(result.count).toBe(2);
      expect(typeof result.size).toBe('number');
      expect(typeof result.avgDocSize).toBe('number');
    });

    it('should handle non-existent collection', async () => {
      const result = await adminController.getCollectionStats('nonexistent');

      expect(result.count).toBe(0);
      expect(result.size).toBe(0);
      expect(result.avgDocSize).toBe(0);
    });

    it('should handle database connection errors', async () => {
      // Mock mongoose.connection.db to be null
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      await expect(adminController.getCollectionStats('users')).rejects.toThrow(
        'Database connection not available',
      );

      // Restore original db
      mongoose.connection.db = originalDb;
    });

    it('should handle database errors gracefully', async () => {
      // Mock db.command to throw an error
      const originalDb = mongoose.connection.db;
      const mockDb = {
        command: jest.fn().mockImplementation(() => {
          throw new Error('Command error');
        }),
      };
      mongoose.connection.db = mockDb;

      await expect(adminController.getCollectionStats('users')).rejects.toThrow(
        'Error fetching collection statistics',
      );

      // Restore original db
      mongoose.connection.db = originalDb;
    });
  });

  describe('clearCollection', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'user1@example.com',
          fullname: 'User One',
          type: 'student',
        },
        {
          email: 'user2@example.com',
          fullname: 'User Two',
          type: 'advisor',
        },
      ]);
    });

    it('should clear all documents from collection', async () => {
      const result = await adminController.clearCollection('users');

      expect(result).toBe(2);

      // Verify documents are deleted
      const remainingUsers = await User.find({});
      expect(remainingUsers).toHaveLength(0);
    });

    it('should return 0 for non-existent collection', async () => {
      const result = await adminController.clearCollection('nonexistent');

      expect(result).toBe(0);
    });

    it('should handle database connection errors', async () => {
      // Mock mongoose.connection.db to be null
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      await expect(adminController.clearCollection('users')).rejects.toThrow(
        'Database connection not available',
      );

      // Restore original db
      mongoose.connection.db = originalDb;
    });

    it('should handle database errors gracefully', async () => {
      // Mock db.collection to throw an error
      const originalDb = mongoose.connection.db;
      const mockDb = {
        collection: jest.fn().mockImplementation(() => {
          throw new Error('Collection error');
        }),
      };
      mongoose.connection.db = mockDb;

      await expect(adminController.clearCollection('users')).rejects.toThrow(
        'Error clearing collection',
      );

      // Restore original db
      mongoose.connection.db = originalDb;
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status when connected', () => {
      const result = adminController.getConnectionStatus();

      expect(result).toHaveProperty('connected');
      expect(result).toHaveProperty('readyState');
      expect(result).toHaveProperty('name');
      expect(result.connected).toBe(true);
      expect(result.readyState).toBe(1);
      expect(typeof result.name).toBe('string');
    });

    it('should return connection status when disconnected', async () => {
      // Disconnect from database
      await mongoose.disconnect();

      const result = adminController.getConnectionStatus();

      expect(result.connected).toBe(false);
      expect(result.readyState).not.toBe(1);

      // Reconnect for cleanup
      await mongoose.connect(mongoUri);
    });
  });

  describe('Additional Edge Cases for Coverage', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'test1@example.com',
          fullname: 'Test User 1',
          type: 'student',
        },
        {
          email: 'test2@example.com',
          fullname: 'Test User 2',
          type: 'advisor',
        },
      ]);
    });

    it('should handle getCollectionDocuments with keyword when no string fields exist', async () => {
      // Create a collection with only non-string fields
      const db = mongoose.connection.db;
      const testCollection = db.collection('numericonly');
      await testCollection.insertOne({ value: 123, count: 456 });

      const result = await adminController.getCollectionDocuments(
        'numericonly',
        {
          keyword: 'test',
        },
      );

      expect(Array.isArray(result)).toBe(true);

      // Cleanup
      await testCollection.drop();
    });

    it('should handle getCollectionDocuments with keyword when collection is empty', async () => {
      const db = mongoose.connection.db;
      const emptyCollection = db.collection('empty');

      const result = await adminController.getCollectionDocuments('empty', {
        keyword: 'test',
      });

      expect(result).toHaveLength(0);
    });

    it('should handle getCollectionStats when stats command returns undefined values', async () => {
      const originalDb = mongoose.connection.db;
      const mockDb = {
        command: jest.fn().mockResolvedValue({
          // count, size, avgObjSize are undefined
        }),
      };
      mongoose.connection.db = mockDb;

      const result = await adminController.getCollectionStats('users');

      expect(result.count).toBe(0);
      expect(result.size).toBe(0);
      expect(result.avgDocSize).toBe(0);

      mongoose.connection.db = originalDb;
    });

    it('should handle clearCollection when result has undefined deletedCount', async () => {
      const originalDb = mongoose.connection.db;
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          deleteMany: jest.fn().mockResolvedValue({
            // deletedCount is undefined
          }),
        }),
      };
      mongoose.connection.db = mockDb;

      const result = await adminController.clearCollection('users');

      expect(result).toBe(0);

      mongoose.connection.db = originalDb;
    });
  });
});
