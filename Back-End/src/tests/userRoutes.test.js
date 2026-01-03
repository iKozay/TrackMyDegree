const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const userRoutes = require('../routes/userRoutes').default;
const { User } = require('../models/user');
const { Course } = require('../models/course');
const { Degree } = require('../models/degree');
const { Timeline } = require('../models/timeline');

// Create test app
const app = express();
app.use(express.json());
app.use('/users', userRoutes);
let testUser;

describe('User Routes', () => {
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
    await Degree.deleteMany({});
    await Timeline.deleteMany({});
  });

  describe('POST /users', () => {
    it('should create new user', async () => {
      const userData = {
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP',
        deficiencies: [],
        exemptions: [],
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
      expect(response.body._id).toBeDefined();
    });

    it('should create user without optional fields', async () => {
      const userData = {
        email: 'minimal@example.com',
        fullname: 'Minimal User',
        type: 'student',
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body.email).toBe('minimal@example.com');
    });

    it('should return 400 for missing required fields', async () => {
      const userData = {
        email: 'test@example.com',
        // Missing fullname and type
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe(
        'Email, fullname, and type are required',
      );
    });

    it('should return 409 for duplicate email', async () => {
      await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'existing@example.com',
        fullname: 'Existing User',
        type: 'student',
      });

      const userData = {
        email: 'existing@example.com',
        fullname: 'New User',
        type: 'student',
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    it('should handle server errors', async () => {
      // Mock userController.createUser to throw an error
      const originalCreateUser = require('../controllers/userController')
        .userController.createUser;
      require('../controllers/userController').userController.createUser = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const userData = {
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/userController').userController.createUser =
        originalCreateUser;
    });
  });

  describe('GET /users/:id', () => {
    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should get user by ID', async () => {
      const response = await request(app)
        .get(`/users/${testUser._id}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body._id).toBeDefined();
      expect(response.body).toMatchObject({
        _id: testUser._id.toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).get(`/users/${fakeId}`).expect(404);

      expect(response.body.error).toBe('User with this id does not exist.');
    });

    it('should handle server errors', async () => {
      // Mock userController.getUserById to throw an error
      const originalGetUserById = require('../controllers/userController')
        .userController.getUserById;
      require('../controllers/userController').userController.getUserById = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/users/${testUser._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/userController').userController.getUserById =
        originalGetUserById;
    });
  });

  describe('GET /users', () => {
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
      const response = await request(app).get('/users').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('_id');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).toHaveProperty('fullname');
      expect(response.body[0]).toHaveProperty('type');
    });

    it('should handle server errors', async () => {
      // Mock userController.getAllUsers to throw an error
      const originalGetAllUsers = require('../controllers/userController')
        .userController.getAllUsers;
      require('../controllers/userController').userController.getAllUsers = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/users').expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/userController').userController.getAllUsers =
        originalGetAllUsers;
    });
  });

  describe('PUT /users/:id', () => {
    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should update user', async () => {
      const updates = {
        fullname: 'Updated Name',
        degree: 'SOEN',
      };

      const response = await request(app)
        .put(`/users/${testUser._id}`)
        .send(updates)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body._id).toBeDefined();
      expect(response.body.fullname).toBe('Updated Name');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updates = { fullname: 'Updated Name' };

      const response = await request(app)
        .put(`/users/${fakeId}`)
        .send(updates)
        .expect(404);

      expect(response.body.error).toBe('User with this id does not exist.');
    });

    it('should handle server errors', async () => {
      // Mock userController.updateUser to throw an error
      const originalUpdateUser = require('../controllers/userController')
        .userController.updateUser;
      require('../controllers/userController').userController.updateUser = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const updates = { fullname: 'Updated Name' };
      const response = await request(app)
        .put(`/users/${testUser._id}`)
        .send(updates)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/userController').userController.updateUser =
        originalUpdateUser;
    });
  });

  describe('DELETE /users/:id', () => {
    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should delete user', async () => {
      const response = await request(app)
        .delete(`/users/${testUser._id}`)
        .expect(200);

      expect(typeof response.body).toBe('string');
      expect(response.body).toContain('successfully deleted');

      // Verify user is deleted
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/users/${fakeId}`)
        .expect(404);

      expect(response.body.error).toContain('does not exist');
    });

    it('should handle server errors', async () => {
      const originalDeleteUser = require('../controllers/userController')
        .userController.deleteUser;
      require('../controllers/userController').userController.deleteUser = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/users/${testUser._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      require('../controllers/userController').userController.deleteUser =
        originalDeleteUser;
    });
  });

  describe('DELETE /users/:id additional tests', () => {
    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/users/${fakeId}`)
        .expect(404);

      expect(response.body.error).toContain('does not exist');
    });

    it('should handle server errors', async () => {
      const originalDeleteUser = require('../controllers/userController')
        .userController.deleteUser;
      require('../controllers/userController').userController.deleteUser = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/users/${testUser._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/userController').userController.deleteUser =
        originalDeleteUser;
    });
  });

   describe('GET /users/:id/data', () => {
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

      it('should get comprehensive user data', async () => {
        const response = await request(app)
          .get(`/users/${testUser._id}/data`)
          .expect(200);

        expect(response.body).toBeDefined();
        // getUserData returns nested structure: { user, timeline, deficiencies, exemptions, degree }
        expect(response.body).toBeDefined();
        expect(response.body.user).toBeDefined();
        expect(response.body.user).toMatchObject({
          _id: testUser._id.toString(),
          email: 'test@example.com',
          fullname: 'Test User',
          type: 'student',
        });
        expect(response.body.timelines[0]).toMatchObject({
          _id: expect.any(String),
          degreeId: 'COMP',
          name: 'Test Timeline',
          isExtendedCredit: false,
          isCoop: false,
        });
      });

      it('should return 404 for non-existent user', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
          .get(`/users/${fakeId}/data`)
          .expect(404);

        expect(response.body.error).toContain('does not exist');
      });

      it('should handle server errors', async () => {
        // Mock userController.getUserData to throw an error
        const originalGetUserData = require('../controllers/userController')
          .userController.getUserData;
        require('../controllers/userController').userController.getUserData =
          jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get(`/users/${testUser._id}/data`)
          .expect(500);

        expect(response.body.error).toBe('Internal server error');

        // Restore original method
        require('../controllers/userController').userController.getUserData =
          originalGetUserData;
      });
    });

   

  // Additional tests for uncovered error handling branches
  describe('Error handling edge cases', () => {
    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
      jest.clearAllMocks();
    });

    describe('POST /users error branches', () => {
      it('should handle "already exists" error specifically', async () => {
        const originalCreateUser = require('../controllers/userController')
          .userController.createUser;
        require('../controllers/userController').userController.createUser =
          jest.fn().mockRejectedValue(new Error('User already exists'));

        const response = await request(app)
          .post('/users')
          .send({
            email: 'test@example.com',
            fullname: 'Test',
            type: 'student',
          })
          .expect(409);

        expect(response.body.error).toBe('User already exists');

        require('../controllers/userController').userController.createUser =
          originalCreateUser;
      });

      it('should handle general errors (not "already exists")', async () => {
        const originalCreateUser = require('../controllers/userController')
          .userController.createUser;
        require('../controllers/userController').userController.createUser =
          jest.fn().mockRejectedValue(new Error('General error'));

        const response = await request(app)
          .post('/users')
          .send({
            email: 'test@example.com',
            fullname: 'Test',
            type: 'student',
          })
          .expect(500);

        expect(response.body.error).toBe('Internal server error');

        require('../controllers/userController').userController.createUser =
          originalCreateUser;
      });
    });

    describe('GET /users/:id error branches', () => {
      it('should handle "does not exist" error specifically', async () => {
        const originalGetUserById = require('../controllers/userController')
          .userController.getUserById;
        require('../controllers/userController').userController.getUserById =
          jest.fn().mockRejectedValue(new Error('User does not exist'));

        const response = await request(app)
          .get(`/users/${testUser._id}`)
          .expect(404);

        expect(response.body.error).toBe('User does not exist');

        require('../controllers/userController').userController.getUserById =
          originalGetUserById;
      });

      it('should handle general errors (not "does not exist")', async () => {
        const originalGetUserById = require('../controllers/userController')
          .userController.getUserById;
        require('../controllers/userController').userController.getUserById =
          jest.fn().mockRejectedValue(new Error('General error'));

        const response = await request(app)
          .get(`/users/${testUser._id}`)
          .expect(500);

        expect(response.body.error).toBe('Internal server error');

        require('../controllers/userController').userController.getUserById =
          originalGetUserById;
      });
    });

    describe('GET /users error branch', () => {
      it('should handle general errors', async () => {
        const originalGetAllUsers = require('../controllers/userController')
          .userController.getAllUsers;
        require('../controllers/userController').userController.getAllUsers =
          jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app).get('/users').expect(500);

        expect(response.body.error).toBe('Internal server error');

        require('../controllers/userController').userController.getAllUsers =
          originalGetAllUsers;
      });
    });

    describe('PUT /users/:id error branches', () => {
      it('should handle "does not exist" error specifically', async () => {
        const originalUpdateUser = require('../controllers/userController')
          .userController.updateUser;
        require('../controllers/userController').userController.updateUser =
          jest.fn().mockRejectedValue(new Error('User does not exist'));

        const response = await request(app)
          .put(`/users/${testUser._id}`)
          .send({ fullname: 'Updated' })
          .expect(404);

        expect(response.body.error).toBe('User does not exist');

        require('../controllers/userController').userController.updateUser =
          originalUpdateUser;
      });
      
      it('returns 400 if id is not a valid ObjectId', async () => {
        const res = await request(app)
          .put('/users/123')
          .send({ fullname: 'New Name' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid user id format');
      });


      it('should handle general errors (not "does not exist")', async () => {
        const originalUpdateUser = require('../controllers/userController')
          .userController.updateUser;
        require('../controllers/userController').userController.updateUser =
          jest.fn().mockRejectedValue(new Error('General error'));

        const response = await request(app)
          .put(`/users/${testUser._id}`)
          .send({ fullname: 'Updated' })
          .expect(500);

        expect(response.body.error).toBe('Internal server error');

        require('../controllers/userController').userController.updateUser =
          originalUpdateUser;
      });
    });

    describe('DELETE /users/:id error branches', () => {
      it('should handle "does not exist" error specifically', async () => {
        const originalDeleteUser = require('../controllers/userController')
          .userController.deleteUser;
        require('../controllers/userController').userController.deleteUser =
          jest.fn().mockRejectedValue(new Error('User does not exist'));

        const response = await request(app)
          .delete(`/users/${testUser._id}`)
          .expect(404);

        expect(response.body.error).toBe('User does not exist');

        require('../controllers/userController').userController.deleteUser =
          originalDeleteUser;
      });
       it('returns 400 if id is not a valid ObjectId', async () => {
          const res = await request(app).delete('/users/not-an-id');

          expect(res.status).toBe(400);
          expect(res.body.error).toBe('Invalid user id format');
        });

      it('should handle general errors (not "does not exist")', async () => {
        const originalDeleteUser = require('../controllers/userController')
          .userController.deleteUser;
        require('../controllers/userController').userController.deleteUser =
          jest.fn().mockRejectedValue(new Error('General error'));

        const response = await request(app)
          .delete(`/users/${testUser._id}`)
          .expect(500);

        expect(response.body.error).toBe('Internal server error');

        require('../controllers/userController').userController.deleteUser =
          originalDeleteUser;
      });
    });

    describe('GET /users/:id/data error branches', () => {
      
      it('returns 400 if id is not a valid ObjectId', async () => {
        const res = await request(app).get('/users/invalid-id');

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          error: 'Invalid user id format',
        });
      });
      it('should handle "does not exist" error specifically', async () => {
        const originalGetUserData = require('../controllers/userController')
          .userController.getUserData;
        require('../controllers/userController').userController.getUserData =
          jest.fn().mockRejectedValue(new Error('User does not exist'));

        const response = await request(app)
          .get(`/users/${testUser._id}/data`)
          .expect(404);

        expect(response.body.error).toBe('User does not exist');

        require('../controllers/userController').userController.getUserData =
          originalGetUserData;
      });

      it('should handle general errors (not "does not exist")', async () => {
        const originalGetUserData = require('../controllers/userController')
          .userController.getUserData;
        require('../controllers/userController').userController.getUserData =
          jest.fn().mockRejectedValue(new Error('General error'));

        const response = await request(app)
          .get(`/users/${testUser._id}/data`)
          .expect(500);

        expect(response.body.error).toBe('Internal server error');

        require('../controllers/userController').userController.getUserData =
          originalGetUserData;
      });
    });

  });
});
