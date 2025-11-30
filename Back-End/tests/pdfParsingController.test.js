const request = require('supertest');
const express = require('express');
const pdfParsingControllerModule = require('../controllers/pdfParsingController');
const pdfParse = require('pdf-parse');
const { Buffer } = require('node:buffer');
// Pull out the controller and middleware
const pdfParsingController = pdfParsingControllerModule.default;
const uploadMiddleware = pdfParsingControllerModule.uploadMiddleware;

// Mock pdf-parse so we don't actually read PDFs
jest.mock('pdf-parse', () => jest.fn());

// Mock the custom parsers
jest.mock('../utils/pythonUtilsApi', () => ({
  parseTranscript: jest.fn().mockResolvedValue({
      programInfo: {
        degree: 'B.Sc., Computer Science',
        firstTerm: 'Fall 2024',
        minimumProgramLength: 120,
      },
      semesters: [
        {
          term: 'Fall 2024',
          courses: [{ code: 'COMP202', grade: 'A' }],
        },
      ],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: [],
  })
}));

jest.mock('@utils/acceptanceLetterParser', () => ({
  AcceptanceLetterParser: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue({
      programInfo: {
        degree: 'Computer Science',
        firstTerm: 'Fall 2024',
      },
      semesters: [],
      exemptedCourses: [],
      deficiencyCourses: [],
      transferedCourses: [],
    }),
  })),
}));

// Create test app
const app = express();
app.post('/api/upload/parse', uploadMiddleware, (req, res) =>
  pdfParsingController.parseDocument(req, res)
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

  test('parses acceptance letter PDF successfully', async () => {
    pdfParse.mockResolvedValueOnce({
      text: 'Congratulations! OFFER OF ADMISSION to Computer Science',
    });

    const response = await request(app)
      .post('/api/upload/parse')
      .attach('file', Buffer.from('fake pdf data'), { filename: 'acceptance.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Document parsed successfully');
    expect(response.body.data.programInfo).toBeDefined();
    expect(response.body.data.programInfo.degree).toBe('Computer Science');
  });

  test('parses transcript PDF successfully', async () => {
    pdfParse.mockResolvedValueOnce({
      text: 'Student Record - Transcript of Grades',
    });

    const response = await request(app)
      .post('/api/upload/parse')
      .attach('file', Buffer.from('fake pdf data'), { filename: 'transcript.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.programInfo).toBeDefined();
    expect(response.body.data.programInfo.degree).toContain('Computer Science');
    expect(response.body.data.semesters).toBeDefined();
    expect(response.body.data.semesters[0].courses[0].code).toBe('COMP202');
  });

  test('rejects non-PDF file uploads', async () => {
    const response = await request(app)
      .post('/api/upload/parse')
      .attach('file', Buffer.from('not a pdf'), { filename: 'file.txt', contentType: 'text/plain' });

    expect(response.status).toBe(500);
  });

  test('returns 400 for unrecognized PDF', async () => {
    pdfParse.mockResolvedValueOnce({
      text: 'This is just some random document text.',
    });

    const response = await request(app)
      .post('/api/upload/parse')
      .attach('file', Buffer.from('random pdf'), { filename: 'random.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/neither a valid transcript nor an acceptance letter/);
  });
});
