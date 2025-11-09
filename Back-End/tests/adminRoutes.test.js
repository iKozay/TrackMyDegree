const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const request = require('supertest');
const { Course } = require('../models/course');
const { User } = require('../models/user');

// Mock auth middleware
jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (req, res, next) => next(),
  adminCheckMiddleware: (req, res, next) => next(),
}));

const adminRoutes = require('../routes/adminRoutes').default;

// Create test app
const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);

// Mock seeding controller so routes that trigger seeding don't perform real work
jest.mock('../controllers/seedingController', () => ({
  seedDegreeData: jest.fn().mockResolvedValue(undefined),
  seedAllDegreeData: jest.fn().mockResolvedValue(undefined),
}));

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
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('GET /admin/collections', () => {
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

    it('should get all collections', async () => {
      const response = await request(app).get('/admin/collections').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toContain('users');
      expect(response.body.data).toContain('courses');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle database connection errors', async () => {
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      const response = await request(app).get('/admin/collections').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not available');

      mongoose.connection.db = originalDb;
    });

    it('should handle server errors', async () => {
      // Mock adminController.getCollections to throw an error
      const originalGetCollections =
        require('../controllers/adminController')
          .adminController.getCollections;
      require('../controllers/adminController').adminController.getCollections =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/admin/collections').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');

      // Restore original method
      require('../controllers/adminController').adminController.getCollections =
        originalGetCollections;
    });

    it('should handle general errors not containing "not available"', async () => {
      // Mock adminController.getCollections to throw a general error
      const originalGetCollections =
        require('../controllers/adminController')
          .adminController.getCollections;
      require('../controllers/adminController').adminController.getCollections =
        jest.fn().mockRejectedValue(new Error('Some other error'));

      const response = await request(app).get('/admin/collections').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');

      // Restore original method
      require('../controllers/adminController').adminController.getCollections =
        originalGetCollections;
    });
  });

  describe('GET /admin/collections/:collectionName/documents', () => {
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

    it('should get documents from collection', async () => {
      const response = await request(app)
        .get('/admin/collections/users/documents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('_id');
      expect(response.body.data[0]).toHaveProperty('email');
      expect(response.body.data[0]).toHaveProperty('fullname');
      expect(response.body.data[0]).toHaveProperty('type');
    });

    it('should filter documents by keyword', async () => {
      const response = await request(app)
        .get('/admin/collections/users/documents?keyword=admin')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].email).toBe('admin@example.com');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/admin/collections/users/documents?page=1&limit=2')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });

    it('should return empty array for non-existent collection', async () => {
      const response = await request(app)
        .get('/admin/collections/nonexistent/documents')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should handle server errors', async () => {
      // Mock adminController.getCollectionDocuments to throw an error
      const originalGetCollectionDocuments =
        require('../controllers/adminController')
          .adminController.getCollectionDocuments;
      require('../controllers/adminController').adminController.getCollectionDocuments =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/admin/collections/users/documents')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');

      // Restore original method
      require('../controllers/adminController').adminController.getCollectionDocuments =
        originalGetCollectionDocuments;
    });
  });


  describe('DELETE /admin/collections/:collectionName/clear', () => {
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
      const response = await request(app)
        .delete('/admin/collections/users/clear')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('documents cleared successfully');

      // Verify documents are deleted
      const remainingUsers = await User.find({});
      expect(remainingUsers).toHaveLength(0);
    });

    it('should return 0 for non-existent collection', async () => {
      const response = await request(app)
        .delete('/admin/collections/nonexistent/clear')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('documents cleared successfully');
    });

    it('should handle database connection errors', async () => {
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      const response = await request(app)
        .delete('/admin/collections/users/clear')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not available');

      mongoose.connection.db = originalDb;
    });

    it('should handle server errors', async () => {
      // Mock adminController.clearCollection to throw an error
      const originalClearCollection =
        require('../controllers/adminController')
          .adminController.clearCollection;
      require('../controllers/adminController').adminController.clearCollection =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/admin/collections/users/clear')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');

      // Restore original method
      require('../controllers/adminController').adminController.clearCollection =
        originalClearCollection;
    });

    it('should handle general errors not containing "not available"', async () => {
      const originalClearCollection =
        require('../controllers/adminController')
          .adminController.clearCollection;
      require('../controllers/adminController').adminController.clearCollection =
        jest.fn().mockRejectedValue(new Error('Some other error'));

      const response = await request(app)
        .delete('/admin/collections/users/clear')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');

      require('../controllers/adminController').adminController.clearCollection =
        originalClearCollection;
    });
  });


  describe('GET /admin/seed-data', () => {
    it('should seed data for all degrees', async () => {
      const response = await request(app)
        .get('/admin/seed-data')
        .expect(200);

      expect(response.body.message).toBe('Data seeded for all degrees');
    });
  });

  describe('GET /admin/seed-data/:degree-name', () => {
    it('should seed data for a specific degree', async () => {
      const response = await request(app)
        .get('/admin/seed-data/Computer Science')
        .expect(200);

      expect(response.body.message).toBe('Data seeded for degree Computer Science');
    });
  });

  describe('Edge Cases', () => {
    describe('getCollectionDocuments edge cases', () => {
      beforeEach(async () => {
        await User.create([
          {
            email: 'test1@example.com',
            password: 'pass1',
            fullname: 'Test User 1',
            type: 'student',
          },
          {
            email: 'test2@example.com',
            password: 'pass2',
            fullname: 'Test User 2',
            type: 'student',
          },
          {
            email: 'admin@example.com',
            password: 'pass3',
            fullname: 'Admin User',
            type: 'admin',
          },
        ]);
      });

      it('should handle pagination with keyword', async () => {
        const response = await request(app)
          .get('/admin/collections/users/documents?keyword=test&page=1&limit=1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeLessThanOrEqual(1);
      });

      it('should handle empty collection with keyword search', async () => {
        await User.deleteMany({});

        const response = await request(app)
          .get('/admin/collections/users/documents?keyword=test')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
      });
    });

    describe('AdminController - Direct Tests', () => {
      let { adminController } = require('../controllers/adminController');

      describe('getCollectionDocuments', () => {
        beforeEach(async () => {
          await User.create([
            {
              email: 'test1@example.com',
              password: 'pass1',
              fullname: 'Test User 1',
              type: 'student',
            },
            {
              email: 'test2@example.com',
              password: 'pass2',
              fullname: 'Test User 2',
              type: 'student',
            },
          ]);
        });

        it('should handle projection correctly', async () => {
          const documents = await adminController.getCollectionDocuments(
            'users',
            {
              select: ['email', 'type'],
            },
          );

          expect(documents).toBeDefined();
          expect(documents.length).toBeGreaterThan(0);
          documents.forEach((doc) => {
            expect(doc).toHaveProperty('email');
            expect(doc).toHaveProperty('type');
            expect(doc).not.toHaveProperty('fullname');
          });
        });

        it('should handle database connection errors', async () => {
          const originalDb = mongoose.connection.db;
          mongoose.connection.db = null;

          await expect(
            adminController.getCollectionDocuments('users', {}),
          ).rejects.toThrow('Database connection not available');

          mongoose.connection.db = originalDb;
        });
      });


      describe('clearCollection', () => {
        it('should handle database connection errors', async () => {
          const originalDb = mongoose.connection.db;
          mongoose.connection.db = null;

          await expect(
            adminController.clearCollection('users'),
          ).rejects.toThrow('Database connection not available');

          mongoose.connection.db = originalDb;
        });
      });

      describe('getCollections', () => {
        it('should handle database connection errors', async () => {
          const originalDb = mongoose.connection.db;
          mongoose.connection.db = null;

          await expect(adminController.getCollections()).rejects.toThrow(
            'Database connection not available',
          );

          mongoose.connection.db = originalDb;
        });
      });

      describe('GET /admin/connection-status', () => {
        it('should get database connection status', async () => {
          const response = await request(app)
            .get('/admin/connection-status')
            .expect(200);

          expect(response.body.message).toBe(
            'Connection status retrieved successfully',
          );
          expect(response.body).toHaveProperty('connected');
          expect(response.body).toHaveProperty('readyState');
          expect(response.body).toHaveProperty('name');
        });

        it('should handle server errors', async () => {
          // Mock adminController.getConnectionStatus to throw an error
          const originalGetConnectionStatus =
            require('../controllers/adminController')
              .adminController.getConnectionStatus;
          require('../controllers/adminController').adminController.getConnectionStatus =
            jest.fn().mockImplementation(() => {
              throw new Error('Database error');
            });

          const response = await request(app)
            .get('/admin/connection-status')
            .expect(500);

          expect(response.body.error).toBe('Internal server error');

          // Restore original method
          require('../controllers/adminController').adminController.getConnectionStatus =
            originalGetConnectionStatus;
        });
      });
    });
  });
});