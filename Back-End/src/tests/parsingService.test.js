// tests/parsingService.test.js
const pdfParse = require('pdf-parse');
const { parseFile } = require('../services/parsingService');
const { AcceptanceLetterParser } = require('@utils/acceptanceLetterParser');
const pythonUtilsApi = require('../utils/pythonUtilsApi');

jest.mock('pdf-parse');
jest.mock('@utils/acceptanceLetterParser');
jest.mock('../utils/pythonUtilsApi');
const Buffer = require('node:buffer').Buffer;
describe('parseFile', () => {
  const fileBuffer = Buffer.from('fake pdf');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('throws if pdf-parse returns empty text', async () => {
    pdfParse.mockResolvedValue({ text: '' });

    await expect(parseFile(fileBuffer)).rejects.toThrow(
      'No text extracted from PDF.'
    );
  });

  test('parses acceptance letter successfully', async () => {
    pdfParse.mockResolvedValue({ text: 'Congratulations! OFFER OF ADMISSION to CS' });

    const mockParse = jest.fn().mockReturnValue({ program: 'CS' });
    AcceptanceLetterParser.mockImplementation(() => ({ parse: mockParse }));

    const result = await parseFile(fileBuffer);

    expect(mockParse).toHaveBeenCalledWith(
      'Congratulations! OFFER OF ADMISSION to CS'
    );
    expect(result).toEqual({ program: 'CS' });
  });

  test('parses transcript successfully using Python API', async () => {
    pdfParse.mockResolvedValue({ text: 'Student Record - Transcript of Grades' });
    const mockParseTranscript = jest.fn().mockResolvedValue({ program: 'BSc CS' });
    pythonUtilsApi.parseTranscript.mockImplementation(mockParseTranscript);

    const result = await parseFile(fileBuffer);

    expect(mockParseTranscript).toHaveBeenCalledWith(fileBuffer);
    expect(result).toEqual({ program: 'BSc CS' });
  });

  test('throws error for unrecognized PDF', async () => {
    pdfParse.mockResolvedValue({ text: 'Random document text' });

    await expect(parseFile(fileBuffer)).rejects.toThrow(
      'Uploaded PDF is neither a valid transcript nor an acceptance letter.'
    );
  });

  test('logs error if Python API fails', async () => {
    pdfParse.mockResolvedValue({ text: 'Student Record - Transcript' });
    const error = new Error('Python API failed');
    pythonUtilsApi.parseTranscript.mockRejectedValue(error);

    await expect(parseFile(fileBuffer)).rejects.toThrow(error);
  });
});

test('normalizes CWT courses in transcript', async () => {
  const fileBuffer = Buffer.from('fake pdf');
  const pdfText = 'Student Record - Transcript of Grades';
  const mockTranscript = {
    semesters: [
      {
        term: 'Fall 2023',
        courses: [
          { code: 'COMP 248', grade: 'A' },
          { code: 'CWTE 100', grade: 'PASS' },
          { code: 'CWTC 200', grade: 'PASS' },
          { code: 'CWT 300', grade: 'PASS' }
        ]
      }
    ]
  };

  // Mock pdf-parse to return transcript identification text
  const pdfParse = require('pdf-parse');
  pdfParse.mockResolvedValue({ text: pdfText });

  // Mock pythonUtilsApi.parseTranscript to return the mock transcript
  const pythonUtilsApi = require('../utils/pythonUtilsApi');
  pythonUtilsApi.parseTranscript.mockResolvedValue(mockTranscript);

  const result = await parseFile(fileBuffer);

  expect(result.semesters[0].courses[0].code).toBe('COMP 248');
  expect(result.semesters[0].courses[1].code).toBe('CWT100'); // Normalized
  expect(result.semesters[0].courses[2].code).toBe('CWT200'); // Normalized
  expect(result.semesters[0].courses[3].code).toBe('CWT300'); // Already normalized (stripped space)
});
