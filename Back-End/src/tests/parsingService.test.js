// tests/parsingService.test.js
const pdfParse = require('pdf-parse');
const { parseFile } = require('../services/parsingService');
const { AcceptanceLetterParser } = require('@utils/acceptanceLetterParser');
const pythonUtilsApi = require('../utils/pythonUtilsApi');

jest.mock('pdf-parse');
jest.mock('@utils/acceptanceLetterParser');
jest.mock('../utils/pythonUtilsApi');

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
