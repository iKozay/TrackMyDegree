jest.mock(
  '../dist/controllers/exemptionController/exemptionController',
  () => ({
    __esModule: true,
    default: {
      createExemptions: jest.fn(),
      getAllExemptionsByUser: jest.fn(),
      deleteExemptionByCoursecodeAndUserId: jest.fn(),
    },
  }),
);

const request = require('supertest');
const express = require('express');
const router = require('../dist/routes/exemption').default;
const controller =
  require('../dist/controllers/exemptionController/exemptionController').default;

const url = process.DOCKER_URL || 'host.docker.internal:8000';
const newExemption = require('./__mocks__/exemption_mocks').newExemption;
const mockExemption = require('./__mocks__/exemption_mocks').mockExemption;
const exemptionRequest =
  require('./__mocks__/exemption_mocks').exemptionRequest;
const deleteExemptionRequest =
  require('./__mocks__/exemption_mocks').deleteExemptionRequest;

const app = express();
app.use(express.json());
app.use('/exemption', router);

describe('Exemption Routes', () => {
  // Test for adding an exemption
  describe('POST /exemption/create', () => {
    it('should return a success message and exemption data', async () => {
      controller.createExemptions.mockResolvedValueOnce(mockExemption);

      const response = await request(app)
        .post('/exemption/create')
        .send(newExemption)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty(
        'message',
        'Exemptions created successfully.',
      );
      expect(response.body).toHaveProperty('exemptions');
      const exemption = response.body.exemptions[0];

      // Validate the properties of the returned exemption
      expect(exemption).toMatchObject({
        coursecodes: ['COMP335'],
        user_id: '1',
      });
    });

    // Bad request, missing fields
    it('should return 400 status and error message when user_id is missing', async () => {
      const response = await request(app)
        .post('/exemption/create')
        .send({
          id: '2',
          coursecodes: 'COMP335',
        }) // Missing user_id
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Invalid input. Please provide an array of course codes and a user_id as a string.',
      );
    });
    // Service error
    it('should return 403 status', async () => {
      controller.createExemptions.mockRejectedValueOnce(
        new Error('Service error'),
      );
      const response = await request(app)
        .post('/exemption/create')
        .send({
          user_id: '2',
          coursecodes: ['COMP335'],
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Service error');
    });
  });

  // Test for getting all exemptions by user_id
  describe('POST /exemption/getAll', () => {
    it('should return exemptions related a specific user', async () => {
      controller.getAllExemptionsByUser.mockResolvedValueOnce(newExemption);

      const response = await request(app)
        .post('/exemption/getAll')
        .send(exemptionRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('exemption', newExemption);
    });

    // No user_id provided case
    it('should return 400 status and error message when user_id is not provided', async () => {
      const response = await request(app)
        .post('/exemption/getAll')
        .send
        // Empty request body
        ()
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Invalid input. Please provide user_id as a string.',
      );
    });

    it('should return 403 status after service error thrown by controller', async () => {
      controller.getAllExemptionsByUser.mockRejectedValueOnce(
        new Error('Service error'),
      );
      const response = await request(app)
        .post('/exemption/getAll')
        .send(exemptionRequest)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Service error');
    });
  });

  // Test for deleting an exemption
  describe('POST /exemption/delete', () => {
    it('should return a success message when exemption is removed successfully', async () => {
      const response = await request(app)
        .post('/exemption/delete')
        .send(deleteExemptionRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Exemption deleted successfully.',
      );
    });

    // Bad request, missing fields
    it('should return 400 status and error message when request body is missing', async () => {
      const response = await request(app)
        .post('/exemption/delete')
        .send({
          // missing coursecode and user_id field
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Invalid input. Please provide coursecode and user_id as strings.',
      );
    });

    // Invalid input types
    it('should return 400 status and error message when request body is invalid', async () => {
      const response = await request(app)
        .post('/exemption/delete')
        .send({
          coursecode: 'COMP335',
          user_id: 1,
        }) // user_id should be a string
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Invalid input. Please provide coursecode and user_id as strings.',
      );
    });

    it('should return 403 when controller error is thrown', async () => {
      controller.deleteExemptionByCoursecodeAndUserId.mockRejectedValueOnce(
        new Error('Service error'),
      );
      const response = await request(app)
        .post('/exemption/delete')
        .send(deleteExemptionRequest) // user_id should be a string
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Service error');
    });
  });
});
