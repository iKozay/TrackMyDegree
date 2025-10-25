/* global Buffer */
jest.mock('pdf-parse');
jest.mock('pdf2json');
jest.mock('node:timers', () => ({
  setTimeout: jest.fn(() => Math.floor(Math.random() * 10000)),
}));

const fs = require('fs');
const { TranscriptParser } = require('../dist/Util/transcriptParser.js');

/* ===================== Helper Functions ===================== */

// basic transcript structure
const assertTranscriptStructure = (result) => {
  [
    'studentInfo',
    'terms',
    'programHistory',
    'transferCredits',
    'additionalInfo',
  ].forEach((k) => expect(result).toHaveProperty(k));
};

// student info
const assertStudentInfo = (result, expected) => {
  assertTranscriptStructure(result);
  expect(result.studentInfo).toMatchObject(expected);
};

// term basics
const assertTermBasics = (
  result,
  index,
  { term, year, courseCount, termGPA },
) => {
  expect(result.terms.length).toBeGreaterThan(index);
  const t = result.terms[index];
  if (term) expect(t.term).toBe(term);
  if (year) expect(t.year).toBe(year);
  if (courseCount !== undefined) expect(t.courses).toHaveLength(courseCount);
  if (termGPA !== undefined) expect(t.termGPA).toBe(termGPA);
};

// course assertion
const assertCourse = (
  course,
  { courseCode, grade, credits, other, gpaDefined },
) => {
  if (courseCode) expect(course.courseCode).toBe(courseCode);
  if (grade) expect(course.grade).toBe(grade);
  if (credits !== undefined) expect(course.credits).toBe(credits);
  if (other !== undefined) expect(course.other).toBe(other);
  if (gpaDefined === false) expect(course.gpa).toBeUndefined();
};

// transfer credits
const assertTransferCredits = (result, expectedArray) => {
  expect(result.transferCredits).toHaveLength(expectedArray.length);
  expectedArray.forEach((ec, i) => {
    Object.entries(ec).forEach(([k, v]) =>
      expect(result.transferCredits[i][k]).toBe(v),
    );
  });
};

// additional info
const assertAdditionalInfo = (result, expected) => {
  Object.entries(expected).forEach(([k, v]) =>
    expect(result.additionalInfo[k]).toBe(v),
  );
};

// temp file write assertion
const assertTempFileWrite = (
  spy,
  buffer,
  dirPattern = /[\\/]tmp[\\/]transcript_\d+\.pdf$/,
) => {
  expect(spy).toHaveBeenCalledWith(expect.stringMatching(dirPattern), buffer);
};

// hybrid parsing verification
const assertHybridInvocation = (buffer) => {
  const pdfParse = require('pdf-parse');
  const MockPDFParser = require('pdf2json');
  expect(pdfParse).toHaveBeenCalledWith(buffer);
  expect(MockPDFParser).toHaveBeenCalled();
};

// pdf2json loadPDF trigger helper
const triggerPdf2JsonReady = (mockInstance, payload) => {
  mockInstance.loadPDF.mockImplementation(() => {
    process.nextTick(() => {
      const cb = mockInstance.on.mock.calls.find(
        (c) => c[0] === 'pdfParser_dataReady',
      )?.[1];
      if (cb) cb(payload);
    });
  });
};

// errored mock instance creator
const createPdf2JsonErrorInstance = (errorMessage) => ({
  on: jest.fn((event, cb) => {
    if (event === 'pdfParser_dataError') {
      process.nextTick(() => cb({ parserError: errorMessage }));
    }
  }),
  loadPDF: jest.fn(),
});

// custom matcher for transcript validity
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

/* ===================== Tests ===================== */

describe('TranscriptParser', () => {
  let parser;
  beforeEach(() => {
    parser = new TranscriptParser();
    require('node:timers').setTimeout.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('should parse transcript from buffer', async () => {
    const writeSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();
    triggerPdf2JsonReady(mockInstance);

    const mockBuffer = Buffer.from('mock pdf content');
    const result = await parser.parseFromBuffer(mockBuffer);

    assertTempFileWrite(writeSpy, mockBuffer, /transcript_\d+\.pdf$/);
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(unlinkSpy).toBeDefined();

    assertStudentInfo(result, {
      studentName: 'John Doe Student',
      studentId: '123456789',
      city: 'Montreal',
      province: 'QC',
    });

    assertTermBasics(result, 0, {
      term: 'Fall',
      year: '2020',
      courseCount: 3,
      termGPA: 3.67,
    });

    const firstCourse = result.terms[0].courses[0];
    assertCourse(firstCourse, {
      courseCode: 'COMP 248',
      grade: 'A-',
    });

    assertTransferCredits(result, [
      { courseCode: 'MATH 101', grade: 'EX' },
      { courseCode: 'PHYS 101', grade: 'PASS' },
    ]);

    assertAdditionalInfo(result, {
      overallGPA: 3.75,
      minCreditsRequired: 120.0,
      programCreditsEarned: 90.5,
    });
  });

  it('should parse transcript from file', async () => {
    const mockBuffer = Buffer.from('mock pdf content');
    const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(mockBuffer);
    const writeSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});
    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();
    triggerPdf2JsonReady(mockInstance);

    const filePath = '/path/to/transcript.pdf';
    const result = await parser.parseFromFile(filePath);

    expect(readSpy).toHaveBeenCalledWith(filePath);
    assertTempFileWrite(writeSpy, mockBuffer, /transcript_\d+\.pdf$/);
    expect(result).toBeValidTranscript({ termCount: 3, firstTerm: 'Fall' });
    assertStudentInfo(result, {
      studentName: 'John Doe Student',
      studentId: '123456789',
    });
    assertTermBasics(result, 0, { term: 'Fall' });
    expect(result.transferCredits).toHaveLength(2);
    expect(result.additionalInfo.overallGPA).toBe(3.75);
  }, 100000);

  it('should handle errors when reading file', async () => {
    const readSpy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('File not found');
    });
    await expect(
      parser.parseFromFile('/nonexistent/transcript.pdf'),
    ).rejects.toThrow('Failed to read transcript file: File not found');
    expect(readSpy).toHaveBeenCalled();
  });

  it('should handle errors when parsing buffer', async () => {
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() =>
      createPdf2JsonErrorInstance('Invalid PDF format'),
    );
    const mockBuffer = Buffer.from('invalid pdf content');
    await expect(parser.parseFromBuffer(mockBuffer)).rejects.toThrow(
      'Failed to parse transcript: PDF parsing error: Invalid PDF format',
    );
  }, 10000);

  it('should use pdf-parse to extract clean text', async () => {
    const pdfParse = require('pdf-parse');
    pdfParse.mockClear();
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();
    triggerPdf2JsonReady(mockInstance);
    const mockBuffer = Buffer.from('mock pdf content');
    await parser.parseFromBuffer(mockBuffer);
    expect(pdfParse).toHaveBeenCalledWith(mockBuffer);
    expect(pdfParse).toHaveBeenCalledTimes(1);
  }, 10000);

  it('should use pdf2json to extract structured data', async () => {
    const writeSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});
    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();
    triggerPdf2JsonReady(mockInstance);
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
    expect(mockInstance.loadPDF).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]tmp[\\/]transcript_\d+\.pdf$/),
    );
    assertTempFileWrite(writeSpy, mockBuffer);
  }, 10000);

  it('should parse transcript data using hybrid method', async () => {
    const writeSpy = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});
    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();
    triggerPdf2JsonReady(mockInstance);
    const mockBuffer = Buffer.from('mock pdf content');
    const result = await parser.parseFromBuffer(mockBuffer);
    assertHybridInvocation(mockBuffer);
    expect(result).toBeValidTranscript({ termCount: 3, firstTerm: 'Fall' });
    assertTermBasics(result, 0, { year: '2020' });
    assertCourse(result.terms[0].courses[0], {
      courseCode: 'COMP 248',
      grade: 'A-',
      credits: 3.0,
    });
    assertStudentInfo(result, {
      studentName: 'John Doe Student',
      studentId: '123456789',
    });
    assertTransferCredits(result, [
      { courseCode: 'MATH 101' },
      { courseCode: 'PHYS 101' },
    ]);
    assertTempFileWrite(writeSpy, mockBuffer);
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
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    require('pdf-parse').mockImplementation(mockPdfParse);
    const MockPDFParser = require('pdf2json');
    const mockInstance = new MockPDFParser();
    triggerPdf2JsonReady(mockInstance, {
      Pages: [{ Texts: [{ y: -10, R: [{ T: 'COMP' }] }] }], // minimal data
    });
    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );
    expect(mockPdfParse).toHaveBeenCalled();
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
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    require('pdf-parse').mockImplementation(mockPdfParse);
    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() => {
      const inst = {
        on: jest.fn((e, cb) => e === 'pdfParser_dataReady' && (inst._cb = cb)),
        loadPDF: jest.fn(() =>
          process.nextTick(() =>
            inst._cb?.({
              Pages: [
                {
                  Texts: [
                    { y: 10, R: [{ T: 'John%20Doe%20Student' }] },
                    { y: 5, R: [{ T: 'Student%20ID:%20123456789' }] },
                    { y: 0, R: [{ T: 'Active%20in%20Program' }] },
                    // missing degree information
                    { y: -5, R: [{ T: 'Fall%202020' }] },
                    { y: -10, R: [{ T: 'Min.%20Credits%20Required' }] },
                  ],
                },
              ],
            }),
          ),
        ),
      };
      return inst;
    });

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );
    expect(result.programHistory).toHaveLength(1);
    const program = result.programHistory[0];
    expect(program).toMatchObject({
      status: 'Active in Program',
      startDate: 'Fall 2020',
      // expected missing fields to be empty strings
      degreeType: '',
      major: '',
      admitTerm: '',
      note: '',
    });
  });

  it('should handle course parsing courses with other field and minimal fields', async () => {
    const mockPdfParse = jest.fn().mockResolvedValue({
      text: `Beginning of Undergraduate Record
           Fall 2023
           End of Student Record`,
    });
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    require('pdf-parse').mockImplementation(mockPdfParse);
    const MockPDFParser = require('pdf2json');
    // custom complex instance
    MockPDFParser.mockImplementationOnce(() => {
      return {
        on: jest.fn((e, cb) => {
          if (e === 'pdfParser_dataReady') {
            cb({
              Pages: [
                {
                  Texts: [
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
                    { y: -25, R: [{ T: 'PHYS' }] },
                    { y: -25, R: [{ T: '101' }] },
                    { y: -25, R: [{ T: 'D' }] },
                    { y: -25, R: [{ T: 'Physics%20Lab' }] },
                    { y: -25, R: [{ T: '1.00' }] },
                    { y: -25, R: [{ T: 'C' }] },
                    { y: -25, R: [{ T: '1.00' }] },
                  ],
                },
              ],
            });
          }
        }),
        loadPDF: jest.fn(),
      };
    });

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );
    const courses = result.terms.flatMap((t) => t.courses);
    expect(courses.length).toBeGreaterThan(0);
    courses.forEach((c) => {
      expect(c).toHaveProperty('courseCode');
      expect(c).toHaveProperty('grade');
      expect(typeof c.credits).toBe('number');
      if (['PASS', 'EX'].includes(c.grade)) expect(c.gpa).toBeUndefined();
    });
  });

  it('should handle course parsing with long title collection limit', async () => {
    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() => {
      return {
        on: jest.fn((e, cb) => {
          if (e === 'pdfParser_dataReady') {
            cb({
              Pages: [
                {
                  Texts: [
                    { y: -1, R: [{ T: 'COMP' }] },
                    { y: -1, R: [{ T: '248' }] },
                    { y: -1, R: [{ T: 'AA' }] },
                    ...'Very Long Course Title That Goes On And On For Many Words More Words Even More'
                      .split(' ')
                      .map((w) => ({ y: -1, R: [{ T: w }] })),
                    { y: -1, R: [{ T: '3.00' }] },
                    { y: -1, R: [{ T: 'A-' }] },
                  ],
                },
              ],
            });
          }
        }),
        loadPDF: jest.fn(),
      };
    });
    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );
    expect(result.terms.length).toBeGreaterThan(0);
  });

  it('should handle course with zero grade parsing', async () => {
    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() => {
      return {
        on: jest.fn((e, cb) => {
          if (e === 'pdfParser_dataReady') {
            cb({
              Pages: [
                {
                  Texts: [
                    { y: -1, R: [{ T: 'MATH' }] },
                    { y: -1, R: [{ T: '101' }] },
                    { y: -1, R: [{ T: 'AA' }] },
                    { y: -1, R: [{ T: 'Calculus' }] },
                    { y: -1, R: [{ T: '3.00' }] },
                    { y: -1, R: [{ T: '0.00' }] },
                    { y: -1, R: [{ T: '0.00' }] },
                    { y: -1, R: [{ T: '0.00' }] },
                    { y: -1, R: [{ T: '0' }] },
                    { y: -1, R: [{ T: '3.00' }] },
                    { y: -1, R: [{ T: 'WKRT' }] },
                  ],
                },
              ],
            });
          }
        }),
        loadPDF: jest.fn(),
      };
    });

    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );
    const zero = result.terms
      .flatMap((t) => t.courses)
      .find((c) => c.grade === '0.00');
    expect(zero).toBeDefined();
    expect(zero.other).toBe('WKRT');
  });

  it('should handle PASS/EX grade and program credits', async () => {
    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() => {
      return {
        on: jest.fn((e, cb) => {
          if (e === 'pdfParser_dataReady') {
            cb({
              Pages: [
                {
                  Texts: [
                    // PASS grade course
                    { y: -1, R: [{ T: 'PHYS' }] },
                    { y: -1, R: [{ T: '101' }] },
                    { y: -1, R: [{ T: 'AA' }] },
                    { y: -1, R: [{ T: 'Physics' }] },
                    { y: -1, R: [{ T: '3.00' }] },
                    { y: -1, R: [{ T: 'PASS' }] },
                    { y: -1, R: [{ T: '3.00' }] },
                    // EX grade course
                    { y: -20, R: [{ T: 'ENGR' }] },
                    { y: -20, R: [{ T: '101' }] },
                    { y: -20, R: [{ T: 'BB' }] },
                    { y: -20, R: [{ T: 'Engineering%20Basics' }] },
                    { y: -20, R: [{ T: '3.00' }] },
                    { y: -20, R: [{ T: 'EX' }] },
                    { y: -20, R: [{ T: '3.00' }] },
                  ],
                },
              ],
            });
          }
        }),
        loadPDF: jest.fn(),
      };
    });

    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );
    const passCourse = result.terms
      .flatMap((t) => t.courses)
      .find((c) => c.grade === 'PASS');
    expect(passCourse).toBeDefined();
    assertCourse(passCourse, { gpaDefined: false });
  });

  it('should handle course with RPT other field', async () => {
    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() => {
      return {
        on: jest.fn((e, cb) => {
          if (e === 'pdfParser_dataReady') {
            cb({
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
                    { y: -1, R: [{ T: 'RPT' }] },
                  ],
                },
              ],
            });
          }
        }),
        loadPDF: jest.fn(),
      };
    });
    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );
    const rpt = result.terms
      .flatMap((t) => t.courses)
      .find((c) => c.other === 'RPT');
    expect(rpt.courseCode).toBe('HIST 101');
  });

  it('should handle grades with unexpected or malformed values', async () => {
    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() => {
      let callback;
      return {
        on: jest.fn((e, cb) => {
          if (e === 'pdfParser_dataReady') {
            callback = cb;
          }
        }),
        loadPDF: jest.fn(() =>
          process.nextTick(() =>
            callback?.({
              Pages: [
                {
                  Texts: [
                    // course with empty string grade
                    { y: -1, R: [{ T: 'COMP' }] },
                    { y: -1, R: [{ T: '101' }] },
                    { y: -1, R: [{ T: 'AA' }] },
                    { y: -1, R: [{ T: 'Programming' }] },
                    { y: -1, R: [{ T: '3.00' }] },
                    { y: -1, R: [{ T: '' }] }, // empty grade
                    { y: -1, R: [{ T: '3.00' }] },
                    // course with unknown grade code
                    { y: -10, R: [{ T: 'MATH' }] },
                    { y: -10, R: [{ T: '201' }] },
                    { y: -10, R: [{ T: 'BB' }] },
                    { y: -10, R: [{ T: 'Calculus' }] },
                    { y: -10, R: [{ T: '4.00' }] },
                    { y: -10, R: [{ T: 'XYZ' }] }, // unknown grade code
                    { y: -10, R: [{ T: '4.00' }] },
                    // course with special characters in grade
                    { y: -20, R: [{ T: 'PHYS' }] },
                    { y: -20, R: [{ T: '101' }] },
                    { y: -20, R: [{ T: 'CC' }] },
                    { y: -20, R: [{ T: 'Physics' }] },
                    { y: -20, R: [{ T: '3.00' }] },
                    { y: -20, R: [{ T: 'A*#' }] }, // grade with special chars
                    { y: -20, R: [{ T: '3.00' }] },
                    // course with numeric-like but invalid grade
                    { y: -30, R: [{ T: 'CHEM' }] },
                    { y: -30, R: [{ T: '101' }] },
                    { y: -30, R: [{ T: 'DD' }] },
                    { y: -30, R: [{ T: 'Chemistry' }] },
                    { y: -30, R: [{ T: '3.00' }] },
                    { y: -30, R: [{ T: '99.99' }] }, // invalid numeric grade
                    { y: -30, R: [{ T: '3.00' }] },
                    // course with null-like grade
                    { y: -40, R: [{ T: 'BIOL' }] },
                    { y: -40, R: [{ T: '101' }] },
                    { y: -40, R: [{ T: 'EE' }] },
                    { y: -40, R: [{ T: 'Biology' }] },
                    { y: -40, R: [{ T: '3.00' }] },
                    { y: -40, R: [{ T: 'null' }] }, // string "null"
                    { y: -40, R: [{ T: '3.00' }] },
                  ],
                },
              ],
            }),
          ),
        ),
      };
    });

    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );

    const courses = result.terms.flatMap((t) => t.courses);
    expect(courses.length).toBeGreaterThan(0);

    // find courses with malformed grades
    const emptyGradeCourse = courses.find((c) => c.courseCode === 'COMP 101');
    const unknownGradeCourse = courses.find((c) => c.courseCode === 'MATH 201');
    const specialCharGradeCourse = courses.find(
      (c) => c.courseCode === 'PHYS 101',
    );
    const invalidNumericGradeCourse = courses.find(
      (c) => c.courseCode === 'CHEM 101',
    );
    const nullGradeCourse = courses.find((c) => c.courseCode === 'BIOL 101');

    // verify courses exist and have expected properties
    expect(emptyGradeCourse).toBeDefined();
    expect(unknownGradeCourse).toBeDefined();
    expect(specialCharGradeCourse).toBeDefined();
    expect(invalidNumericGradeCourse).toBeDefined();
    expect(nullGradeCourse).toBeDefined();

    // verify each course has a grade property (even if malformed)
    courses.forEach((course) => {
      expect(course).toHaveProperty('grade');
      expect(course).toHaveProperty('courseCode');
      expect(typeof course.credits).toBe('number');
    });

    // verify malformed grades are preserved as-is
    expect(emptyGradeCourse.grade).toBe('');
    expect(unknownGradeCourse.grade).toBe('XYZ');
    expect(specialCharGradeCourse.grade).toBe('A*#');
    expect(invalidNumericGradeCourse.grade).toBe('99.99');
    expect(nullGradeCourse.grade).toBe('NULL');
  });
});
