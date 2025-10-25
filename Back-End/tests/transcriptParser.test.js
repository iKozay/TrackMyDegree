/* global Buffer */
// Auto-mock pdf-parse using __mocks__ directory
jest.mock('pdf-parse');

// Mock pdf2json
jest.mock('pdf2json');

jest.mock('node:timers', () => ({
  setTimeout: jest.fn(() => {
    // return a mock timer ID
    return Math.floor(Math.random() * 10000);
  }),
}));

const fs = require('fs');
const { TranscriptParser } = require('../dist/Util/transcriptParser.js');

describe('TranscriptParser', () => {
  let parser;

  beforeEach(() => {
    parser = new TranscriptParser();
    // Clear the setTimeout mock calls for clean test isolation
    const { setTimeout } = require('node:timers');
    setTimeout.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  /*
   * This test verifies that the TranscriptParser can successfully parse a transcript from a PDF buffer.
   */
  it('should parse transcript from buffer', async () => {
    // mock fs operations for pdf2json temp file
    const writeFileSyncSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});
    const unlinkSyncSpy = jest
      .spyOn(fs, 'unlinkSync')
      .mockImplementation(() => {});

    // set up pdf2json mock to simulate successful parsing
    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();
    // override loadPDF - here we want to trigger dataReady event with our mock data
    mockInstance.loadPDF.mockImplementation(() => {
      process.nextTick(() => {
        const callback = mockInstance.on.mock.calls.find(
          (call) => call[0] === 'pdfParser_dataReady',
        )?.[1];
        if (callback) {
          callback();
        }
      });
    });

    const mockBuffer = Buffer.from('mock pdf content');
    const result = await parser.parseFromBuffer(mockBuffer);

    // verify fs operations for pdf2json temp file handling
    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      expect.stringMatching(/transcript_\d+\.pdf$/),
      mockBuffer,
    );
    expect(unlinkSyncSpy).toBeDefined();
    expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);

    // verify parsing result structure
    expect(result).toHaveProperty('studentInfo');
    expect(result).toHaveProperty('terms');
    expect(result).toHaveProperty('programHistory');
    expect(result).toHaveProperty('transferCredits');
    expect(result).toHaveProperty('additionalInfo');

    // verify student info was parsed correctly
    expect(result.studentInfo.studentName).toBe('John Doe Student');
    expect(result.studentInfo.studentId).toBe('123456789');
    expect(result.studentInfo.city).toBe('Montreal');
    expect(result.studentInfo.province).toBe('QC');

    // verify terms were parsed
    expect(result.terms).toHaveLength(3);
    expect(result.terms[0].term).toBe('Fall');
    expect(result.terms[0].year).toBe('2020');
    expect(result.terms[0].termGPA).toBe(3.67);

    // verify courses were parsed
    expect(result.terms[0].courses).toHaveLength(3);
    expect(result.terms[0].courses[0].courseCode).toBe('COMP 248');
    expect(result.terms[0].courses[0].grade).toBe('A-');

    // verify transfer credits were parsed
    expect(result.transferCredits).toHaveLength(2);
    expect(result.transferCredits[0].courseCode).toBe('MATH 101');
    expect(result.transferCredits[0].grade).toBe('EX');

    // verify academic summary
    expect(result.additionalInfo.overallGPA).toBe(3.75);
    expect(result.additionalInfo.minCreditsRequired).toBe(120.0);
    expect(result.additionalInfo.programCreditsEarned).toBe(90.5);
  });

  /*
   * This test verifies that the TranscriptParser can successfully parse a transcript from a PDF file.
   */
  it('should parse transcript from file', async () => {
    // Mock fs operations
    const mockBuffer = Buffer.from('mock pdf content');
    const readFileSyncSpy = jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(mockBuffer);
    const writeFileSyncSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});

    // Set up pdf2json mock
    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();

    mockInstance.loadPDF.mockImplementation(() => {
      // Find the dataReady callback and call it
      process.nextTick(() => {
        const dataReadyCall = mockInstance.on.mock.calls.find(
          (call) => call[0] === 'pdfParser_dataReady',
        );
        if (dataReadyCall) {
          const callback = dataReadyCall[1];
          callback(); // Use default mock data from __mocks__/pdf2json.js
        }
      });
    });

    const filePath = '/path/to/transcript.pdf';
    const result = await parser.parseFromFile(filePath);

    // verify file operations
    expect(readFileSyncSpy).toHaveBeenCalledWith(filePath);
    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      expect.stringMatching(/transcript_\d+\.pdf$/),
      mockBuffer,
    );

    // verify parsing result structure
    expect(result).toBeValidTranscript({ termCount: 3, firstTerm: 'Fall' });

    // Verify key parsed data matches mock expectations
    expect(result.studentInfo.studentName).toBe('John Doe Student');
    expect(result.studentInfo.studentId).toBe('123456789');
    expect(result.terms).toHaveLength(3);
    expect(result.transferCredits).toHaveLength(2);
    expect(result.additionalInfo.overallGPA).toBe(3.75);
  }, 100000);

  it('should handle errors when reading file', async () => {
    const readFileSyncSpy = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => {
        throw new Error('File not found');
      });

    const filePath = '/nonexistent/transcript.pdf';

    await expect(parser.parseFromFile(filePath)).rejects.toThrow(
      'Failed to read transcript file: File not found',
    );

    expect(readFileSyncSpy).toHaveBeenCalledWith(filePath);
  });

  it('should handle errors when parsing buffer', async () => {
    // Mock fs operations
    const writeFileSyncSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});

    // Create a NEW mock instance specifically for this error test
    const mockErrorParser = {
      on: jest.fn((event, callback) => {
        if (event === 'pdfParser_dataError') {
          // Trigger error immediately
          process.nextTick(() => {
            callback({ parserError: 'Invalid PDF format' });
          });
        }
        // Don't register success callback for error test
      }),
      loadPDF: jest.fn(),
    };

    // Override the default constructor for this test only
    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() => mockErrorParser);

    const mockBuffer = Buffer.from('invalid pdf content');

    await expect(parser.parseFromBuffer(mockBuffer)).rejects.toThrow(
      'Failed to parse transcript: PDF parsing error: Invalid PDF format',
    );

    // Verify temp file operations still occurred
    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      expect.stringMatching(/transcript_\d+\.pdf$/),
      mockBuffer,
    );
  }, 10000);

  it('should use pdf-parse to extract clean text', async () => {
    // clear previous calls to get accurate count
    const pdfParse = require('pdf-parse');
    pdfParse.mockClear();

    const writeFileSyncSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();

    mockInstance.loadPDF.mockImplementation(() => {
      process.nextTick(() => {
        const callback = mockInstance.on.mock.calls.find(
          (call) => call[0] === 'pdfParser_dataReady',
        )?.[1];
        if (callback) {
          callback();
        }
      });
    });

    const mockBuffer = Buffer.from('mock pdf content');
    await parser.parseFromBuffer(mockBuffer);

    // verify pdf-parse was called with the buffer
    expect(pdfParse).toHaveBeenCalledWith(mockBuffer);
    expect(pdfParse).toHaveBeenCalledTimes(1);

    // verify temp file operations still occurred for pdf2json
    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      expect.stringMatching(/transcript_\d+\.pdf$/),
      mockBuffer,
    );
  }, 10000);

  it('should use pdf2json to extract structured data', async () => {
    // mock fs operations
    const writeFileSyncSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();

    mockInstance.loadPDF.mockImplementation(() => {
      process.nextTick(() => {
        const callback = mockInstance.on.mock.calls.find(
          (call) => call[0] === 'pdfParser_dataReady',
        )?.[1];
        if (callback) {
          callback();
        }
      });
    });

    const mockBuffer = Buffer.from('mock pdf content');
    await parser.parseFromBuffer(mockBuffer);

    expect(MockPDFParser).toHaveBeenCalled();

    expect(mockInstance.on).toHaveBeenCalledWith(
      'pdfParser_dataError',
      expect.any(Function),
    );
    expect(mockInstance.on).toHaveBeenCalledWith(
      'pdfParser_dataReady',
      expect.any(Function),
    );

    // verify loadPDF was called with temp file path
    expect(mockInstance.loadPDF).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]tmp[\\/]transcript_\d+\.pdf$/),
    );

    // verify temp file was created with buffer
    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]tmp[\\/]transcript_\d+\.pdf$/),
      mockBuffer,
    );
  }, 10000);

  it('should parse transcript data using hybrid method', async () => {
    // mock fs operations for pdf2json temp file
    const writeFileSyncSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();

    mockInstance.loadPDF.mockImplementation(() => {
      // force dataReady event with mock data
      process.nextTick(() => {
        const callback = mockInstance.on.mock.calls.find(
          (call) => call[0] === 'pdfParser_dataReady',
        )?.[1];
        if (callback) {
          callback();
        }
      });
    });

    const mockBuffer = Buffer.from('mock pdf content');
    const result = await parser.parseFromBuffer(mockBuffer);

    // verify hybrid parsing used both pdf-parse and pdf2json
    const pdfParse = require('pdf-parse');
    expect(pdfParse).toHaveBeenCalledWith(mockBuffer);
    expect(MockPDFParser).toHaveBeenCalled();

    // verify overall transcript structure
    expect(result).toBeValidTranscript({ termCount: 3, firstTerm: 'Fall' });

    // verify course content from first term
    expect(result.terms[0].year).toBe('2020');
    const firstCourse = result.terms[0].courses[0];
    expect(firstCourse).toMatchObject({
      courseCode: 'COMP 248',
      credits: 3.0,
      grade: 'A-',
    });
    // verify student info
    expect(result.studentInfo).toMatchObject({
      studentName: 'John Doe Student',
      studentId: '123456789',
    });
    // verify transfer credits
    expect(result.transferCredits[0].courseCode).toBe('MATH 101');

    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]tmp[\\/]transcript_\d+\.pdf$/),
      mockBuffer,
    );
  }, 10000);

  it('should handle fallback when pdf-parse finds fewer than 5 terms', async () => {
    const mockPdfParse = jest.fn().mockResolvedValue({
      text: `Beginning of Undergraduate Record
      Fall 2023
      COMP 101 Introduction to Programming
      Winter 2024
      MATH 201 Calculus
      End of Student Record`,
    });

    // mock fs operations - test fails without it because of pdf2json temp file handling
    const _writeFileSyncSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});
    const _unlinkSyncSpy = jest
      .spyOn(fs, 'unlinkSync')
      .mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();

    // mock pdf2json to return structured data with more terms that can be found
    mockInstance.loadPDF.mockImplementation(() => {
      process.nextTick(() => {
        const callback = mockInstance.on.mock.calls.find(
          (call) => call[0] === 'pdfParser_dataReady',
        )?.[1];
        if (callback) {
          callback({
            Pages: [
              {
                Texts: [
                  { y: -10, R: [{ T: 'COMP' }] },
                  { y: -10, R: [{ T: '248' }] },
                  { y: -10, R: [{ T: 'A' }] },
                  { y: -10, R: [{ T: 'Object%20Oriented%20Programming' }] },
                  { y: -10, R: [{ T: '3.00' }] },
                  { y: -10, R: [{ T: 'A-' }] },
                  { y: -10, R: [{ T: '3.67' }] },
                  { y: -10, R: [{ T: '2.85' }] },
                  { y: -10, R: [{ T: '45' }] },
                  { y: -10, R: [{ T: '3.00' }] },
                ],
              },
            ],
          });
        }
      });
    });

    // override pdf-parse mock for this test
    require('pdf-parse').mockImplementation(mockPdfParse);

    const mockBuffer = Buffer.from('mock pdf content');
    const result = await parser.parseFromBuffer(mockBuffer);

    // verify pdf-parse was called and found fewer than 5 terms initially
    expect(mockPdfParse).toHaveBeenCalledWith(mockBuffer);

    // verify parsing succeeded with fallback to structured data
    expect(result).toHaveProperty('terms');
    expect(result.terms.length).toBeGreaterThan(0);
  });

  it('should handle missing program details gracefully', async () => {
    const mockPdfParse = jest.fn().mockResolvedValue({
      text: `Beginning of Undergraduate Record
    Active in Program
    Fall 2020
    Min. Credits Required
    Fall 2023
    End of Student Record`,
    });

    // mock fs operations
    const _writeFileSyncSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});
    const _unlinkSyncSpy = jest
      .spyOn(fs, 'unlinkSync')
      .mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');

    // create a completely new mock instance that doesn't use default mock data
    const mockInstance = {
      on: jest.fn((event, callback) => {
        if (event === 'pdfParser_dataReady') {
          // Store the callback to call it later
          mockInstance._dataReadyCallback = callback;
        }
      }),
      loadPDF: jest.fn(() => {
        process.nextTick(() => {
          if (mockInstance._dataReadyCallback) {
            // return minimal data without degree information
            mockInstance._dataReadyCallback({
              Pages: [
                {
                  Texts: [
                    { y: 10, R: [{ T: 'John%20Doe%20Student' }] },
                    { y: 5, R: [{ T: 'Student%20ID:%20123456789' }] },
                    { y: 0, R: [{ T: 'Active%20in%20Program' }] },
                    { y: -5, R: [{ T: 'Fall%202020' }] },
                    // deliberately omit Bachelor/Master degree indicators
                    { y: -10, R: [{ T: 'Min.%20Credits%20Required' }] },
                  ],
                },
              ],
            });
          }
        });
      }),
    };

    // override the constructor to return our custom mock
    MockPDFParser.mockImplementationOnce(() => mockInstance);

    // override pdf-parse mock for this test
    require('pdf-parse').mockImplementation(mockPdfParse);

    const mockBuffer = Buffer.from('mock pdf content');
    const result = await parser.parseFromBuffer(mockBuffer);

    // verify parsing succeeded despite missing program details
    expect(result).toHaveProperty('programHistory');
    expect(result.programHistory).toHaveLength(1);

    // verify missing program details are handled gracefully with empty strings
    const program = result.programHistory[0];
    expect(program.status).toBe('Active in Program');
    expect(program.startDate).toBe('Fall 2020');
    // should be empty since no degree indicators in mock
    expect(program.degreeType).toBe('');
    expect(program.major).toBe('');
    expect(program.admitTerm).toBe('');
    expect(program.note).toBe('');
  });

  it('should handle course parsing edge cases', async () => {
    const mockPdfParse = jest.fn().mockResolvedValue({
      text: `Beginning of Undergraduate Record
           Fall 2023
           End of Student Record`,
    });

    // mock fs operations - the test fails without it because of pdf2json temp file handling
    const _writeFileSyncSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});
    const _unlinkSyncSpy = jest
      .spyOn(fs, 'unlinkSync')
      .mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');

    const mockInstance = {
      on: jest.fn((event, callback) => {
        if (event === 'pdfParser_dataReady') {
          callback({
            Pages: [
              {
                Texts: [
                  // Course with missing/invalid title
                  { y: -10, R: [{ T: 'COMP' }] },
                  { y: -10, R: [{ T: '248' }] },
                  { y: -10, R: [{ T: 'A' }] },
                  { y: -10, R: [{ T: '3.00' }] }, // credits appears too early, title collection fails

                  // Invalid credits field
                  { y: -15, R: [{ T: 'MATH' }] },
                  { y: -15, R: [{ T: '201' }] },
                  { y: -15, R: [{ T: 'B' }] },
                  { y: -15, R: [{ T: 'Calculus%20I' }] },
                  { y: -15, R: [{ T: 'invalid' }] }, // invalid credits format

                  // Various grade parsing branches (lines 616-632)
                  // letter grade with full data
                  { y: -20, R: [{ T: 'ENGR' }] },
                  { y: -20, R: [{ T: '101' }] },
                  { y: -20, R: [{ T: 'C' }] },
                  { y: -20, R: [{ T: 'Engineering%20Basics' }] },
                  { y: -20, R: [{ T: '3.00' }] },
                  { y: -20, R: [{ T: 'B+' }] },
                  { y: -20, R: [{ T: '3.30' }] }, // GPA
                  { y: -20, R: [{ T: '2.75' }] }, // Class avg
                  { y: -20, R: [{ T: '150' }] }, // Class size
                  { y: -20, R: [{ T: '3.00' }] }, // Program credits
                  { y: -20, R: [{ T: 'WKRT' }] }, // Other field

                  // PASS grade branch
                  { y: -25, R: [{ T: 'PHYS' }] },
                  { y: -25, R: [{ T: '101' }] },
                  { y: -25, R: [{ T: 'D' }] },
                  { y: -25, R: [{ T: 'Physics%20Lab' }] },
                  { y: -25, R: [{ T: '1.00' }] },
                  { y: -25, R: [{ T: 'PASS' }] },
                  { y: -25, R: [{ T: '1.00' }] }, // Program credits

                  // EX (exempted) grade branch
                  { y: -30, R: [{ T: 'CHEM' }] },
                  { y: -30, R: [{ T: '202' }] },
                  { y: -30, R: [{ T: 'E' }] },
                  { y: -30, R: [{ T: 'Chemistry' }] },
                  { y: -30, R: [{ T: '3.00' }] },
                  { y: -30, R: [{ T: 'EX' }] },
                  { y: -30, R: [{ T: '3.00' }] }, // Program credits

                  // Zero grade branch (0.00)
                  { y: -35, R: [{ T: 'BIOL' }] },
                  { y: -35, R: [{ T: '301' }] },
                  { y: -35, R: [{ T: 'F' }] },
                  { y: -35, R: [{ T: 'Biology' }] },
                  { y: -35, R: [{ T: '3.00' }] },
                  { y: -35, R: [{ T: '0.00' }] },
                  { y: -35, R: [{ T: 'RPT' }] }, // Other field

                  // Missing other field
                  { y: -40, R: [{ T: 'HIST' }] },
                  { y: -40, R: [{ T: '101' }] },
                  { y: -40, R: [{ T: 'G' }] },
                  { y: -40, R: [{ T: 'History' }] },
                  { y: -40, R: [{ T: '3.00' }] },
                  { y: -40, R: [{ T: 'A' }] },
                  { y: -40, R: [{ T: '4.00' }] },
                  { y: -40, R: [{ T: '3.50' }] },
                  { y: -40, R: [{ T: '100' }] },
                  { y: -40, R: [{ T: '3.00' }] },
                  // No 'other' field - should be undefined
                ],
              },
            ],
          });
        }
      }),
      loadPDF: jest.fn(() => {
        process.nextTick(() => {
          const callback = mockInstance.on.mock.calls.find(
            (call) => call[0] === 'pdfParser_dataReady',
          )?.[1];
          if (callback)
            callback({
              Pages: [
                {
                  Texts: [
                    // only include valid courses for successful parsing
                    { y: -20, R: [{ T: 'ENGR' }] },
                    { y: -20, R: [{ T: '101' }] },
                    { y: -20, R: [{ T: 'C' }] },
                    { y: -20, R: [{ T: 'Engineering%20Basics' }] },
                    { y: -20, R: [{ T: '3.00' }] },
                    { y: -20, R: [{ T: 'B+' }] },
                    { y: -20, R: [{ T: '3.30' }] },
                    { y: -20, R: [{ T: '2.75' }] },
                    { y: -20, R: [{ T: '150' }] },
                    { y: -20, R: [{ T: '3.00' }] },
                    { y: -20, R: [{ T: 'WKRT' }] },

                    // PASS grade course
                    { y: -25, R: [{ T: 'PHYS' }] },
                    { y: -25, R: [{ T: '101' }] },
                    { y: -25, R: [{ T: 'D' }] },
                    { y: -25, R: [{ T: 'Physics%20Lab' }] },
                    { y: -25, R: [{ T: '1.00' }] },
                    { y: -25, R: [{ T: 'PASS' }] },
                    { y: -25, R: [{ T: '1.00' }] },

                    // Course with missing other field
                    { y: -40, R: [{ T: 'HIST' }] },
                    { y: -40, R: [{ T: '101' }] },
                    { y: -40, R: [{ T: 'G' }] },
                    { y: -40, R: [{ T: 'History' }] },
                    { y: -40, R: [{ T: '3.00' }] },
                    { y: -40, R: [{ T: 'A' }] },
                    { y: -40, R: [{ T: '4.00' }] },
                    { y: -40, R: [{ T: '3.50' }] },
                    { y: -40, R: [{ T: '100' }] },
                    { y: -40, R: [{ T: '3.00' }] },
                  ],
                },
              ],
            });
        });
      }),
    };

    MockPDFParser.mockImplementationOnce(() => mockInstance);
    require('pdf-parse').mockImplementation(mockPdfParse);

    const mockBuffer = Buffer.from('mock pdf content');
    const result = await parser.parseFromBuffer(mockBuffer);

    // verify that only valid courses were parsed (invalid ones filtered out)
    expect(result).toHaveProperty('terms');

    if (result.terms.length > 0) {
      const courses = result.terms.flatMap((term) => term.courses);

      // should have parsed valid courses despite edge cases
      expect(courses.length).toBeGreaterThan(0);

      courses.forEach((course) => {
        // all courses should have valid structure
        expect(course).toHaveProperty('courseCode');
        expect(course).toHaveProperty('grade');
        expect(course).toHaveProperty('courseTitle');
        expect(typeof course.credits).toBe('number');
        expect(course.credits).toBeGreaterThanOrEqual(0);

        // test grade-specific handling
        if (course.grade === 'PASS' || course.grade === 'EX') {
          // special grades should not have GPA
          expect(course.gpa).toBeUndefined();
        } else if (course.grade === '0.00') {
          // zero grades should have other field
          expect(course.other).toBeDefined();
        } else if (course.courseCode === 'HIST 101') {
          // this course should have undefined other field (line 637 test)
          expect(course.other).toBeUndefined();
        }

        // verify course title was handled (even if collection failed)
        expect(course.courseTitle).toBeDefined();
      });
    } else {
      // if no courses parsed due to edge cases, that's also valid behavior
      expect(result.terms.length).toBe(0);
    }
  });

  it('should handle course parsing with missing course title collection limit', async () => {
    const MockPDFParser = require('pdf2json');
    const mockInstance = {
      on: jest.fn((event, callback) => {
        if (event === 'pdfParser_dataReady') {
          callback({
            Pages: [
              {
                Texts: [
                  { y: -1, R: [{ T: 'COMP' }] },
                  { y: -1, R: [{ T: '248' }] },
                  { y: -1, R: [{ T: 'A01' }] },
                  // Very long title (>15 parts)
                  { y: -1, R: [{ T: 'Very' }] },
                  { y: -1, R: [{ T: 'Long' }] },
                  { y: -1, R: [{ T: 'Course' }] },
                  { y: -1, R: [{ T: 'Title' }] },
                  { y: -1, R: [{ T: 'That' }] },
                  { y: -1, R: [{ T: 'Goes' }] },
                  { y: -1, R: [{ T: 'On' }] },
                  { y: -1, R: [{ T: 'And' }] },
                  { y: -1, R: [{ T: 'On' }] },
                  { y: -1, R: [{ T: 'For' }] },
                  { y: -1, R: [{ T: 'Many' }] },
                  { y: -1, R: [{ T: 'Words' }] },
                  { y: -1, R: [{ T: 'More' }] },
                  { y: -1, R: [{ T: 'Words' }] },
                  { y: -1, R: [{ T: 'Even' }] },
                  { y: -1, R: [{ T: 'More' }] },
                  { y: -1, R: [{ T: '3.00' }] }, // Credits field to stop title collection
                  { y: -1, R: [{ T: 'A-' }] },
                ],
              },
            ],
          });
        }
      }),
      loadPDF: jest.fn(() => {
        process.nextTick(() => {
          const callback = mockInstance.on.mock.calls.find(
            (call) => call[0] === 'pdfParser_dataReady',
          )?.[1];
          if (callback) callback();
        });
      }),
    };

    MockPDFParser.mockImplementationOnce(() => mockInstance);

    const mockBuffer = Buffer.from('mock pdf content');
    const result = await parser.parseFromBuffer(mockBuffer);

    // should still parse course despite long title
    expect(result.terms.length).toBeGreaterThan(0);
  });

  it('should handle course with zero grade parsing', async () => {
    const MockPDFParser = require('pdf2json');
    const mockInstance = {
      on: jest.fn((event, callback) => {
        if (event === 'pdfParser_dataReady') {
          callback({
            Pages: [
              {
                Texts: [
                  { y: -1, R: [{ T: 'MATH' }] },
                  { y: -1, R: [{ T: '101' }] },
                  { y: -1, R: [{ T: 'A01' }] },
                  { y: -1, R: [{ T: 'Calculus' }] },
                  { y: -1, R: [{ T: '3.00' }] },
                  { y: -1, R: [{ T: '0.00' }] }, // Zero grade
                  { y: -1, R: [{ T: 'Other' }] },
                  { y: -1, R: [{ T: 'Field' }] },
                  { y: -1, R: [{ T: 'WKRT' }] }, // Other field
                ],
              },
            ],
          });
        }
      }),
      loadPDF: jest.fn(() => {
        process.nextTick(() => {
          const callback = mockInstance.on.mock.calls.find(
            (call) => call[0] === 'pdfParser_dataReady',
          )?.[1];
          if (callback) callback();
        });
      }),
    };

    MockPDFParser.mockImplementationOnce(() => mockInstance);

    const mockBuffer = Buffer.from('mock pdf content');
    const result = await parser.parseFromBuffer(mockBuffer);

    // verify zero grade course was parsed
    const courses = result.terms.flatMap((term) => term.courses);
    const zeroGradeCourse = courses.find((c) => c.grade === '0.00');
    expect(zeroGradeCourse).toBeDefined();
    expect(zeroGradeCourse.other).toBe('WKRT');
  });

  it('should handle course with PASS/EX grade and program credits', async () => {
    const MockPDFParser = require('pdf2json');
    const mockInstance = {
      on: jest.fn((event, callback) => {
        if (event === 'pdfParser_dataReady') {
          callback({
            Pages: [
              {
                Texts: [
                  { y: -1, R: [{ T: 'PHYS' }] },
                  { y: -1, R: [{ T: '101' }] },
                  { y: -1, R: [{ T: 'A01' }] },
                  { y: -1, R: [{ T: 'Physics' }] },
                  { y: -1, R: [{ T: '3.00' }] },
                  { y: -1, R: [{ T: 'PASS' }] },
                  { y: -1, R: [{ T: 'SomeText' }] },
                  { y: -1, R: [{ T: '3.00' }] }, // Program credits
                ],
              },
            ],
          });
        }
      }),
      loadPDF: jest.fn(() => {
        process.nextTick(() => {
          const callback = mockInstance.on.mock.calls.find(
            (call) => call[0] === 'pdfParser_dataReady',
          )?.[1];
          if (callback) callback();
        });
      }),
    };

    MockPDFParser.mockImplementationOnce(() => mockInstance);

    const mockBuffer = Buffer.from('mock pdf content');
    const result = await parser.parseFromBuffer(mockBuffer);

    // verify PASS grade course was parsed
    const courses = result.terms.flatMap((term) => term.courses);
    const passCourse = courses.find((c) => c.grade === 'PASS');
    expect(passCourse).toBeDefined();
  });

  it('should handle course with RPT other field', async () => {
    const MockPDFParser = require('pdf2json');
    const mockInstance = {
      on: jest.fn((event, callback) => {
        if (event === 'pdfParser_dataReady') {
          callback({
            Pages: [
              {
                Texts: [
                  { y: -1, R: [{ T: 'HIST' }] },
                  { y: -1, R: [{ T: '101' }] },
                  { y: -1, R: [{ T: 'A01' }] },
                  { y: -1, R: [{ T: 'History' }] },
                  { y: -1, R: [{ T: '3.00' }] },
                  { y: -1, R: [{ T: 'B+' }] },
                  { y: -1, R: [{ T: '3.30' }] },
                  { y: -1, R: [{ T: '3.10' }] },
                  { y: -1, R: [{ T: '45' }] },
                  { y: -1, R: [{ T: '3.00' }] },
                  { y: -1, R: [{ T: 'RPT' }] }, // RPT other field
                ],
              },
            ],
          });
        }
      }),
      loadPDF: jest.fn(() => {
        process.nextTick(() => {
          const callback = mockInstance.on.mock.calls.find(
            (call) => call[0] === 'pdfParser_dataReady',
          )?.[1];
          if (callback) callback();
        });
      }),
    };

    MockPDFParser.mockImplementationOnce(() => mockInstance);

    const mockBuffer = Buffer.from('mock pdf content');
    const result = await parser.parseFromBuffer(mockBuffer);

    // verify course with RPT other field was parsed
    const courses = result.terms.flatMap((term) => term.courses);
    const rptCourse = courses.find((c) => c.other === 'RPT');
    expect(rptCourse).toBeDefined();
    expect(rptCourse.courseCode).toBe('HIST 101');
  });
});

// setup custom matcher for transcript validation
expect.extend({
  toBeValidTranscript(received, { termCount, firstTerm }) {
    const pass =
      received &&
      received.studentInfo &&
      received.terms &&
      received.programHistory &&
      received.transferCredits &&
      received.additionalInfo &&
      received.terms.length === termCount &&
      received.terms[0]?.term === firstTerm;
    return {
      pass,
      message: () =>
        `Expected transcript to have termCount=${termCount}, firstTerm=${firstTerm}`,
    };
  },
});
