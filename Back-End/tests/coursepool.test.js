jest.mock(
  '../controllers/coursepoolController/coursepoolController',
  () => ({
    __esModule: true,
    default: {
      createCoursePool: jest.fn(),
      getAllCoursePools: jest.fn(),
      getCoursePool: jest.fn(),
      updateCoursePool: jest.fn(),
      removeCoursePool: jest.fn(),
    },
  }),
);

const request = require('supertest');
const express = require('express');
const router = require('../routes/coursepool').default;
const controller =
  require('../controllers/coursepoolController/coursepoolController').default;
const DB_OPS = require('../Util/DB_Ops').default;
const HTTP = require('../Util/HTTPCodes').default;

const coursepool_mocks = require('./__mocks__/coursepool_mocks');

const url = process.DOCKER_URL || 'host.docker.internal:8000';

const app = express();
app.use(express.json());
app.use('/coursepool', router);

describe('CoursePool Routes', () => {
  describe('POST /coursepool/create', () => {
    it('should create a coursepool successfully', async () => {
      controller.createCoursePool.mockResolvedValue(DB_OPS.SUCCESS);

      const response = await request(app)
        .post('/coursepool/create')
        .send(coursepool_mocks.payload_create)
        .expect('Content-Type', /json/)
        .expect(HTTP.CREATED);

      expect(response.body).toHaveProperty(
        'res',
        'New CoursePool added successfully',
      );
    });

    it('should return 400 when payload is missing', async () => {
      const response = await request(app)
        .post('/coursepool/create')
        .send({})
        .expect('Content-Type', /json/)
        .expect(HTTP.BAD_REQUEST);

      expect(response.body).toHaveProperty(
        'error',
        'Payload containing name of coursepool is required for create.',
      );
    });

    it('should return 400 when name is empty', async () => {
      const response = await request(app)
        .post('/coursepool/create')
        .send(coursepool_mocks.payload_create_empty)
        .expect('Content-Type', /json/)
        .expect(HTTP.BAD_REQUEST);

      expect(response.body).toHaveProperty(
        'error',
        'Payload attributes cannot be empty',
      );
    });
  });

  describe('GET /coursepool/getAll', () => {
    it('should return all course pools', async () => {
      controller.getAllCoursePools.mockResolvedValue(
        coursepool_mocks.response_getall,
      );

      const response = await request(app)
        .get('/coursepool/getAll')
        .expect('Content-Type', /json/)
        .expect(HTTP.OK);

      expect(Array.isArray(response.body.course_pools)).toBe(true);

      if (response.body.course_pools.length > 0) {
        expect(response.body.course_pools[0]).toHaveProperty('id');
        expect(response.body.course_pools[0]).toHaveProperty('name');
      }
    });
  });

  describe('POST /coursepool/get', () => {
    it('should return specific course pool', async () => {
      controller.getCoursePool.mockResolvedValue(coursepool_mocks.response_get);

      const response = await request(app)
        .post('/coursepool/get')
        .send(coursepool_mocks.payload_get)
        .expect('Content-Type', /json/)
        .expect(HTTP.OK);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
    });

    it('should return 404 when course pool not found', async () => {
      controller.getCoursePool.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/coursepool/get')
        .send(coursepool_mocks.payload_get)
        .expect('Content-Type', /json/)
        .expect(HTTP.NOT_FOUND);

      expect(response.body).toHaveProperty('error', 'Course Pool not found');
    });

    it('should return 400 when course_pool_id is missing', async () => {
      const response = await request(app)
        .post('/coursepool/get')
        .send({})
        .expect('Content-Type', /json/)
        .expect(HTTP.BAD_REQUEST);

      expect(response.body).toHaveProperty(
        'error',
        'Course Pool ID is required to get course pool.',
      );
    });
  });

  describe('POST /coursepool/update', () => {
    it('should update course pool successfully', async () => {
      controller.updateCoursePool.mockResolvedValue(DB_OPS.SUCCESS);

      const response = await request(app)
        .post('/coursepool/update')
        .send(coursepool_mocks.payload_update)
        .expect('Content-Type', /json/)
        .expect(HTTP.OK);

      expect(response.body).toHaveProperty(
        'message',
        'CoursePool item updated successfully',
      );
    });

    it('should return 404 when course pool not found', async () => {
      controller.updateCoursePool.mockResolvedValue(DB_OPS.MOSTLY_OK);

      const response = await request(app)
        .post('/coursepool/update')
        .send(coursepool_mocks.payload_update)
        .expect('Content-Type', /json/)
        .expect(HTTP.NOT_FOUND);

      expect(response.body).toHaveProperty(
        'error',
        'Item not found in CoursePool',
      );
    });

    it('should return 400 when payload is incomplete', async () => {
      const response = await request(app)
        .post('/coursepool/update')
        .send({})
        .expect('Content-Type', /json/)
        .expect(HTTP.BAD_REQUEST);

      expect(response.body).toHaveProperty(
        'error',
        'Payload of type CoursePoolItem is required for update.',
      );
    });
  });

  describe('POST /coursepool/delete', () => {
    it('should delete course pool successfully', async () => {
      controller.removeCoursePool.mockResolvedValue(DB_OPS.SUCCESS);

      const response = await request(app)
        .post('/coursepool/delete')
        .send(coursepool_mocks.payload_delete)
        .expect('Content-Type', /json/)
        .expect(HTTP.OK);

      expect(response.body).toHaveProperty(
        'message',
        'Item removed from CoursePool',
      );
    });

    it('should return 404 when course pool not found', async () => {
      controller.removeCoursePool.mockResolvedValue(DB_OPS.MOSTLY_OK);

      const response = await request(app)
        .post('/coursepool/delete')
        .send(coursepool_mocks.payload_delete)
        .expect('Content-Type', /json/)
        .expect(HTTP.NOT_FOUND);

      expect(response.body).toHaveProperty(
        'error',
        'Item not found in CoursePool',
      );
    });

    it('should return 400 when course_pool_id is missing', async () => {
      const response = await request(app)
        .post('/coursepool/delete')
        .send({})
        .expect('Content-Type', /json/)
        .expect(HTTP.BAD_REQUEST);

      expect(response.body).toHaveProperty(
        'error',
        'ID is required to remove item from CoursePool.',
      );
    });
  });
});
