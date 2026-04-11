const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { AdminController } = require('../controllers/adminController');
const { User } = require('../models/user');
const { Course } = require('../models/course');
const { DatabaseConnectionError } = require('@utils/errors');
const BackupService = require('../services/backup/backupService');

jest.mock('../services/backup/backupService');


describe('AdminController', () => {
  let mongoServer, mongoUri, adminController;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    adminController = new AdminController();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with null model and Admin name', () => {
      expect(adminController.model).toBeNull();
      expect(adminController.modelName).toBe('Admin');
    });
  });

  describe('getCollections', () => {
    beforeEach(async () => {
      await User.create({ email: 'test@example.com', fullname: 'Test User', type: 'student' });
      await Course.create({ _id: 'COMP101', title: 'Intro', credits: 3, description: 'Test' });
    });

    it('should return all collection names', async () => {
      const collections = await adminController.getCollections();
      expect(collections).toContain('users');
      expect(collections).toContain('courses');
    });

    it('should throw DatabaseConnectionError when db is null', async () => {
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;
      await expect(adminController.getCollections()).rejects.toThrow(DatabaseConnectionError);
      mongoose.connection.db = originalDb;
    });

    it('should throw on db errors', async () => {
      const spy = jest.spyOn(mongoose.connection.db, 'listCollections').mockImplementation(() => { throw new Error('DB error'); });
      await expect(adminController.getCollections()).rejects.toThrow('DB error');
      spy.mockRestore();
    });
  });

  describe('getCollectionDocuments', () => {
    beforeEach(async () => {
      await User.create([
        { email: 'user1@example.com', fullname: 'User One', type: 'student' },
        { email: 'user2@example.com', fullname: 'User Two', type: 'advisor' },
        { email: 'admin@example.com', fullname: 'Admin User', type: 'admin' },
      ]);
    });

    it('should return all documents', async () => {
      const docs = await adminController.getCollectionDocuments('users');
      expect(docs).toHaveLength(3);
      expect(docs[0]).toHaveProperty('email');
    });

    it('should paginate results', async () => {
      const docs = await adminController.getCollectionDocuments('users', { page: 1, limit: 2 });
      expect(docs).toHaveLength(2);
    });

    it('should filter by keyword', async () => {
      const docs = await adminController.getCollectionDocuments('users', { keyword: 'admin' });
      expect(docs).toHaveLength(1);
      expect(docs[0].email).toBe('admin@example.com');
    });

    it('should select specific fields', async () => {
      const docs = await adminController.getCollectionDocuments('users', { select: ['email', 'type'] });
      expect(docs[0]).toHaveProperty('email');
      expect(docs[0]).toHaveProperty('type');
      expect(docs[0]).not.toHaveProperty('fullname');
    });

    it('should return empty array for nonexistent collection', async () => {
      const docs = await adminController.getCollectionDocuments('nonexistent');
      expect(docs).toHaveLength(0);
    });

    it('should throw DatabaseConnectionError when db is null', async () => {
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;
      await expect(adminController.getCollectionDocuments('users')).rejects.toThrow(DatabaseConnectionError);
      mongoose.connection.db = originalDb;
    });

    it('should handle db errors gracefully', async () => {
      const spy = jest.spyOn(mongoose.connection.db, 'collection').mockImplementation(() => { throw new Error('collection error'); });
      await expect(adminController.getCollectionDocuments('users')).rejects.toThrow('collection error');
      spy.mockRestore();
    });
  });

  describe('clearCollection', () => {
    beforeEach(async () => {
      await User.create([
        { email: 'user1@example.com', fullname: 'User One', type: 'student' },
        { email: 'user2@example.com', fullname: 'User Two', type: 'advisor' },
      ]);
    });

    it('should delete all documents and return count', async () => {
      const count = await adminController.clearCollection('users');
      expect(count).toBe(2);
      const remaining = await User.find({});
      expect(remaining).toHaveLength(0);
    });

    it('should return 0 for nonexistent collection', async () => {
      const count = await adminController.clearCollection('nonexistent');
      expect(count).toBe(0);
    });

    it('should throw DatabaseConnectionError when db is null', async () => {
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;
      await expect(adminController.clearCollection('users')).rejects.toThrow(DatabaseConnectionError);
      mongoose.connection.db = originalDb;
    });

    it('should handle db errors gracefully', async () => {
      const spy = jest.spyOn(mongoose.connection.db, 'collection').mockReturnValue({ deleteMany: () => { throw new Error('delete error'); } });
      await expect(adminController.clearCollection('users')).rejects.toThrow('delete error');
      spy.mockRestore();
    });
  });

  describe('listBackups', () => {
    it('should return all available backups', async () => {
      BackupService.listBackups.mockResolvedValue([
        'backup1.json',
        'backup2.json',
      ]);

      const result = await adminController.listBackups();

      expect(result).toEqual(['backup1.json', 'backup2.json']);
      expect(BackupService.listBackups).toHaveBeenCalledTimes(1);
    });

    it('should rethrow database connection error', async () => {
      BackupService.listBackups.mockRejectedValue(
        new Error('Database connection not available'),
      );

      await expect(adminController.listBackups()).rejects.toThrow(
        'Database connection not available',
      );
    });

    it('should throw generic list backup error', async () => {
      BackupService.listBackups.mockRejectedValue(
        new Error('Random failure'),
      );

      await expect(adminController.listBackups()).rejects.toThrow(
        'Random failure',
      );
    });
  });

  describe('createBackup', () => {
    it('should create a backup successfully', async () => {
      BackupService.createBackup.mockResolvedValue('backup-new.json');

      const result = await adminController.createBackup();

      expect(result).toBe('backup-new.json');
      expect(BackupService.createBackup).toHaveBeenCalledTimes(1);
    });

    it('should throw database connection error when db is null', async () => {
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      await expect(adminController.createBackup()).rejects.toThrow(
        'Database connection not available',
      );

      mongoose.connection.db = originalDb;
    });

    it('should throw generic create backup error', async () => {
      BackupService.createBackup.mockRejectedValue(
        new Error('Backup failed'),
      );

      await expect(adminController.createBackup()).rejects.toThrow(
        'Backup failed',
      );
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup successfully', async () => {
      BackupService.deleteBackup.mockResolvedValue();

      await expect(
        adminController.deleteBackup('backup1.json'),
      ).resolves.toBeUndefined();

      expect(BackupService.deleteBackup).toHaveBeenCalledWith(
        'backup1.json',
      );
    });

    it('should rethrow database connection error', async () => {
      BackupService.deleteBackup.mockRejectedValue(
        new Error('Database connection not available'),
      );

      await expect(
        adminController.deleteBackup('backup1.json'),
      ).rejects.toThrow('Database connection not available');
    });

    it('should throw generic delete backup error', async () => {
      BackupService.deleteBackup.mockRejectedValue(
        new Error('Delete failed'),
      );

      await expect(
        adminController.deleteBackup('backup1.json'),
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('restoreBackup', () => {
    it('should restore backup successfully', async () => {
      BackupService.restoreBackup.mockResolvedValue();

      await expect(
        adminController.restoreBackup('backup1.json'),
      ).resolves.toBeUndefined();

      expect(BackupService.restoreBackup).toHaveBeenCalledWith(
        'backup1.json',
      );
    });

    it('should throw database connection error when db is null', async () => {
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      await expect(
        adminController.restoreBackup('backup1.json'),
      ).rejects.toThrow('Database connection not available');

      mongoose.connection.db = originalDb;
    });

    it('should throw generic restore backup error', async () => {
      BackupService.restoreBackup.mockRejectedValue(
        new Error('Restore failed'),
      );

      await expect(
        adminController.restoreBackup('backup1.json'),
      ).rejects.toThrow('Restore failed');
    });
  });

  describe('Additional Edge Cases for Coverage', () => {
    beforeEach(async () => {
      await User.deleteMany({}); // ensure isolation
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
      db.collection('empty');

      const result = await adminController.getCollectionDocuments('empty', {
        keyword: 'test',
      });

      expect(result).toHaveLength(0);
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
  });
});