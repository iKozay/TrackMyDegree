const request = require('supertest');
const express = require('express');
const pdfParsingControllerModule = require('../controllers/pdfParsingController/pdfParsingController');
const pdfParse = require('pdf-parse');

// Pull out the controller and middleware
const pdfParsingController = pdfParsingControllerModule.default;
const uploadMiddleware = pdfParsingControllerModule.uploadMiddleware;

// Mock pdf-parse so we don't actually read PDFs
jest.mock('pdf-parse', () => jest.fn());

// Mock the custom parsers
jest.mock('@Util/transcriptParser', () => ({
  TranscriptParser: jest.fn().mockImplementation(() => ({
    parseFromBuffer: jest.fn().mockResolvedValue({
      terms: [
        { term: 'Fall', year: 2024, courses: [{ courseCode: 'COMP 202' }], termGPA: '3.7' },
      ],
      programHistory: [
        { degreeType: 'B.Sc.', major: 'Computer Science' },
      ],
      transferCredits: [],
      additionalInfo: { minCreditsRequired: 120 },
    }),
  })),
}));

jest.mock('@Util/acceptanceLetterParser', () => ({
  AcceptanceLetterParser: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue({
      name: 'John Doe',
      program: 'Computer Science',
      institution: 'Example University',
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
    expect(response.body.data.name).toBe('John Doe');
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
    expect(response.body.data.details.degreeConcentration).toContain('Computer Science');
    expect(response.body.data.extractedCourses[0].courses).toContain('COMP202');
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
