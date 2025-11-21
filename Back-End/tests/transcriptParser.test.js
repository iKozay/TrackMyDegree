/* global Buffer */
const fs = require('fs');
const { exec } = require('node:child_process');
const { TranscriptParser } = require('../utils/transcriptParser.ts');
const mockTranscriptData = require('./__fixtures__/data/mockTranscriptData');

// Mock child_process.exec
jest.mock('node:child_process', () => ({
  exec: jest.fn(),
}));

// Mock fs.existsSync for Python script path check (will be reset in beforeEach)

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
  // Map old structure to new structure
  if (expected.studentName) {
    expect(result.studentInfo.name).toBe(expected.studentName);
  }
  if (expected.studentId) {
    expect(result.studentInfo.studentId).toBe(expected.studentId);
  }
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

// Helper to create mock Python script output
const createMockPythonOutput = (data) => {
  return JSON.stringify(data);
};

// Helper to mock Python script execution
const mockPythonExecution = (mockData, stderr = '') => {
  exec.mockImplementation((command, options, callback) => {
    const result = { stdout: createMockPythonOutput(mockData), stderr };
    if (callback) {
      // Callback style (for direct exec calls)
      // Note: This passes result object, but promisify handles it correctly
      // by treating the object as stdout when destructured
      process.nextTick(() => callback(null, result));
    } else {
      // Promise style (for promisify)
      return Promise.resolve(result);
    }
  });
};

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
    jest.clearAllMocks();
    // Mock fs.existsSync to return true by default
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    // Default mock: successful Python execution
    mockPythonExecution({
      studentInfo: {
        name: mockTranscriptData.studentInfo.studentName,
        studentId: mockTranscriptData.studentInfo.studentId,
      },
      terms: mockTranscriptData.terms.map(t => ({
        term: t.term,
        year: t.year,
        termGPA: t.termGPA,
        courses: t.courses.map(c => ({
          courseCode: c.courseCode,
          section: '',
          credits: c.credits,
          grade: c.grade,
        })),
      })),
      transferCredits: mockTranscriptData.transferCredits.map(tc => ({
        courseCode: tc.courseCode,
        courseTitle: '',
        grade: tc.grade,
        programCreditsEarned: 0,
      })),
      programHistory: [],
      additionalInfo: mockTranscriptData.additionalInfo,
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('should parse transcript from file', async () => {
    const filePath = '/path/to/transcript.pdf';
    const result = await parser.parseFromFile(filePath);

    expect(exec).toHaveBeenCalled();
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


  it('should handle errors when Python script fails', async () => {
    exec.mockImplementation((command, options, callback) => {
      const error = new Error('Python script error: PyMuPDF not installed');
      if (callback) {
        callback(error, null, 'ERROR: PyMuPDF not installed');
      } else {
        return Promise.reject(error);
      }
    });
    
    await expect(
      parser.parseFromFile('/nonexistent/transcript.pdf'),
    ).rejects.toThrow('Failed to parse transcript file');
  });

  it('should handle errors when Python script is not found', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
    
    await expect(
      parser.parseFromFile('/path/to/transcript.pdf'),
    ).rejects.toThrow('Python script not found');
  });

  it('should call Python script with correct file path', async () => {
    const filePath = '/path/to/transcript.pdf';
    await parser.parseFromFile(filePath);
    
    expect(exec).toHaveBeenCalled();
    const execCall = exec.mock.calls[0];
    expect(execCall[0]).toContain('python3');
    expect(execCall[0]).toContain('transcriptParser.py');
    expect(execCall[0]).toContain(filePath);
  });

  it('should parse Python script JSON output correctly', async () => {
    const mockData = {
      studentInfo: { name: 'Test Student', studentId: '12345' },
      terms: [{
        term: 'Fall',
        year: '2023',
        termGPA: 3.5,
        courses: [{ courseCode: 'COMP 101', section: 'A', credits: 3, grade: 'A' }],
      }],
      transferCredits: [],
      programHistory: [],
      additionalInfo: {},
    };
    
    mockPythonExecution(mockData);
    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    
    expect(result.studentInfo.name).toBe('Test Student');
    expect(result.terms).toHaveLength(1);
    expect(result.terms[0].term).toBe('Fall');
    expect(result.terms[0].courses).toHaveLength(1);
  });

  it('should parse transcript data correctly', async () => {
    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    
    expect(result).toBeValidTranscript({
      termCount: mockTranscriptData.terms.length,
      firstTerm: mockTranscriptData.terms[0].term,
    });
    assertTermBasics(result, 0, mockTranscriptData.terms[0]);
    assertCourse(
      result.terms[0].courses[0],
      mockTranscriptData.terms[0].courses[0],
    );
    assertStudentInfo(result, mockTranscriptData.studentInfo);
    assertTransferCredits(result, mockTranscriptData.transferCredits);
  });

  it('should extract transfer credits correctly', async () => {
    mockPythonExecution({
      studentInfo: {},
      terms: [],
      transferCredits: [
        { courseCode: 'BIOL 201', courseTitle: 'Vanier College', grade: 'EX', programCreditsEarned: 0.0 },
        { courseCode: 'CHEM 205', courseTitle: 'Vanier College', grade: 'EX', programCreditsEarned: 0.0 },
        { courseCode: 'MATH 201', courseTitle: 'Vanier College', grade: 'EX', programCreditsEarned: 0.0 },
      ],
      programHistory: [],
      additionalInfo: {},
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');

    expect(result.transferCredits).toHaveLength(3);
    expect(result.transferCredits[0].courseCode).toBe('BIOL 201');
    expect(result.transferCredits[0].courseTitle).toBe('Vanier College');
    expect(result.transferCredits[0].grade).toBe('EX');
    expect(result.transferCredits[0].programCreditsEarned).toBe(0.0);
    expect(result.transferCredits[1].courseCode).toBe('CHEM 205');
    expect(result.transferCredits[2].courseCode).toBe('MATH 201');
  });

  it('should extract Fall/Winter term format correctly', async () => {
    mockPythonExecution({
      studentInfo: {},
      terms: [
        {
          term: 'Fall/Winter',
          year: '2025-26',
          termGPA: 4.0,
          courses: [
            { courseCode: 'SOEN 490', section: 'TT', credits: 6.0, grade: 'A' },
          ],
        },
      ],
      transferCredits: [],
      programHistory: [],
      additionalInfo: {},
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');

    const fallWinterTerm = result.terms.find(
      (t) => t.term === 'Fall/Winter' && t.year === '2025-26',
    );
    expect(fallWinterTerm).toBeDefined();
    expect(fallWinterTerm.termGPA).toBe(4.0);
    expect(fallWinterTerm.courses.length).toBeGreaterThan(0);
  });

  it('should extract term GPA correctly', async () => {
    mockPythonExecution({
      studentInfo: {},
      terms: [
        {
          term: 'Winter',
          year: '2023',
          termGPA: 3.94,
          courses: [
            { courseCode: 'COMP 249', section: 'QQ', credits: 3.5, grade: 'A+' },
          ],
        },
      ],
      transferCredits: [],
      programHistory: [],
      additionalInfo: {},
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');

    expect(result.terms.length).toBeGreaterThan(0);
    const winterTerm = result.terms.find(
      (t) => t.term === 'Winter' && t.year === '2023',
    );
    expect(winterTerm).toBeDefined();
    expect(winterTerm.termGPA).toBeCloseTo(3.94, 2);
  });


  it('should allow stderr with WARNING', async () => {
    mockPythonExecution(
      {
        studentInfo: { name: 'Test', studentId: '123' },
        terms: [],
        transferCredits: [],
        programHistory: [],
        additionalInfo: {},
      },
      'WARNING: Some warning message',
    );

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.studentInfo.name).toBe('Test');
  });

  it('should handle non-Python/PyMuPDF errors', async () => {
    exec.mockImplementation((command, options, callback) => {
      const error = new Error('JSON parse error: Unexpected token');
      if (callback) {
        callback(null, { stdout: 'invalid json', stderr: '' });
      } else {
        return Promise.resolve({ stdout: 'invalid json', stderr: '' });
      }
    });

    await expect(
      parser.parseFromFile('/path/to/transcript.pdf'),
    ).rejects.toThrow();
  });

  it('should handle Python/PyMuPDF related errors', async () => {
    exec.mockImplementation((command, options, callback) => {
      const error = new Error('python3: command not found');
      if (callback) {
        callback(error, null, 'python3: command not found');
      } else {
        return Promise.reject(error);
      }
    });

    await expect(
      parser.parseFromFile('/path/to/transcript.pdf'),
    ).rejects.toThrow('Python 3 and PyMuPDF are required');
  });

  it('should handle PyMuPDF import errors', async () => {
    exec.mockImplementation((command, options, callback) => {
      const error = new Error('PyMuPDF module not found');
      if (callback) {
        callback(error, null, 'PyMuPDF module not found');
      } else {
        return Promise.reject(error);
      }
    });

    await expect(
      parser.parseFromFile('/path/to/transcript.pdf'),
    ).rejects.toThrow('Python 3 and PyMuPDF are required');
  });

  it('should handle missing fields in Python result', async () => {
    mockPythonExecution({
      // Missing studentInfo, terms, etc.
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');

    expect(result.studentInfo).toEqual({});
    expect(result.terms).toEqual([]);
    expect(result.transferCredits).toEqual([]);
    expect(result.programHistory).toEqual([]);
    expect(result.additionalInfo).toEqual({});
  });

  it('should handle undefined transfer credits', async () => {
    mockPythonExecution({
      studentInfo: {},
      terms: [],
      transferCredits: undefined,
      programHistory: [],
      additionalInfo: {},
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.transferCredits).toEqual([]);
  });

  it('should handle transfer credits with missing fields', async () => {
    mockPythonExecution({
      studentInfo: {},
      terms: [],
      transferCredits: [
        { courseCode: 'COMP 101' }, // Missing other fields
        { courseTitle: 'Some Course' }, // Missing courseCode
        {}, // Empty object
      ],
      programHistory: [],
      additionalInfo: {},
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.transferCredits).toHaveLength(3);
    expect(result.transferCredits[0].courseCode).toBe('COMP 101');
    expect(result.transferCredits[0].courseTitle).toBe('');
    expect(result.transferCredits[0].grade).toBe('EX');
    expect(result.transferCredits[0].programCreditsEarned).toBe(0);
  });

  it('should handle terms with missing fields', async () => {
    mockPythonExecution({
      studentInfo: {},
      terms: [
        {
          term: 'Fall',
          year: '2023',
          // Missing termGPA, termCredits
          courses: [
            {
              courseCode: 'COMP 101',
              // Missing section, credits, grade, etc.
            },
            {
              courseCode: 'COMP 202',
              section: 'A',
              // Missing other fields
            },
          ],
        },
      ],
      transferCredits: [],
      programHistory: [],
      additionalInfo: {},
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.terms).toHaveLength(1);
    expect(result.terms[0].term).toBe('Fall');
    expect(result.terms[0].year).toBe('2023');
    expect(result.terms[0].termGPA).toBeUndefined();
    expect(result.terms[0].courses).toHaveLength(2);
    expect(result.terms[0].courses[0].section).toBe('');
    expect(result.terms[0].courses[0].credits).toBe(0);
    expect(result.terms[0].courses[0].grade).toBe('');
  });

  it('should handle undefined terms', async () => {
    mockPythonExecution({
      studentInfo: {},
      terms: undefined,
      transferCredits: [],
      programHistory: [],
      additionalInfo: {},
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.terms).toEqual([]);
  });

  it('should handle courses with all optional fields', async () => {
    mockPythonExecution({
      studentInfo: {},
      terms: [
        {
          term: 'Winter',
          year: '2024',
          termGPA: 3.5,
          termCredits: 12,
          courses: [
            {
              courseCode: 'COMP 249',
              section: 'QQ',
              courseTitle: 'Object-Oriented Programming',
              credits: 3.5,
              grade: 'A+',
              notation: 'WKRT',
              gpa: 4.0,
              classAvg: 75.5,
              classSize: 120,
              other: 'Some note',
            },
          ],
        },
      ],
      transferCredits: [],
      programHistory: [],
      additionalInfo: {},
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    const course = result.terms[0].courses[0];
    expect(course.courseCode).toBe('COMP 249');
    expect(course.section).toBe('QQ');
    expect(course.courseTitle).toBe('Object-Oriented Programming');
    expect(course.credits).toBe(3.5);
    expect(course.grade).toBe('A+');
    expect(course.notation).toBe('WKRT');
    expect(course.gpa).toBe(4.0);
    expect(course.classAvg).toBe(75.5);
    expect(course.classSize).toBe(120);
    expect(course.other).toBe('Some note');
    expect(course.term).toBe('Winter');
    expect(course.year).toBe('2024');
  });

  it('should handle term with grade instead of termGPA', async () => {
    mockPythonExecution({
      studentInfo: {},
      terms: [
        {
          term: 'Fall',
          year: '2023',
          grade: 3.75, // Using grade instead of termGPA
          courses: [],
        },
      ],
      transferCredits: [],
      programHistory: [],
      additionalInfo: {},
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.terms[0].termGPA).toBe(3.75);
  });

  it('should handle error with non-Error object', async () => {
    exec.mockImplementation((command, options, callback) => {
      if (callback) {
        callback('String error', null, '');
      } else {
        return Promise.reject('String error');
      }
    });

    await expect(
      parser.parseFromFile('/path/to/transcript.pdf'),
    ).rejects.toThrow('Failed to parse transcript file');
  });
});
