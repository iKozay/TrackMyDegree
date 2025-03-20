jest.mock(
  '../dist/controllers/coursepoolController/coursepoolController',
  () => ({
    __esModule: true,
    default: {
      createCoursePool: jest.fn(),
      updateCoursePool: jest.fn(),
      removeCoursePool: jest.fn(),
    },
  }),
);

const request = require('supertest');
const express = require('express');
const router = require('../dist/routes/coursepool').default;
const controller =
  require('../dist/controllers/coursepoolController/coursepoolController').default;
const DB_OPS = require('../dist/Util/DB_Ops').default;

const url = process.DOCKER_URL || 'host.docker.internal:8000';

const app = express();
app.use(express.json());
app.use('/coursepool', router);

describe('CoursePool Routes', () => {
  describe('POST /coursepool/create', () => {
    it('should create a coursepool successfully', async () => {
      const payload = {
        name: 'Basic & Natural Sciences',
      };

      controller.createCoursePool.mockResolvedValue(DB_OPS.SUCCESS);

      const response = await request(app)
        .post('/coursepool/create')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty(
        'res',
        'New CoursePool added successfully',
      );
    });

    it('should return 400 when payload is missing', async () => {
      const response = await request(url)
        .post('/coursepool/create')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Payload containing name of coursepool is required for create.',
      );
    });

    it('should return 400 when name is empty', async () => {
      const payload = {
        name: '',
      };

      const response = await request(url)
        .post('/coursepool/create')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Payload attributes cannot be empty',
      );
    });
  });

  describe('GET /coursepool/getAll', () => {
    it('should return all course pools', async () => {
      const response = await request(url)
        .get('/coursepool/getAll')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body.course_pools)).toBe(true);

      if (response.body.course_pools.length > 0) {
        expect(response.body.course_pools[0]).toHaveProperty('id');
        expect(response.body.course_pools[0]).toHaveProperty('name');
      }
    });
  });

  describe('POST /coursepool/get', () => {
    it('should return specific course pool', async () => {
      const request_body = {
        course_pool_id: '2',
      };

      const response = await request(url)
        .post('/coursepool/get')
        .send(request_body)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
    });

    it('should return 404 when course pool not found', async () => {
      const request_body = {
        course_pool_id: 'nonexistent_id',
      };

      const response = await request(url)
        .post('/coursepool/get')
        .send(request_body)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Course Pool not found');
    });

    it('should return 400 when course_pool_id is missing', async () => {
      const response = await request(url)
        .post('/coursepool/get')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Course Pool ID is required to get course pool.',
      );
    });
  });

  describe('POST /coursepool/update', () => {
    it('should update course pool successfully', async () => {
      const payload = {
        id: '1',
        name: 'Updated Pool',
      };

      controller.updateCoursePool.mockResolvedValue(DB_OPS.SUCCESS);

      const response = await request(app)
        .post('/coursepool/update')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'CoursePool item updated successfully',
      );
    });

    it('should return 404 when course pool not found', async () => {
      const payload = {
        id: 'nonexistent_id',
        name: 'Updated Pool',
      };

      const response = await request(url)
        .post('/coursepool/update')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty(
        'error',
        'Item not found in CoursePool',
      );
    });

    it('should return 400 when payload is incomplete', async () => {
      const response = await request(url)
        .post('/coursepool/update')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Payload of type CoursePoolItem is required for update.',
      );
    });
  });

  describe('POST /coursepool/delete', () => {
    it('should delete course pool successfully', async () => {
      const request_body = {
        course_pool_id: '3',
      };

      controller.removeCoursePool.mockResolvedValue(DB_OPS.SUCCESS);

      const response = await request(app)
        .post('/coursepool/delete')
        .send(request_body)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Item removed from CoursePool',
      );
    });

    it('should return 404 when course pool not found', async () => {
      const request_body = {
        course_pool_id: 'nonexistent_id',
      };

      const response = await request(url)
        .post('/coursepool/delete')
        .send(request_body)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty(
        'error',
        'Item not found in CoursePool',
      );
    });

    it('should return 400 when course_pool_id is missing', async () => {
      const response = await request(url)
        .post('/coursepool/delete')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'ID is required to remove item from CoursePool.',
      );
    });
  });
});
