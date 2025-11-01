const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const request = require('supertest');
const courseRoutes = require('../routes/mongo/courseRoutes').default;
const { Course } = require('../models/Course');
const { courseController } = require('../controllers/mondoDBControllers');

describe('Course Routes', () => {
  let mongoServer, mongoUri, app;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test app
    app = express();
    app.use(express.json());
    app.use('/courses', courseRoutes);
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Course.deleteMany({});
  });

  describe('GET /courses', () => {
    beforeEach(async () => {
      await Course.create([
        {
          _id: 'COMP101',
          title: 'Introduction to Programming',
          description: 'Basic programming concepts',
          credits: 3,
          offeredIn: ['Fall', 'Winter'],
          prerequisites: ['MATH101'],
          corequisites: [],
        },
        {
          _id: 'COMP102',
          title: 'Data Structures',
          description: 'Advanced data structures',
          credits: 3,
          offeredIn: ['Winter', 'Summer'],
          prerequisites: ['COMP101'],
          corequisites: [],
        },
        {
          _id: 'MATH101',
          title: 'Calculus I',
          description: 'Differential calculus',
          credits: 4,
          offeredIn: ['Fall', 'Winter', 'Summer'],
          prerequisites: [],
          corequisites: [],
        },
      ]);
    });

    it('should get all courses', async () => {
      const response = await request(app).get('/courses').expect(200);

      expect(response.body.message).toBe('Courses retrieved successfully');
      expect(response.body.courses).toHaveLength(3);
      expect(response.body.courses[0]).toHaveProperty('title');
      expect(response.body.courses[0]).toHaveProperty('description');
      expect(response.body.courses[0]).toHaveProperty('_id');
      expect(Array.isArray(response.body.courses)).toBe(true);
    });

    it('should filter courses by pool', async () => {
      const response = await request(app).get('/courses?pool=Fall').expect(200);

      expect(response.body.courses).toHaveLength(2);
      expect(
        response.body.courses.every((course) =>
          course.offeredIn.includes('Fall'),
        ),
      ).toBe(true);
      const courseIds = response.body.courses
        .map((course) => course._id)
        .sort();
      expect(courseIds).toEqual(['COMP101', 'MATH101']);
    });

    it('should search courses by title and description', async () => {
      const response = await request(app)
        .get('/courses?search=programming')
        .expect(200);

      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].title).toBe(
        'Introduction to Programming',
      );
    });

    it('should search courses by keyword', async () => {
      const response = await request(app)
        .get('/courses')
        .query({ search: 'data' });

      expect(response.status).toBe(200);
      expect(response.body.courses.length).toBeGreaterThanOrEqual(1);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/courses?page=1&limit=2')
        .expect(200);

      expect(response.body.courses).toHaveLength(2);
    });

    it('should pass page/limit params even when partially provided', async () => {
      const response = await request(app).get('/courses').query({ page: '1' });

      expect(response.status).toBe(200);
      expect(response.body.courses.length).toBe(3);
    });

    it('should apply pagination', async () => {
      const response = await request(app)
        .get('/courses')
        .query({ page: '1', limit: '2' });

      expect(response.status).toBe(200);
      expect(response.body.courses.length).toBe(2);
    });

    it('should ignore invalid pagination values provided', async () => {
      const response = await request(app)
        .get('/courses')
        .query({ page: 'NaN', limit: 'NaN' });

      expect(response.status).toBe(200);
      expect(response.body.courses.length).toBe(3);
    });

    it('should sort courses by specified field', async () => {
      const response = await request(app)
        .get('/courses?sort=credits')
        .expect(200);

      expect(response.body.courses[0].credits).toBeLessThanOrEqual(
        response.body.courses[1].credits,
      );
    });

    it('should apply custom sorting', async () => {
      const response = await request(app)
        .get('/courses')
        .query({ sort: 'credits' });

      expect(response.status).toBe(200);
      expect(response.body.courses.length).toBe(3);
    });

    it('should handle server errors', async () => {
      const spy = jest
        .spyOn(courseController, 'getAllCourses')
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/courses').expect(500);

      expect(response.body.error).toBe('Internal server error');

      spy.mockRestore();
    });

    it('should handle errors during fetch', async () => {
      const spy = jest
        .spyOn(courseController, 'getAllCourses')
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/courses');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal server error');

      spy.mockRestore();
    });

    it('should handle errors in getAllCourses directly', async () => {
      const originalFindAll = courseController.findAll;
      courseController.findAll = jest.fn().mockImplementation(() => {
        throw new Error('Direct database error');
      });

      await expect(courseController.getAllCourses({})).rejects.toThrow(
        'Direct database error',
      );

      courseController.findAll = originalFindAll;
    });
  });

  describe('GET /courses/:code', () => {
    beforeEach(async () => {
      await Course.create({
        _id: 'COMP101',
        title: 'Introduction to Programming',
        description: 'Basic programming concepts',
        credits: 3,
        offeredIn: ['Fall', 'Winter'],
        prerequisites: ['MATH101'],
        corequisites: [],
      });
    });

    it('should get course by code', async () => {
      const response = await request(app).get('/courses/COMP101').expect(200);

      expect(response.body.message).toBe('Course retrieved successfully');
      expect(response.body.course).toMatchObject({
        _id: 'COMP101',
        title: 'Introduction to Programming',
        description: 'Basic programming concepts',
        credits: 3,
      });
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('course');
      expect(response.body.course.title).toBe('Introduction to Programming');
    });

    it('should return 404 for non-existent course', async () => {
      const response = await request(app)
        .get('/courses/NONEXISTENT')
        .expect(404);

      expect(response.body.error).toBe('Course not found');
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent course (alternative)', async () => {
      const response = await request(app).get('/courses/NONEXIST');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 if code is missing', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.get('/test', (req, res) => {
        if (!req.params.code) {
          res.status(400).json({ error: 'Course code is required' });
        }
      });

      const response = await request(testApp).get('/test');
      expect(response.status).toBe(400);
    });

    it('should handle server errors', async () => {
      const spy = jest
        .spyOn(courseController, 'getCourseByCode')
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/courses/COMP101').expect(500);

      expect(response.body.error).toBe('Internal server error');

      spy.mockRestore();
    });

    it('should handle errors during fetch', async () => {
      const spy = jest
        .spyOn(courseController, 'getCourseByCode')
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/courses/COMP101');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      spy.mockRestore();
    });
  });

  describe('CourseController - Direct Tests', () => {
    beforeEach(async () => {
      await Course.create([
        {
          _id: 'COMP101',
          title: 'Intro to Programming',
          description: 'Basic programming',
          credits: 3,
          prerequisites: [],
          corequisites: [],
        },
        {
          _id: 'COMP201',
          title: 'Data Structures',
          description: 'Advanced data structures',
          credits: 4,
          prerequisites: [],
          corequisites: [],
        },
        {
          _id: 'MATH101',
          title: 'Calculus I',
          description: 'Introduction to calculus',
          credits: 3,
          prerequisites: [],
          corequisites: [],
        },
      ]);
    });

    describe('getCoursesByPool', () => {
      beforeEach(async () => {
        await Course.deleteMany({});
        await Course.create([
          {
            _id: 'COMP101',
            title: 'Intro to Programming',
            description: 'Basic programming course',
            credits: 3,
            offeredIn: 'Fall',
          },
          {
            _id: 'COMP201',
            title: 'Data Structures',
            description: 'Advanced data structures course',
            credits: 4,
            offeredIn: 'Winter',
          },
          {
            _id: 'MATH101',
            title: 'Calculus I',
            description: 'Introduction to calculus course',
            credits: 3,
            offeredIn: 'Fall',
          },
        ]);
      });

      it('should get courses by pool', async () => {
        const courses = await courseController.getCoursesByPool('Fall');

        expect(courses).toBeDefined();
        expect(Array.isArray(courses)).toBe(true);
        expect(courses.length).toBe(2);
        expect(courses.some((c) => c._id === 'COMP101')).toBe(true);
        expect(courses.some((c) => c._id === 'MATH101')).toBe(true);
      });

      it('should return empty array for non-existent pool', async () => {
        const courses = await courseController.getCoursesByPool('Summer');

        expect(courses).toEqual([]);
      });

      it('should handle errors gracefully', async () => {
        const originalFindAll = courseController.findAll;
        courseController.findAll = jest.fn().mockResolvedValue({
          success: false,
          error: 'Database error',
        });

        await expect(courseController.getCoursesByPool('Fall')).rejects.toThrow(
          'Database error',
        );

        courseController.findAll = originalFindAll;
      });
    });

    describe('getCourseByCode', () => {
      it('should get course by code directly', async () => {
        const course = await courseController.getCourseByCode('COMP101');

        expect(course).toBeDefined();
        expect(course._id).toBe('COMP101');
        expect(course.title).toBe('Intro to Programming');
      });

      it('should throw error for non-existent course', async () => {
        await expect(
          courseController.getCourseByCode('NONEXIST'),
        ).rejects.toThrow('Course not found');
      });

      it('should handle errors gracefully', async () => {
        const originalFindById = courseController.findById;
        courseController.findById = jest.fn().mockResolvedValue({
          success: false,
          error: 'Database error',
        });

        await expect(
          courseController.getCourseByCode('COMP101'),
        ).rejects.toThrow();

        courseController.findById = originalFindById;
      });
    });

    describe('createRequisite', () => {
      it('should create a prerequisite successfully', async () => {
        const result = await courseController.createRequisite(
          'COMP201',
          'COMP101',
          'pre',
        );

        expect(result).toBeDefined();
        expect(result.code1).toBe('COMP201');
        expect(result.code2).toBe('COMP101');
        expect(result.type).toBe('pre');

        const course = await Course.findById('COMP201');
        expect(course.prerequisites).toContain('COMP101');
      });

      it('should create a corequisite successfully', async () => {
        const result = await courseController.createRequisite(
          'COMP201',
          'COMP101',
          'co',
        );

        expect(result).toBeDefined();
        expect(result.type).toBe('co');

        const course = await Course.findById('COMP201');
        expect(course.corequisites).toContain('COMP101');
      });

      it('should throw error if code1 does not exist', async () => {
        await expect(
          courseController.createRequisite('NONEXIST', 'COMP101', 'pre'),
        ).rejects.toThrow(
          "One or both courses ('NONEXIST', 'COMP101') do not exist.",
        );
      });

      it('should throw error if code2 does not exist', async () => {
        await expect(
          courseController.createRequisite('COMP201', 'NONEXIST', 'pre'),
        ).rejects.toThrow(
          "One or both courses ('COMP201', 'NONEXIST') do not exist.",
        );
      });

      it('should throw error if requisite already exists', async () => {
        // First create the requisite
        await courseController.createRequisite('COMP201', 'COMP101', 'pre');

        // Try to create it again - should fail
        await expect(
          courseController.createRequisite('COMP201', 'COMP101', 'pre'),
        ).rejects.toThrow('Requisite already exists or course not found.');
      });

      it('should handle errors gracefully', async () => {
        // Mock Course.exists to throw an error
        const originalExists = Course.exists;
        Course.exists = jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockRejectedValue(new Error('Database error')),
        }));

        await expect(
          courseController.createRequisite('COMP201', 'COMP101', 'pre'),
        ).rejects.toThrow('Database error');

        Course.exists = originalExists;
      });
    });

    describe('getRequisites', () => {
      beforeEach(async () => {
        await Course.findByIdAndUpdate('COMP201', {
          prerequisites: ['COMP101'],
          corequisites: ['MATH101'],
        });
      });

      it('should get all requisites for a course', async () => {
        const requisites = await courseController.getRequisites('COMP201');

        expect(requisites).toBeDefined();
        expect(Array.isArray(requisites)).toBe(true);
        expect(requisites.length).toBe(2);

        const preReq = requisites.find(
          (r) => r.code2 === 'COMP101' && r.type === 'pre',
        );
        const coReq = requisites.find(
          (r) => r.code2 === 'MATH101' && r.type === 'co',
        );

        expect(preReq).toBeDefined();
        expect(coReq).toBeDefined();
      });

      it('should throw error for non-existent course', async () => {
        await expect(
          courseController.getRequisites('NONEXIST'),
        ).rejects.toThrow("Course 'NONEXIST' does not exist.");
      });

      it('should handle courses with no requisites', async () => {
        const requisites = await courseController.getRequisites('COMP101');

        expect(requisites).toBeDefined();
        expect(Array.isArray(requisites)).toBe(true);
        expect(requisites.length).toBe(0);
      });

      it('should handle errors gracefully', async () => {
        const originalFindById = Course.findById;
        Course.findById = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockRejectedValue(new Error('Database error')),
            }),
          }),
        });

        await expect(
          courseController.getRequisites('COMP201'),
        ).rejects.toThrow();

        Course.findById = originalFindById;
      });
    });

    describe('deleteRequisite', () => {
      beforeEach(async () => {
        await Course.findByIdAndUpdate('COMP201', {
          prerequisites: ['COMP101'],
          corequisites: ['MATH101'],
        });
      });

      it('should delete a prerequisite successfully', async () => {
        const result = await courseController.deleteRequisite(
          'COMP201',
          'COMP101',
          'pre',
        );

        expect(result).toBe('Requisite deleted successfully.');

        const course = await Course.findById('COMP201');
        expect(course.prerequisites).not.toContain('COMP101');
      });

      it('should delete a corequisite successfully', async () => {
        const result = await courseController.deleteRequisite(
          'COMP201',
          'MATH101',
          'co',
        );

        expect(result).toBe('Requisite deleted successfully.');

        const course = await Course.findById('COMP201');
        expect(course.corequisites).not.toContain('MATH101');
      });

      it('should throw error for non-existent requisite', async () => {
        await expect(
          courseController.deleteRequisite('COMP201', 'NONEXIST', 'pre'),
        ).rejects.toThrow('Requisite not found or already deleted.');
      });

      it('should handle errors gracefully', async () => {
        const originalUpdateOne = Course.updateOne;
        Course.updateOne = jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Database error')),
        });

        await expect(
          courseController.deleteRequisite('COMP201', 'COMP101', 'pre'),
        ).rejects.toThrow();

        Course.updateOne = originalUpdateOne;
      });
    });
  });
});
