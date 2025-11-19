const express = require('express');
const request = require('supertest');

// ---- Mocks ----

// assignJobId middleware
const mockAssignJobId = jest.fn((req, res, next) => {
  req.jobId = 'test-job-id';
  next();
});

jest.mock('../middleware/assignJobId', () => ({
  assignJobId: mockAssignJobId,
}));

// uploadWithJobId (multer instance: we just care about the middleware it returns)
const mockUploadFileMiddleware = jest.fn((req, res, next) => next());
const mockUploadSingle = jest.fn(() => mockUploadFileMiddleware);

jest.mock('../middleware/uploadWithJobId', () => ({
  uploadWithJobId: {
    single: mockUploadSingle,
  },
}));

// uploadController
const mockUploadController = jest.fn((req, res) =>
  res.status(200).json({
    route: req.path,
    jobId: req.jobId || null,
    ok: true,
  }),
);

jest.mock('../controllers/uploadController', () => ({
  uploadController: mockUploadController,
}));

// ---- Import router AFTER mocks ----
const routerModule = require('../routes/uploadRoutes'); // <-- adjust path if needed
const router = routerModule.default || routerModule;

// Build a small test app using only this router
const app = express();
app.use(express.json());
app.use('/', router);

describe('upload routes (/file and /form)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /file runs assignJobId, uploadWithJobId middleware and uploadController', async () => {
    const res = await request(app).post('/file').send({});

    // assignJobId and uploadController must be called for this request
    expect(mockAssignJobId).toHaveBeenCalled();
    expect(mockUploadController).toHaveBeenCalled();

    // The middleware returned by .single('file') should be called on /file
    expect(mockUploadFileMiddleware).toHaveBeenCalled();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      route: '/file',
      jobId: 'test-job-id',
      ok: true,
    });
  });

  test('POST /form runs assignJobId and uploadController (no upload middleware)', async () => {
    const res = await request(app).post('/form').send({ some: 'data' });

    expect(mockAssignJobId).toHaveBeenCalled();
    expect(mockUploadController).toHaveBeenCalled();

    // Upload middleware should NOT run on /form
    expect(mockUploadFileMiddleware).not.toHaveBeenCalled();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      route: '/form',
      jobId: 'test-job-id',
      ok: true,
    });
  });
});
