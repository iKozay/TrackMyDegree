const request = require('supertest');
const express = require('express');

const pdfParsingControllerModule = require('../controllers/pdfParsingController');
const { parseFile } = require('@services/parsingService');

// Pull out the controller and middleware
const pdfParsingController = pdfParsingControllerModule.default;
const uploadMiddleware = pdfParsingControllerModule.uploadMiddleware;
const Buffer = require('node:buffer').Buffer;

// Mock the parsing service
jest.mock('@services/parsingService', () => ({
  parseFile: jest.fn(),
}));

// Create test app
const app = express();
app.post(
  '/api/upload/parse',
  uploadMiddleware,
  (req, res) => pdfParsingController.parseDocument(req, res)
);

describe('PDFParsingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 if no file is uploaded', async () => {
    const response = await request(app).post('/api/upload/parse');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/No file uploaded/);
  });

  test('parses acceptance letter successfully', async () => {
    parseFile.mockResolvedValueOnce({
      programInfo: {
        degree: 'Computer Science',
        firstTerm: 'Fall 2024',
      },
      semesters: [],
    });

    const response = await request(app)
      .post('/api/upload/parse')
      .attach(
        'file',
        Buffer.from('fake pdf'),
        { filename: 'acceptance.pdf', contentType: 'application/pdf' }
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Document parsed successfully');
    expect(response.body.data.programInfo.degree).toBe('Computer Science');
  });

  test('parses transcript successfully', async () => {
    parseFile.mockResolvedValueOnce({
      programInfo: {
        degree: 'B.Sc., Computer Science',
        firstTerm: 'Fall 2024',
      },
      semesters: [
        {
          term: 'Fall 2024',
          courses: [{ code: 'COMP202', grade: 'A' }],
        },
      ],
    });

    const response = await request(app)
      .post('/api/upload/parse')
      .attach(
        'file',
        Buffer.from('fake pdf'),
        { filename: 'transcript.pdf', contentType: 'application/pdf' }
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.semesters[0].courses[0].code).toBe('COMP202');
  });

  test('rejects non-PDF file uploads', async () => {
    const response = await request(app)
      .post('/api/upload/parse')
      .attach(
        'file',
        Buffer.from('not a pdf'),
        { filename: 'file.txt', contentType: 'text/plain' }
      );

    // Multer error → Express → 500
    expect(response.status).toBe(500);
  });

  test('returns 500 when parsing service throws', async () => {
    parseFile.mockRejectedValueOnce(
      new Error('Uploaded PDF is neither a valid transcript nor an acceptance letter.')
    );

    const response = await request(app)
      .post('/api/upload/parse')
      .attach(
        'file',
        Buffer.from('random pdf'),
        { filename: 'random.pdf', contentType: 'application/pdf' }
      );

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Failed to parse transcript/acceptance letter');
  });
});
