jest.mock(
  '../dist/controllers/deficiencyController/deficiencyController',
  () => ({
    __esModule: true,
    default: {
      createDeficiency: jest.fn(),
      getAllDeficienciesByUser: jest.fn(),
      deleteDeficiencyByCoursepoolAndUserId: jest.fn(),
    },
  }),
);

const request = require('supertest');
const express = require('express');
const router = require('../dist/routes/deficiency').default;
const controller =
  require('../dist/controllers/deficiencyController/deficiencyController').default;

const HTTP = require('../dist/Util/HTTPCodes').default;
const def_mocks = require('./__mocks__/deficiency_mocks');

const url = process.DOCKER_URL || 'host.docker.internal:8000';

const app = express();
app.use(express.json());
app.use('/deficiency', router);

describe('Deficiency Routes', () => {
  // Test for adding an deficiency
  describe('POST /deficiency/create', () => {
    it('should return a success message and deficiency data', async () => {
      controller.createDeficiency.mockResolvedValue({
        id: 'random id',
        ...def_mocks.payload_create,
      });

      const response = await request(app)
        .post('/deficiency/create')
        .send(def_mocks.payload_create)
        .expect('Content-Type', /json/)
        .expect(HTTP.CREATED)  ;

      expect(response.body).toHaveProperty(
        'message',
        'Deficiency created successfully.',
      );
      expect(response.body).toHaveProperty('deficiency');
      expect(response.body.deficiency).toHaveProperty('id', 'random id');
    });

    // Bad request, missing fields
    it('should return 400 status and error message when user_id is missing', async () => {
      const response = await request(app)
        .post('/deficiency/create')
        .send({
          coursepool: '1',
          creditsRequired: 120,
        }) // Missing user_id
        .expect('Content-Type', /json/)
        .expect(HTTP.BAD_REQUEST);

      expect(response.body).toHaveProperty(
        'error',
        'Invalid input. Please provide coursepool, user_id, and creditsRequired in valid format.',
      );
    });
  });

  // Test for getting all deficiencies by user_id
  describe('POST /deficiency/getAll', () => {
    it('should return deficiencies related a specific user', async () => {
      controller.getAllDeficienciesByUser.mockResolvedValue(def_mocks.response_getall)
      
      const response = await request(app)
        .post('/deficiency/getAll')
        .send(def_mocks.payload_getall)
        .expect('Content-Type', /json/)
        .expect(HTTP.OK);

      expect(response.body).toHaveProperty(
        'message',
        'Deficiency read successfully.',
      );
      expect(response.body).toHaveProperty('deficiency');
    });

    // No user_id provided case
    it('should return 400 status and error message when user_id is not provided', async () => {
      const response = await request(app)
        .post('/deficiency/getAll')
        .send
        // Empty request body
        ()
        .expect('Content-Type', /json/)
        .expect(HTTP.BAD_REQUEST);

      expect(response.body).toHaveProperty(
        'error',
        'Invalid input. Please provide user_id as a string.',
      );
    });
  });

  // Test for deleting an deficiency
  describe('POST /deficiency/delete', () => {
    it('should return a success message when deficiency is removed successfully', async () => {
      controller.deleteDeficiencyByCoursepoolAndUserId.mockResolvedValue(
        'PASS',
      );

      const response = await request(app)
        .post('/deficiency/delete')
        .send(def_mocks.payload_delete)
        .expect('Content-Type', /json/)
        .expect(HTTP.OK);

      expect(response.body).toHaveProperty(
        'message',
        'Deficiency deleted successfully.',
      );
    });

    // Bad request, missing fields
    it('should return 400 status and error message when request body is missing', async () => {
      const response = await request(app)
        .post('/deficiency/delete')
        .send({
          // missing request body
        })
        .expect('Content-Type', /json/)
        .expect(HTTP.BAD_REQUEST);

      expect(response.body).toHaveProperty(
        'error',
        'Invalid input. Please provide id as a string.',
      );
    });
  });
});
