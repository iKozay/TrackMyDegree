const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const { User } = require('../models/user');
const { Course } = require('../models/course');
const { Degree } = require('../models/degree');
const { Timeline } = require('../models/timeline');

jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (req, _res, next) => {
    const urlUserId = req.originalUrl?.match(/\/users\/([^/?]+)/)?.[1];
    req.user = {
      userId: req.params?.userId || req.params?.id || urlUserId || 'test-user-id',
      orgId: 'test-org',
      type: 'student',
    };
    next();
  },
  userCheckMiddleware: (req, _res, next) => {
    req.user = {
      userId: req.params?.userId || req.params?.id || 'test-user-id',
      orgId: 'test-org',
      type: 'student',
    };
    next();
  },
  adminCheckMiddleware: (_req, _res, next) => next(),
}));

const userRoutes = require('../routes/userRoutes').default;

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

   describe('GET /users/:id/data', () => {
      let testUser;

      beforeEach(async () => {

        testUser = await User.create({
          _id: new mongoose.Types.ObjectId().toString(),
          email: 'test@example.com',
          fullname: 'Test User',
          type: 'student',
        });

        
        await Timeline.create({
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

    describe('PATCH /users/:id', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      _id: new mongoose.Types.ObjectId().toString(),
      email: 'test@example.com',
      fullname: 'Test User',
      type: 'student',
    });
  });

  it('should update fullname', async () => {
    const res = await request(app)
      .patch(`/users/${testUser._id}`)
      .send({ fullname: 'Updated Name' })
      .expect(200);

    expect(res.body.message).toBe('User updated successfully');

    const updated = await User.findById(testUser._id);
    expect(updated?.fullname).toBe('Updated Name');
  });

  it('should return 400 if no fields provided', async () => {
    const res = await request(app)
      .patch(`/users/${testUser._id}`)
      .send({})
      .expect(400);

    expect(res.body.error).toBe(
      'Provide at least one field to update: fullname or newPassword'
    );
  });

  it('should return 400 for empty fullname', async () => {
    const res = await request(app)
      .patch(`/users/${testUser._id}`)
      .send({ fullname: '   ' })
      .expect(400);

    expect(res.body.error).toBe('fullname cannot be empty');
  });

  it('should require currentPassword when updating password', async () => {
    const res = await request(app)
      .patch(`/users/${testUser._id}`)
      .send({ newPassword: 'newpass123' })
      .expect(400);

    expect(res.body.error).toBe(
      'currentPassword is required to set a new password'
    );
  });

  it('should enforce minimum password length', async () => {
    const res = await request(app)
      .patch(`/users/${testUser._id}`)
      .send({
        currentPassword: 'oldpass',
        newPassword: '123',
      })
      .expect(400);

    expect(res.body.error).toBe(
      'newPassword must be at least 6 characters'
    );
  });

  it('should return 401 if current password is incorrect', async () => {
    const original = require('../controllers/authController')
      .authController.changePassword;

    require('../controllers/authController').authController.changePassword =
      jest.fn().mockResolvedValue(false);

    const res = await request(app)
      .patch(`/users/${testUser._id}`)
      .send({
        currentPassword: 'wrongpass',
        newPassword: 'newpassword',
      })
      .expect(401);

    expect(res.body.error).toBe('Current password is incorrect');

    require('../controllers/authController').authController.changePassword =
      original;
  });

  it('should update password successfully', async () => {
    const original = require('../controllers/authController')
      .authController.changePassword;

    require('../controllers/authController').authController.changePassword =
      jest.fn().mockResolvedValue(true);

    const res = await request(app)
      .patch(`/users/${testUser._id}`)
      .send({
        currentPassword: 'oldpass',
        newPassword: 'newpassword',
      })
      .expect(200);

    expect(res.body.message).toBe('User updated successfully');

    require('../controllers/authController').authController.changePassword =
      original;
  });

  it('should return 400 for invalid id', async () => {
    const res = await request(app)
      .patch('/users/invalid-id')
      .send({ fullname: 'Test' })
      .expect(400);

    expect(res.body.error).toBe('Invalid user id format');
  });

  it('should handle server errors', async () => {
    const original = require('../controllers/userController')
      .userController.updateUser;

    require('../controllers/userController').userController.updateUser =
      jest.fn().mockRejectedValue(new Error('Database error'));

    const res = await request(app)
      .patch(`/users/${testUser._id}`)
      .send({ fullname: 'Test' })
      .expect(500);

    expect(res.body.error).toBe('Internal server error');

    require('../controllers/userController').userController.updateUser =
      original;
  });
});

   it('should return 400 if fullname is not a string', async () => {
  const res = await request(app)
    .patch(`/users/${testUser._id}`)
    .send({ fullname: ['not', 'a', 'string'] })
    .expect(400);

  expect(res.body.error).toBe('fullname must be a string');
});

it('should return 400 if currentPassword is not a string', async () => {
  const res = await request(app)
    .patch(`/users/${testUser._id}`)
    .send({ currentPassword: 123, newPassword: 'validpass' })
    .expect(400);

  expect(res.body.error).toBe('currentPassword must be a string');
});

it('should return 400 if newPassword is not a string', async () => {
  const res = await request(app)
    .patch(`/users/${testUser._id}`)
    .send({ newPassword: { value: 'hack' } })
    .expect(400);

  expect(res.body.error).toBe('newPassword must be a string');
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

    it('should return 400 if body is an array', async () => {
  const res = await request(app)
    .put(`/users/${testUser._id}`)
    .send([{ fullname: 'hacked' }])
    .expect(400);

  expect(res.body.error).toBe('Invalid request body');
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
