const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const adminRoutes = require('../dist/routes/mongo/adminRoutes').default;
const { User } = require('../dist/models/User');
const { Course } = require('../dist/models/Course');

// Create test app
const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);

describe('Admin Routes', () => {
  let mongoServer, mongoUri;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
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

  describe('GET /admin/collections', () => {
    beforeEach(async () => {
      // Create some documents to ensure collections exist
      await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student'
      });
      await Course.create({
        _id: 'COMP101',
        title: 'Introduction to Programming',
        credits: 3
      });
    });

    it('should get all collections', async () => {
      const response = await request(app)
        .get('/admin/collections')
        .expect(200);

      expect(response.body.message).toBe('Collections retrieved successfully');
      expect(response.body.collections).toContain('users');
      expect(response.body.collections).toContain('courses');
      expect(Array.isArray(response.body.collections)).toBe(true);
    });

    it('should handle server errors', async () => {
      // Mock adminController.getCollections to throw an error
      const originalGetCollections = require('../dist/controllers/mondoDBControllers/AdminController').adminController.getCollections;
      require('../dist/controllers/mondoDBControllers/AdminController').adminController.getCollections = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/admin/collections')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/AdminController').adminController.getCollections = originalGetCollections;
    });
  });

  describe('GET /admin/collections/:collectionName', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'user1@example.com',
          fullname: 'User One',
          type: 'student'
        },
        {
          email: 'user2@example.com',
          fullname: 'User Two',
          type: 'advisor'
        },
        {
          email: 'admin@example.com',
          fullname: 'Admin User',
          type: 'admin'
        }
      ]);
    });

    it('should get documents from collection', async () => {
      const response = await request(app)
        .get('/admin/collections/users')
        .expect(200);

      expect(response.body.message).toBe('Documents retrieved successfully');
      expect(response.body.documents).toHaveLength(3);
      expect(response.body.documents[0]).toHaveProperty('_id');
      expect(response.body.documents[0]).toHaveProperty('email');
      expect(response.body.documents[0]).toHaveProperty('fullname');
      expect(response.body.documents[0]).toHaveProperty('type');
    });

    it('should filter documents by keyword', async () => {
      const response = await request(app)
        .get('/admin/collections/users?keyword=admin')
        .expect(200);

      expect(response.body.documents).toHaveLength(1);
      expect(response.body.documents[0].email).toBe('admin@example.com');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/admin/collections/users?page=1&limit=2')
        .expect(200);

      expect(response.body.documents).toHaveLength(2);
    });

    it('should select specific fields', async () => {
      const response = await request(app)
        .get('/admin/collections/users?select=email,type')
        .expect(200);

      expect(response.body.documents).toHaveLength(3);
      expect(response.body.documents[0]).toHaveProperty('email');
      expect(response.body.documents[0]).toHaveProperty('type');
      expect(response.body.documents[0]).not.toHaveProperty('fullname');
    });

    it('should return empty array for non-existent collection', async () => {
      const response = await request(app)
        .get('/admin/collections/nonexistent')
        .expect(200);

      expect(response.body.documents).toHaveLength(0);
    });

    it('should handle server errors', async () => {
      // Mock adminController.getCollectionDocuments to throw an error
      const originalGetCollectionDocuments = require('../dist/controllers/mondoDBControllers/AdminController').adminController.getCollectionDocuments;
      require('../dist/controllers/mondoDBControllers/AdminController').adminController.getCollectionDocuments = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/admin/collections/users')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/AdminController').adminController.getCollectionDocuments = originalGetCollectionDocuments;
    });
  });

  describe('GET /admin/collections/:collectionName/stats', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'user1@example.com',
          fullname: 'User One',
          type: 'student'
        },
        {
          email: 'user2@example.com',
          fullname: 'User Two',
          type: 'advisor'
        }
      ]);
    });

    it('should get collection statistics', async () => {
      const response = await request(app)
        .get('/admin/collections/users/stats')
        .expect(200);

      expect(response.body.message).toBe('Collection statistics retrieved successfully');
      expect(response.body.stats).toHaveProperty('count');
      expect(response.body.stats).toHaveProperty('size');
      expect(response.body.stats).toHaveProperty('avgDocSize');
      expect(response.body.stats.count).toBe(2);
      expect(typeof response.body.stats.size).toBe('number');
      expect(typeof response.body.stats.avgDocSize).toBe('number');
    });

    it('should handle non-existent collection', async () => {
      const response = await request(app)
        .get('/admin/collections/nonexistent/stats')
        .expect(200);

      expect(response.body.stats.count).toBe(0);
      expect(response.body.stats.size).toBe(0);
      expect(response.body.stats.avgDocSize).toBe(0);
    });

    it('should handle server errors', async () => {
      // Mock adminController.getCollectionStats to throw an error
      const originalGetCollectionStats = require('../dist/controllers/mondoDBControllers/AdminController').adminController.getCollectionStats;
      require('../dist/controllers/mondoDBControllers/AdminController').adminController.getCollectionStats = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/admin/collections/users/stats')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/AdminController').adminController.getCollectionStats = originalGetCollectionStats;
    });
  });

  describe('DELETE /admin/collections/:collectionName', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'user1@example.com',
          fullname: 'User One',
          type: 'student'
        },
        {
          email: 'user2@example.com',
          fullname: 'User Two',
          type: 'advisor'
        }
      ]);
    });

    it('should clear all documents from collection', async () => {
      const response = await request(app)
        .delete('/admin/collections/users')
        .expect(200);

      expect(response.body.message).toBe('Collection cleared successfully');
      expect(response.body.deletedCount).toBe(2);

      // Verify documents are deleted
      const remainingUsers = await User.find({});
      expect(remainingUsers).toHaveLength(0);
    });

    it('should return 0 for non-existent collection', async () => {
      const response = await request(app)
        .delete('/admin/collections/nonexistent')
        .expect(200);

      expect(response.body.deletedCount).toBe(0);
    });

    it('should handle server errors', async () => {
      // Mock adminController.clearCollection to throw an error
      const originalClearCollection = require('../dist/controllers/mondoDBControllers/AdminController').adminController.clearCollection;
      require('../dist/controllers/mondoDBControllers/AdminController').adminController.clearCollection = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/admin/collections/users')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/AdminController').adminController.clearCollection = originalClearCollection;
    });
  });

  describe('GET /admin/status', () => {
    it('should get database connection status', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      expect(response.body.message).toBe('Database status retrieved successfully');
      expect(response.body.status).toHaveProperty('connected');
      expect(response.body.status).toHaveProperty('readyState');
      expect(response.body.status).toHaveProperty('name');
      expect(response.body.status.connected).toBe(true);
      expect(response.body.status.readyState).toBe(1);
      expect(typeof response.body.status.name).toBe('string');
    });
  });
});
