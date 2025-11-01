/* global Buffer */
jest.mock('pdf-parse');
jest.mock('pdf2json');
jest.mock('node:timers', () => ({
  setTimeout: jest.fn(() => Math.floor(Math.random() * 10000)),
}));

const fs = require('fs');
const { TranscriptParser } = require('../Util/transcriptParser.ts');
const mockTranscriptData = require('./__fixtures__/data/mockTranscriptData');
const {
  createMockPdfParser,
} = require('./__fixtures__/factories/mockPdfParserFactory');
const edgeCaseTranscriptData = require('./__fixtures__/data/edgeCaseTranscriptData');

/* ===================== Test Constants ===================== */
const TEMP_PDF_REGEX = /[\\/]tmp[\\/]transcript_\d+\.pdf$/;

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
const assertTempFileWrite = (spy, buffer, dirPattern = TEMP_PDF_REGEX) => {
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

    assertStudentInfo(result, mockTranscriptData.studentInfo);

    assertTermBasics(result, 0, mockTranscriptData.terms[0]);

    const firstCourse = result.terms[0].courses[0];
    assertCourse(firstCourse, mockTranscriptData.terms[0].courses[0]);

    assertTransferCredits(result, mockTranscriptData.transferCredits);

    assertAdditionalInfo(result, mockTranscriptData.additionalInfo);
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
    expect(result).toBeValidTranscript({
      termCount: mockTranscriptData.terms.length,
      firstTerm: mockTranscriptData.terms[0].term,
    });
    assertStudentInfo(result, mockTranscriptData.studentInfo);
    assertTermBasics(result, 0, mockTranscriptData.terms[0]);
    expect(result.transferCredits).toHaveLength(
      mockTranscriptData.transferCredits.length,
    );
    expect(result.additionalInfo.overallGPA).toBe(
      mockTranscriptData.additionalInfo.overallGPA,
    );
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
      expect.stringMatching(TEMP_PDF_REGEX),
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
    expect(result).toBeValidTranscript({
      termCount: mockTranscriptData.terms.length,
      firstTerm: mockTranscriptData.terms[0].term,
    });
    assertTermBasics(result, 0, mockTranscriptData.terms[0].year);
    assertCourse(
      result.terms[0].courses[0],
      mockTranscriptData.terms[0].courses[0],
    );
    assertStudentInfo(result, mockTranscriptData.studentInfo);
    assertTransferCredits(result, mockTranscriptData.transferCredits);
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
    MockPDFParser.mockImplementationOnce(() =>
      createMockPdfParser(
        require('./__fixtures__/payloads/programMissingDetailsPayload'),
      ),
    );

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );

    expect(result.programHistory).toHaveLength(1);
    const program = result.programHistory[0];

    // Use fixture data for verification
    expect(program).toMatchObject(edgeCaseTranscriptData.programMissingDetails);
  });

  it('should handle course parsing courses with other field and minimal fields', async () => {
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() =>
      createMockPdfParser(
        require('./__fixtures__/payloads/courseWithExtraAndMinimalFieldsPayload'),
      ),
    );

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );

    expect(result.terms.length).toBeGreaterThan(0);
    const courses = result.terms.flatMap((t) => t.courses);

    const courseWithOther = courses.find(
      (c) => c.courseCode === edgeCaseTranscriptData.courseWithOther.courseCode,
    );
    expect(courseWithOther).toBeDefined();
    expect(courseWithOther).toMatchObject(
      edgeCaseTranscriptData.courseWithOther,
    );

    const minimalFieldsCourse = courses.find(
      (c) =>
        c.courseCode === edgeCaseTranscriptData.minimalFieldsCourse.courseCode,
    );
    expect(minimalFieldsCourse).toBeDefined();
    expect(minimalFieldsCourse).toMatchObject(
      edgeCaseTranscriptData.minimalFieldsCourse,
    );
  });

  it('should handle course parsing with long title collection limit', async () => {
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() =>
      createMockPdfParser(
        require('./__fixtures__/payloads/longTitleCoursePayload'),
      ),
    );

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );
    expect(result.terms.length).toBeGreaterThan(0);
  });

  it('should handle course with zero grade parsing', async () => {
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() =>
      createMockPdfParser(
        require('./__fixtures__/payloads/zeroGradeCoursePayload'),
      ),
    );

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );

    expect(result.terms.length).toBeGreaterThan(0);
    const courses = result.terms.flatMap((t) => t.courses);

    const zeroGradeCourse = courses.find(
      (c) => c.courseCode === edgeCaseTranscriptData.zeroGradeCourse.courseCode,
    );
    expect(zeroGradeCourse).toBeDefined();
    expect(zeroGradeCourse).toMatchObject(
      edgeCaseTranscriptData.zeroGradeCourse,
    );
  });

  it('should handle PASS/EX grade and program credits', async () => {
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() =>
      createMockPdfParser(
        require('./__fixtures__/payloads/passExCoursesPayload'),
      ),
    );

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );

    expect(result.terms.length).toBeGreaterThan(0);
    const courses = result.terms.flatMap((t) => t.courses);

    const passCourse = courses.find(
      (c) => c.courseCode === edgeCaseTranscriptData.passCourse.courseCode,
    );
    expect(passCourse).toBeDefined();
    expect(passCourse.grade).toBe(edgeCaseTranscriptData.passCourse.grade);
    assertCourse(passCourse, { gpaDefined: false });

    const exCourse = courses.find(
      (c) => c.courseCode === edgeCaseTranscriptData.exCourse.courseCode,
    );
    expect(exCourse).toBeDefined();
    expect(exCourse.grade).toBe(edgeCaseTranscriptData.exCourse.grade);
    assertCourse(exCourse, { gpaDefined: false });
  });

  it('should handle course with RPT other field', async () => {
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() =>
      createMockPdfParser(require('./__fixtures__/payloads/rptCoursePayload')),
    );

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );

    expect(result.terms.length).toBeGreaterThan(0);
    const courses = result.terms.flatMap((t) => t.courses);

    const rptCourse = courses.find(
      (c) => c.courseCode === edgeCaseTranscriptData.rptCourse.courseCode,
    );
    expect(rptCourse).toBeDefined();
    expect(rptCourse).toMatchObject(edgeCaseTranscriptData.rptCourse);
  });

  it('should handle grades with unexpected or malformed values', async () => {
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    const MockPDFParser = require('pdf2json');
    MockPDFParser.mockImplementationOnce(() =>
      createMockPdfParser(
        require('./__fixtures__/payloads/malformedGradesPayload'),
      ),
    );

    const result = await parser.parseFromBuffer(
      Buffer.from('mock pdf content'),
    );

    const courses = result.terms.flatMap((t) => t.courses);
    expect(courses.length).toBeGreaterThan(0);

    // find courses with malformed grades
    const expectedMalformedGrades = edgeCaseTranscriptData.malformedGrades;
    const foundCourses = expectedMalformedGrades.map((expectedCourse) =>
      courses.find((c) => c.courseCode === expectedCourse.courseCode),
    );
    // verify all malformed grade courses exist
    foundCourses.forEach((course, index) => {
      expect(course).toBeDefined();
      expect(course.courseCode).toBe(expectedMalformedGrades[index].courseCode);
    });
    // verify each course has required properties
    courses.forEach((course) => {
      expect(course).toHaveProperty('grade');
      expect(course).toHaveProperty('courseCode');
      expect(typeof course.credits).toBe('number');
    });
    // verify malformed grades are preserved
    expectedMalformedGrades.forEach((expectedCourse, index) => {
      const actualCourse = foundCourses[index];
      expect(actualCourse.grade).toBe(expectedCourse.grade);
    });
  });
});
