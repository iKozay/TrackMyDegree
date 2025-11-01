const request = require('supertest');
const express = require('express');
const Database =
  require('../controllers/DBController/DBController').default;
const HTTP = require('../Util/HTTPCodes').default;

// Mock the Database module
jest.mock('../controllers/DBController/DBController', () => ({
  default: {
    getConnection: jest.fn(),
  },
}));

// Create a test app with just the /test-db route
const app = express();
app.use(express.json());

app.get('/test-db', async (req, res) => {
  try {
    const pool = await Database.getConnection();
    if (pool) {
      const result = await pool.request().query('SELECT 1 AS number');
      res.status(HTTP.OK).send({
        message: 'Database connected successfully!',
        result: result.recordset,
      });
    } else {
      throw new Error('Connection error in test-db');
    }
  } catch (error) {
    res
      .status(HTTP.SERVER_ERR)
      .send({ message: 'Database connection failed', error });
  }
});

describe('GET /test-db', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a successful database connection message and result', async () => {
    // Mock successful database connection
    const mockRequest = {
      query: jest.fn().mockResolvedValue({
        recordset: [{ number: 1 }],
      }),
    };
    const mockPool = {
      request: jest.fn().mockReturnValue(mockRequest),
    };
    Database.getConnection.mockResolvedValue(mockPool);

    const response = await request(app)
      .get('/test-db')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({
      message: 'Database connected successfully!',
      result: [{ number: 1 }],
    });
    expect(Database.getConnection).toHaveBeenCalled();
    expect(mockPool.request).toHaveBeenCalled();
    expect(mockRequest.query).toHaveBeenCalledWith('SELECT 1 AS number');
  });

  it('should return error when database connection fails (null pool)', async () => {
    // Mock failed connection (returns null)
    Database.getConnection.mockResolvedValue(null);

    const response = await request(app)
      .get('/test-db')
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body.message).toBe('Database connection failed');
    expect(response.body.error).toBeDefined();
  });

  it('should return error when database query fails', async () => {
    // Mock database connection that throws error on query
    const mockRequest = {
      query: jest.fn().mockRejectedValue(new Error('Query failed')),
    };
    const mockPool = {
      request: jest.fn().mockReturnValue(mockRequest),
    };
    Database.getConnection.mockResolvedValue(mockPool);

    const response = await request(app)
      .get('/test-db')
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body.message).toBe('Database connection failed');
    expect(response.body.error).toBeDefined();
  });

  it('should return error when getConnection throws', async () => {
    // Mock getConnection throwing error
    Database.getConnection.mockRejectedValue(new Error('Connection error'));

    const response = await request(app)
      .get('/test-db')
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body.message).toBe('Database connection failed');
    expect(response.body.error).toBeDefined();
  });
});
