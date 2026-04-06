const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { AdminController } = require('../controllers/adminController');
const { User } = require('../models/user');
const { Course } = require('../models/course');
const { DatabaseConnectionError } = require('@utils/errors');

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

  describe('getConnectionStatus', () => {
    it('should return correct connection status', () => {
      const status = adminController.getConnectionStatus();
      expect(status).toHaveProperty('connected', true);
      expect(status).toHaveProperty('readyState', 1);
      expect(status).toHaveProperty('name', mongoose.connection.name);
    });
  });
});