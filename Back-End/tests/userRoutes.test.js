const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const userRoutes = require('../dist/routes/mongo/userRoutes').default;
const { User } = require('../dist/models/User');
const { Course } = require('../dist/models/Course');
const { Degree } = require('../dist/models/Degree');
const { Timeline } = require('../dist/models/Timeline');

// Create test app
const app = express();
app.use(express.json());
app.use('/users', userRoutes);

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
        exemptions: []
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User created successfully');
      expect(response.body.user).toMatchObject({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP'
      });
      expect(response.body.user.id).toBeDefined();
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

      expect(response.body.error).toBe('Missing required fields: email, fullname, type');
    });

    it('should return 400 for duplicate email', async () => {
      await User.create({
        email: 'existing@example.com',
        fullname: 'Existing User',
        type: 'student'
      });

      const userData = {
        email: 'existing@example.com',
        fullname: 'New User',
        type: 'student'
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should handle server errors', async () => {
      // Mock userController.createUser to throw an error
      const originalCreateUser = require('../dist/controllers/mondoDBControllers/UserController').userController.createUser;
      require('../dist/controllers/mondoDBControllers/UserController').userController.createUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const userData = {
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student'
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.createUser = originalCreateUser;
    });
  });

  describe('GET /users/:id', () => {
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
      const response = await request(app)
        .get(`/users/${testUser._id}`)
        .expect(200);

      expect(response.body.message).toBe('User retrieved successfully');
      expect(response.body.user).toMatchObject({
        id: testUser._id.toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP'
      });
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/users/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should handle server errors', async () => {
      // Mock userController.getUserById to throw an error
      const originalGetUserById = require('../dist/controllers/mondoDBControllers/UserController').userController.getUserById;
      require('../dist/controllers/mondoDBControllers/UserController').userController.getUserById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/users/${testUser._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.getUserById = originalGetUserById;
    });
  });

  describe('GET /users', () => {
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
      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(response.body.message).toBe('Users retrieved successfully');
      expect(response.body.users).toHaveLength(2);
      expect(response.body.users[0]).toHaveProperty('id');
      expect(response.body.users[0]).toHaveProperty('email');
      expect(response.body.users[0]).toHaveProperty('fullname');
      expect(response.body.users[0]).toHaveProperty('type');
      expect(response.body.users[0]).toHaveProperty('degree');
    });

    it('should handle server errors', async () => {
      // Mock userController.getAllUsers to throw an error
      const originalGetAllUsers = require('../dist/controllers/mondoDBControllers/UserController').userController.getAllUsers;
      require('../dist/controllers/mondoDBControllers/UserController').userController.getAllUsers = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/users')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.getAllUsers = originalGetAllUsers;
    });
  });

  describe('PUT /users/:id', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP'
      });
    });

    it('should update user', async () => {
      const updates = {
        fullname: 'Updated Name',
        degree: 'SOEN'
      };

      const response = await request(app)
        .put(`/users/${testUser._id}`)
        .send(updates)
        .expect(200);

      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.user.fullname).toBe('Updated Name');
      expect(response.body.user.degree).toBe('SOEN');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updates = { fullname: 'Updated Name' };

      const response = await request(app)
        .put(`/users/${fakeId}`)
        .send(updates)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should handle server errors', async () => {
      // Mock userController.updateUser to throw an error
      const originalUpdateUser = require('../dist/controllers/mondoDBControllers/UserController').userController.updateUser;
      require('../dist/controllers/mondoDBControllers/UserController').userController.updateUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const updates = { fullname: 'Updated Name' };
      const response = await request(app)
        .put(`/users/${testUser._id}`)
        .send(updates)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.updateUser = originalUpdateUser;
    });
  });

  describe('DELETE /users/:id', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student'
      });
    });

    it('should delete user', async () => {
      const response = await request(app)
        .delete(`/users/${testUser._id}`)
        .expect(200);

      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is deleted
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/users/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should handle server errors', async () => {
      // Mock userController.deleteUser to throw an error
      const originalDeleteUser = require('../dist/controllers/mondoDBControllers/UserController').userController.deleteUser;
      require('../dist/controllers/mondoDBControllers/UserController').userController.deleteUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/users/${testUser._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.deleteUser = originalDeleteUser;
    });
  });

  describe('GET /users/:id/data', () => {
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
          }
        ]
      });
    });

    it('should get comprehensive user data', async () => {
      const response = await request(app)
        .get(`/users/${testUser._id}/data`)
        .expect(200);

      expect(response.body.message).toBe('User data retrieved successfully');
      expect(response.body.data.user).toMatchObject({
        id: testUser._id.toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        degree: 'COMP'
      });

      expect(response.body.data.timeline).toHaveLength(2);
      expect(response.body.data.deficiencies).toHaveLength(1);
      expect(response.body.data.exemptions).toHaveLength(2);
      expect(response.body.data.degree).toMatchObject({
        id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120
      });
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/users/${fakeId}/data`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should handle server errors', async () => {
      // Mock userController.getUserData to throw an error
      const originalGetUserData = require('../dist/controllers/mondoDBControllers/UserController').userController.getUserData;
      require('../dist/controllers/mondoDBControllers/UserController').userController.getUserData = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/users/${testUser._id}/data`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.getUserData = originalGetUserData;
    });
  });

  describe('POST /users/:id/deficiencies', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        deficiencies: []
      });
    });

    it('should create deficiency', async () => {
      const deficiencyData = {
        coursepool: 'Math',
        creditsRequired: 6
      };

      const response = await request(app)
        .post(`/users/${testUser._id}/deficiencies`)
        .send(deficiencyData)
        .expect(201);

      expect(response.body.message).toBe('Deficiency created successfully');
      expect(response.body.deficiency).toMatchObject({
        coursepool: 'Math',
        user_id: testUser._id.toString(),
        creditsRequired: 6
      });
    });

    it('should return 400 for missing required fields', async () => {
      const deficiencyData = {
        coursepool: 'Math'
        // Missing creditsRequired
      };

      const response = await request(app)
        .post(`/users/${testUser._id}/deficiencies`)
        .send(deficiencyData)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields: coursepool, creditsRequired');
    });

    it('should return 400 for duplicate deficiency', async () => {
      await User.findByIdAndUpdate(testUser._id, {
        deficiencies: [{ coursepool: 'Math', creditsRequired: 6 }]
      });

      const deficiencyData = {
        coursepool: 'Math',
        creditsRequired: 8
      };

      const response = await request(app)
        .post(`/users/${testUser._id}/deficiencies`)
        .send(deficiencyData)
        .expect(400);

      expect(response.body.error).toBe('Deficiency with this coursepool already exists');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const deficiencyData = {
        coursepool: 'Math',
        creditsRequired: 6
      };

      const response = await request(app)
        .post(`/users/${fakeId}/deficiencies`)
        .send(deficiencyData)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should handle server errors', async () => {
      // Mock userController.createDeficiency to throw an error
      const originalCreateDeficiency = require('../dist/controllers/mondoDBControllers/UserController').userController.createDeficiency;
      require('../dist/controllers/mondoDBControllers/UserController').userController.createDeficiency = jest.fn().mockRejectedValue(new Error('Database error'));

      const deficiencyData = {
        coursepool: 'Math',
        creditsRequired: 6
      };

      const response = await request(app)
        .post(`/users/${testUser._id}/deficiencies`)
        .send(deficiencyData)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.createDeficiency = originalCreateDeficiency;
    });
  });

  describe('GET /users/:id/deficiencies', () => {
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
      const response = await request(app)
        .get(`/users/${testUser._id}/deficiencies`)
        .expect(200);

      expect(response.body.message).toBe('Deficiencies retrieved successfully');
      expect(response.body.deficiencies).toHaveLength(2);
      expect(response.body.deficiencies[0]).toMatchObject({
        coursepool: 'Math',
        user_id: testUser._id.toString(),
        creditsRequired: 6
      });
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/users/${fakeId}/deficiencies`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should handle server errors', async () => {
      // Mock userController.getAllDeficienciesByUser to throw an error
      const originalGetAllDeficienciesByUser = require('../dist/controllers/mondoDBControllers/UserController').userController.getAllDeficienciesByUser;
      require('../dist/controllers/mondoDBControllers/UserController').userController.getAllDeficienciesByUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/users/${testUser._id}/deficiencies`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.getAllDeficienciesByUser = originalGetAllDeficienciesByUser;
    });
  });

  describe('PUT /users/:userId/deficiencies', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
        deficiencies: [{ coursepool: 'Math', creditsRequired: 6 }]
      });
    });

    it('should update deficiency', async () => {
      const response = await request(app)
        .put(`/users/${testUser._id}/deficiencies`)
        .send({ coursepool: 'Math', creditsRequired: 9 })
        .expect(200);

      expect(response.body.message).toBe('Deficiency updated successfully');
      expect(response.body.deficiency).toMatchObject({
        coursepool: 'Math',
        user_id: testUser._id.toString(),
        creditsRequired: 9
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .put(`/users/${testUser._id}/deficiencies`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('User ID, coursepool, and creditsRequired are required');
    });

    it('should return 404 for non-existent deficiency', async () => {
      const response = await request(app)
        .put(`/users/${testUser._id}/deficiencies`)
        .send({ coursepool: 'Science', creditsRequired: 9 })
        .expect(404);

      expect(response.body.error).toBe('Deficiency not found.');
    });

    it('should return 400 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .put(`/users/${fakeId}/deficiencies`)
        .send({ coursepool: 'Math', creditsRequired: 9 })
        .expect(400);

      expect(response.body.error).toBe('User ID, coursepool, and creditsRequired are required');
    });

    it('should handle server errors', async () => {
      // Mock userController.updateDeficiency to throw an error
      const originalUpdateDeficiency = require('../dist/controllers/mondoDBControllers/UserController').userController.updateDeficiency;
      require('../dist/controllers/mondoDBControllers/UserController').userController.updateDeficiency = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/users/${testUser._id}/deficiencies`)
        .send({ coursepool: 'Math', creditsRequired: 9 })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.updateDeficiency = originalUpdateDeficiency;
    });
  });

  describe('DELETE /users/:userId/deficiencies', () => {
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

    it('should delete deficiency', async () => {
      const response = await request(app)
        .delete(`/users/${testUser._id}/deficiencies`)
        .send({ coursepool: 'Math' })
        .expect(200);

      expect(response.body.message).toContain('successfully deleted');

      // Verify deficiency was removed
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.deficiencies).toHaveLength(1);
      expect(updatedUser.deficiencies[0].coursepool).toBe('Science');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .delete(`/users/${testUser._id}/deficiencies`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('User ID and coursepool are required');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/users/${fakeId}/deficiencies`)
        .send({ coursepool: 'Math' })
        .expect(404);

      expect(response.body.error).toContain('does not exist');
    });

    it('should handle server errors', async () => {
      // Mock userController.deleteDeficiency to throw an error
      const originalDeleteDeficiency = require('../dist/controllers/mondoDBControllers/UserController').userController.deleteDeficiency;
      require('../dist/controllers/mondoDBControllers/UserController').userController.deleteDeficiency = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/users/${testUser._id}/deficiencies`)
        .send({ coursepool: 'Math' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.deleteDeficiency = originalDeleteDeficiency;
    });
  });

  describe('POST /users/:id/exemptions', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword',
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

    it('should create exemptions', async () => {
      const exemptionData = {
        coursecodes: ['COMP101', 'COMP102']
      };

      const response = await request(app)
        .post(`/users/${testUser._id}/exemptions`)
        .send(exemptionData)
        .expect(201);

      expect(response.body.message).toBe('Exemptions processed successfully');
      expect(response.body.created).toHaveLength(2);
      expect(response.body.alreadyExists).toHaveLength(0);
    });

    it('should return 400 for missing coursecodes', async () => {
      const response = await request(app)
        .post(`/users/${testUser._id}/exemptions`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('User ID and coursecodes array are required');
    });

    it('should return 404 for non-existent course', async () => {
      const exemptionData = {
        coursecodes: ['COMP101', 'NONEXISTENT']
      };

      const response = await request(app)
        .post(`/users/${testUser._id}/exemptions`)
        .send(exemptionData)
        .expect(404);

      expect(response.body.error).toContain('does not exist');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const exemptionData = {
        coursecodes: ['COMP101']
      };

      const response = await request(app)
        .post(`/users/${fakeId}/exemptions`)
        .send(exemptionData)
        .expect(404);

      expect(response.body.error).toContain('does not exist');
    });

    it('should handle server errors', async () => {
      // Mock userController.createExemptions to throw an error
      const originalCreateExemptions = require('../dist/controllers/mondoDBControllers/UserController').userController.createExemptions;
      require('../dist/controllers/mondoDBControllers/UserController').userController.createExemptions = jest.fn().mockRejectedValue(new Error('Database error'));

      const exemptionData = {
        coursecodes: ['COMP101']
      };

      const response = await request(app)
        .post(`/users/${testUser._id}/exemptions`)
        .send(exemptionData)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.createExemptions = originalCreateExemptions;
    });
  });

  describe('GET /users/:id/exemptions', () => {
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
      const response = await request(app)
        .get(`/users/${testUser._id}/exemptions`)
        .expect(200);

      expect(response.body.message).toBe('Exemptions retrieved successfully');
      expect(response.body.exemptions).toHaveLength(2);
      expect(response.body.exemptions[0]).toMatchObject({
        coursecode: 'COMP101',
        user_id: testUser._id.toString()
      });
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/users/${fakeId}/exemptions`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should handle server errors', async () => {
      // Mock userController.getAllExemptionsByUser to throw an error
      const originalGetAllExemptionsByUser = require('../dist/controllers/mondoDBControllers/UserController').userController.getAllExemptionsByUser;
      require('../dist/controllers/mondoDBControllers/UserController').userController.getAllExemptionsByUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/users/${testUser._id}/exemptions`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.getAllExemptionsByUser = originalGetAllExemptionsByUser;
    });
  });

  describe('DELETE /users/:userId/exemptions', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        exemptions: ['COMP101', 'COMP102']
      });
    });

    it('should delete exemption', async () => {
      const response = await request(app)
        .delete(`/users/${testUser._id}/exemptions`)
        .send({ coursecode: 'COMP101' })
        .expect(200);

      expect(response.body.message).toContain('successfully deleted');

      // Verify exemption was removed
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.exemptions).toHaveLength(1);
      expect(updatedUser.exemptions).toContain('COMP102');
      expect(updatedUser.exemptions).not.toContain('COMP101');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .delete(`/users/${testUser._id}/exemptions`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('User ID and coursecode are required');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/users/${fakeId}/exemptions`)
        .send({ coursecode: 'COMP101' })
        .expect(404);

      expect(response.body.error).toContain('does not exist');
    });

    it('should handle server errors', async () => {
      // Mock userController.deleteExemption to throw an error
      const originalDeleteExemption = require('../dist/controllers/mondoDBControllers/UserController').userController.deleteExemption;
      require('../dist/controllers/mondoDBControllers/UserController').userController.deleteExemption = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/users/${testUser._id}/exemptions`)
        .send({ coursecode: 'COMP101' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/UserController').userController.deleteExemption = originalDeleteExemption;
    });
  });
});
