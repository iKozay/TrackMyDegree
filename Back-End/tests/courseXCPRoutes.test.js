const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const courseXCPRoutes = require('../dist/routes/mongo/courseXCPRoutes').default;
const { Degree } = require('../dist/models/Degree');

// Create test app
const app = express();
app.use(express.json());
app.use('/', courseXCPRoutes);

describe('CourseXCP Routes', () => {
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
    await Degree.deleteMany({});
  });

  describe('POST /coursexcp', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101']
          }
        ]
      });
    });

    it('should add course to course pool', async () => {
      const response = await request(app)
        .post('/coursexcp')
        .send({
          coursecode: 'COMP102',
          coursepool_id: 'COMP_CORE'
        })
        .expect(201);

      expect(response.body.message).toBe('Course added to pool successfully');
      expect(response.body.success).toBe(true);

      // Verify course was added
      const degree = await Degree.findById('COMP');
      const coursePool = degree.coursePools.find(cp => cp.id === 'COMP_CORE');
      expect(coursePool.courses).toContain('COMP102');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/coursexcp')
        .send({
          coursecode: 'COMP102'
          // Missing coursepool_id
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields: coursecode, coursepool_id');
    });

    it('should return 400 for non-existent course pool', async () => {
      const response = await request(app)
        .post('/coursexcp')
        .send({
          coursecode: 'COMP102',
          coursepool_id: 'NONEXISTENT'
        })
        .expect(400);

      expect(response.body.error).toBe('Course pool not found');
    });

    it('should handle server errors', async () => {
      // Mock courseXCPController.createCourseXCP to throw an error
      const originalCreateCourseXCP = require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.createCourseXCP;
      require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.createCourseXCP = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/coursexcp')
        .send({
          coursecode: 'COMP102',
          coursepool_id: 'COMP_CORE'
        })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.createCourseXCP = originalCreateCourseXCP;
    });
  });

  describe('GET /coursexcp/:coursepoolId', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102', 'COMP103']
          }
        ]
      });
    });

    it('should get all courses for course pool', async () => {
      const response = await request(app)
        .get('/coursexcp/COMP_CORE')
        .expect(200);

      expect(response.body.message).toBe('Courses retrieved successfully');
      expect(response.body.courses).toHaveLength(3);
      expect(response.body.courses).toContain('COMP101');
      expect(response.body.courses).toContain('COMP102');
      expect(response.body.courses).toContain('COMP103');
    });

    it('should return empty array for non-existent course pool', async () => {
      const response = await request(app)
        .get('/coursexcp/NONEXISTENT')
        .expect(200);

      expect(response.body.courses).toHaveLength(0);
    });

    it('should handle server errors', async () => {
      // Mock courseXCPController.getAllCourseXCP to throw an error
      const originalGetAllCourseXCP = require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.getAllCourseXCP;
      require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.getAllCourseXCP = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/coursexcp/COMP_CORE')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.getAllCourseXCP = originalGetAllCourseXCP;
    });
  });

  describe('DELETE /coursexcp/:coursepoolId/:coursecode', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102', 'COMP103']
          }
        ]
      });
    });

    it('should remove course from course pool', async () => {
      const response = await request(app)
        .delete('/coursexcp/COMP_CORE/COMP102')
        .expect(200);

      expect(response.body.message).toBe('Course removed from pool successfully');
      expect(response.body.success).toBe(true);

      // Verify course was removed
      const degree = await Degree.findById('COMP');
      const coursePool = degree.coursePools.find(cp => cp.id === 'COMP_CORE');
      expect(coursePool.courses).toHaveLength(2);
      expect(coursePool.courses).not.toContain('COMP102');
      expect(coursePool.courses).toContain('COMP101');
      expect(coursePool.courses).toContain('COMP103');
    });

    it('should return 400 for non-existent course pool', async () => {
      const response = await request(app)
        .delete('/coursexcp/NONEXISTENT/COMP101')
        .expect(400);

      expect(response.body.error).toBe('Course pool not found');
    });

    it('should return 400 when course not found in pool', async () => {
      const response = await request(app)
        .delete('/coursexcp/COMP_CORE/NONEXISTENT')
        .expect(400);

      expect(response.body.error).toBe('Course not found in pool');
    });

    it('should handle server errors', async () => {
      // Mock courseXCPController.removeCourseXCP to throw an error
      const originalRemoveCourseXCP = require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.removeCourseXCP;
      require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.removeCourseXCP = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/coursexcp/COMP_CORE/COMP102')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.removeCourseXCP = originalRemoveCourseXCP;
    });
  });

  describe('GET /coursexcp/:coursepoolId/:coursecode/exists', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102']
          }
        ]
      });
    });

    it('should return true when course exists in pool', async () => {
      const response = await request(app)
        .get('/coursexcp/COMP_CORE/COMP101/exists')
        .expect(200);

      expect(response.body.message).toBe('Course existence checked successfully');
      expect(response.body.exists).toBe(true);
    });

    it('should return false when course does not exist in pool', async () => {
      const response = await request(app)
        .get('/coursexcp/COMP_CORE/COMP103/exists')
        .expect(200);

      expect(response.body.exists).toBe(false);
    });

    it('should return false for non-existent course pool', async () => {
      const response = await request(app)
        .get('/coursexcp/NONEXISTENT/COMP101/exists')
        .expect(200);

      expect(response.body.exists).toBe(false);
    });

    it('should handle server errors', async () => {
      // Mock courseXCPController.courseExistsInPool to throw an error
      const originalCourseExistsInPool = require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.courseExistsInPool;
      require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.courseExistsInPool = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/coursexcp/COMP_CORE/COMP101/exists')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.courseExistsInPool = originalCourseExistsInPool;
    });
  });

  describe('POST /coursexcp/bulk', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101']
          }
        ]
      });
    });

    it('should bulk add courses to course pool', async () => {
      const response = await request(app)
        .post('/coursexcp/bulk')
        .send({
          coursecodes: ['COMP102', 'COMP103', 'COMP104'],
          coursepool_id: 'COMP_CORE'
        })
        .expect(201);

      expect(response.body.message).toBe('Courses added to pool successfully');
      expect(response.body.addedCount).toBe(1); // One degree was modified

      // Verify courses were added
      const degree = await Degree.findById('COMP');
      const coursePool = degree.coursePools.find(cp => cp.id === 'COMP_CORE');
      expect(coursePool.courses).toHaveLength(4);
      expect(coursePool.courses).toContain('COMP101'); // Original
      expect(coursePool.courses).toContain('COMP102'); // New
      expect(coursePool.courses).toContain('COMP103'); // New
      expect(coursePool.courses).toContain('COMP104'); // New
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/coursexcp/bulk')
        .send({
          coursecodes: ['COMP102', 'COMP103']
          // Missing coursepool_id
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields: coursecodes, coursepool_id');
    });

    it('should return 400 for non-existent course pool', async () => {
      const response = await request(app)
        .post('/coursexcp/bulk')
        .send({
          coursecodes: ['COMP102', 'COMP103'],
          coursepool_id: 'NONEXISTENT'
        })
        .expect(400);

      expect(response.body.error).toBe('Course pool not found');
    });

    it('should handle server errors', async () => {
      // Mock courseXCPController.bulkCreateCourseXCP to throw an error
      const originalBulkCreateCourseXCP = require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.bulkCreateCourseXCP;
      require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.bulkCreateCourseXCP = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/coursexcp/bulk')
        .send({
          coursecodes: ['COMP102', 'COMP103'],
          coursepool_id: 'COMP_CORE'
        })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/CourseXCPController').courseXCPController.bulkCreateCourseXCP = originalBulkCreateCourseXCP;
    });
  });
});
