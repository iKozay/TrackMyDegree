// tests/parsingService.test.js
const fs = require('fs'); // require for spyOn
const pdfParse = require('pdf-parse');
const { parseFile } = require('../services/parsingService');
const { TranscriptParser } = require('@utils/transcriptParser');
const { AcceptanceLetterParser } = require('@utils/acceptanceLetterParser');
const { randomUUID } = require('crypto');

jest.mock('pdf-parse');
jest.mock('@utils/transcriptParser');
jest.mock('@utils/acceptanceLetterParser');
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

describe('parseFile', () => {
  const fileBuffer = Buffer.from('fake pdf');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('throws if pdf-parse returns empty text', async () => {
    pdfParse.mockResolvedValue({ text: '' });
    await expect(parseFile(fileBuffer)).rejects.toThrow('No text extracted from PDF.');
  });

  test('parses acceptance letter successfully', async () => {
    pdfParse.mockResolvedValue({ text: 'Congratulations! OFFER OF ADMISSION to CS' });
    const mockParse = jest.fn().mockReturnValue({ program: 'CS' });
    AcceptanceLetterParser.mockImplementation(() => ({ parse: mockParse }));

    const result = await parseFile(fileBuffer);

    expect(mockParse).toHaveBeenCalledWith('Congratulations! OFFER OF ADMISSION to CS');
    expect(result).toEqual({ program: 'CS' });
  });

  test('parses transcript successfully and cleans up temp file', async () => {
    pdfParse.mockResolvedValue({ text: 'Student Record - Transcript of Grades' });
    const mockParseFromFile = jest.fn().mockResolvedValue({ program: 'BSc CS' });
    TranscriptParser.mockImplementation(() => ({ parseFromFile: mockParseFromFile }));

    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const unlinkSpy = jest.spyOn(fs, 'unlink').mockImplementation((path, cb) => cb(null));

    const result = await parseFile(fileBuffer);

    expect(writeSpy).toHaveBeenCalled();
    expect(mockParseFromFile).toHaveBeenCalled();
    expect(unlinkSpy).toHaveBeenCalled();
    expect(result).toEqual({ program: 'BSc CS' });

    writeSpy.mockRestore();
    unlinkSpy.mockRestore();
  });

  test('throws error for unrecognized PDF', async () => {
    pdfParse.mockResolvedValue({ text: 'Random document text' });
    await expect(parseFile(fileBuffer)).rejects.toThrow(
      'Uploaded PDF is neither a valid transcript nor an acceptance letter.'
    );
  });

  test('logs cleanup error but does not throw', async () => {
    pdfParse.mockResolvedValue({ text: 'Student Record - Transcript' });
    const mockParseFromFile = jest.fn().mockResolvedValue({ program: 'BSc CS' });
    TranscriptParser.mockImplementation(() => ({ parseFromFile: mockParseFromFile }));

    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const unlinkSpy = jest.spyOn(fs, 'unlink').mockImplementation((path, cb) =>
      cb(new Error('unlink failed'))
    );
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await parseFile(fileBuffer);

    expect(writeSpy).toHaveBeenCalled();
    expect(result).toEqual({ program: 'BSc CS' });
    expect(consoleSpy).toHaveBeenCalledWith('Failed to cleanup temp file:', expect.any(Error));

    writeSpy.mockRestore();
    unlinkSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
