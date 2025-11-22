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

// basic parsed data structure
const assertParsedDataStructure = (result) => {
  // All fields are optional, so we just check if result is an object
  expect(result).toBeInstanceOf(Object);
};

// semester basics
const assertSemesterBasics = (
  result,
  index,
  { term, courseCount },
) => {
  expect(result.semesters).toBeDefined();
  expect(result.semesters.length).toBeGreaterThan(index);
  const s = result.semesters[index];
  if (term) expect(s.term).toContain(term);
  if (courseCount !== undefined) expect(s.courses).toHaveLength(courseCount);
};

// course assertion
const assertCourse = (
  course,
  { code, grade },
) => {
  if (code) expect(course.code).toBe(code);
  if (grade !== undefined) {
    if (grade) {
      expect(course.grade).toBe(grade);
    } else {
      expect(course.grade).toBeUndefined();
    }
  }
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

// custom matcher for parsed data validity
expect.extend({
  toBeValidParsedData(received, { semesterCount, firstSemesterTerm }) {
    const pass =
      received &&
      received.semesters &&
      received.semesters.length === semesterCount &&
      received.semesters[0]?.term.includes(firstSemesterTerm);
    return {
      pass,
      message: () =>
        `Expected parsed data to have semesterCount=${semesterCount}, firstSemesterTerm=${firstSemesterTerm}`,
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
      programInfo: {
        degree: 'B.Sc., Computer Science',
        firstTerm: 'Fall 2020',
        lastTerm: 'Summer 2021',
        minimumProgramLength: 120,
      },
      semesters: mockTranscriptData.terms.map(t => ({
        term: `${t.term} ${t.year}`,
        courses: t.courses.map(c => ({
          code: c.courseCode.replace(/\s+/g, ''),
          grade: c.grade,
        })),
      })),
      transferedCourses: [],
      exemptedCourses: mockTranscriptData.transferCredits
        .filter(tc => tc.grade === 'EX')
        .map(tc => tc.courseCode.replace(/\s+/g, '')),
      deficiencyCourses: [],
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('should parse transcript from file', async () => {
    const filePath = '/path/to/transcript.pdf';
    const result = await parser.parseFromFile(filePath);

    expect(exec).toHaveBeenCalled();
    expect(result).toBeValidParsedData({
      semesterCount: mockTranscriptData.terms.length,
      firstSemesterTerm: mockTranscriptData.terms[0].term,
    });
    expect(result.programInfo).toBeDefined();
    expect(result.programInfo.degree).toBe('B.Sc., Computer Science');
    assertSemesterBasics(result, 0, mockTranscriptData.terms[0]);
    expect(result.exemptedCourses).toBeDefined();
    expect(result.exemptedCourses.length).toBeGreaterThan(0);
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
      programInfo: {
        degree: 'B.Sc., Computer Science',
        firstTerm: 'Fall 2023',
      },
      semesters: [{
        term: 'Fall 2023',
        courses: [{ code: 'COMP101', grade: 'A' }],
      }],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: [],
    };
    
    mockPythonExecution(mockData);
    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    
    expect(result.programInfo).toBeDefined();
    expect(result.programInfo.degree).toBe('B.Sc., Computer Science');
    expect(result.semesters).toHaveLength(1);
    expect(result.semesters[0].term).toBe('Fall 2023');
    expect(result.semesters[0].courses).toHaveLength(1);
    expect(result.semesters[0].courses[0].code).toBe('COMP101');
    expect(result.semesters[0].courses[0].grade).toBe('A');
  });

  it('should parse transcript data correctly', async () => {
    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    
    expect(result).toBeValidParsedData({
      semesterCount: mockTranscriptData.terms.length,
      firstSemesterTerm: mockTranscriptData.terms[0].term,
    });
    assertSemesterBasics(result, 0, mockTranscriptData.terms[0]);
    assertCourse(
      result.semesters[0].courses[0],
      { code: mockTranscriptData.terms[0].courses[0].courseCode.replace(/\s+/g, ''), grade: mockTranscriptData.terms[0].courses[0].grade },
    );
    expect(result.programInfo).toBeDefined();
    expect(result.exemptedCourses).toBeDefined();
  });

  it('should extract exempted courses correctly', async () => {
    mockPythonExecution({
      programInfo: {},
      semesters: [],
      transferedCourses: [],
      exemptedCourses: ['BIOL201', 'CHEM205', 'MATH201'],
      deficiencyCourses: [],
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');

    expect(result.exemptedCourses).toHaveLength(3);
    expect(result.exemptedCourses[0]).toBe('BIOL201');
    expect(result.exemptedCourses[1]).toBe('CHEM205');
    expect(result.exemptedCourses[2]).toBe('MATH201');
  });

  it('should extract Fall/Winter term format correctly', async () => {
    mockPythonExecution({
      programInfo: {},
      semesters: [
        {
          term: 'Fall/Winter 2025-26',
          courses: [
            { code: 'SOEN490', grade: 'A' },
          ],
        },
      ],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: [],
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');

    const fallWinterSemester = result.semesters.find(
      (s) => s.term === 'Fall/Winter 2025-26',
    );
    expect(fallWinterSemester).toBeDefined();
    expect(fallWinterSemester.courses.length).toBeGreaterThan(0);
    expect(fallWinterSemester.courses[0].code).toBe('SOEN490');
    expect(fallWinterSemester.courses[0].grade).toBe('A');
  });

  it('should extract semester courses correctly', async () => {
    mockPythonExecution({
      programInfo: {},
      semesters: [
        {
          term: 'Winter 2023',
          courses: [
            { code: 'COMP249', grade: 'A+' },
          ],
        },
      ],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: [],
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');

    expect(result.semesters.length).toBeGreaterThan(0);
    const winterSemester = result.semesters.find(
      (s) => s.term === 'Winter 2023',
    );
    expect(winterSemester).toBeDefined();
    expect(winterSemester.courses[0].code).toBe('COMP249');
    expect(winterSemester.courses[0].grade).toBe('A+');
  });


  it('should allow stderr with WARNING', async () => {
    mockPythonExecution(
      {
        programInfo: { degree: 'Test Degree' },
        semesters: [],
        transferedCourses: [],
        exemptedCourses: [],
        deficiencyCourses: [],
      },
      'WARNING: Some warning message',
    );

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.programInfo.degree).toBe('Test Degree');
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
      // Missing all fields
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');

    expect(result.programInfo).toBeUndefined();
    expect(result.semesters).toBeUndefined();
    expect(result.transferedCourses).toBeUndefined();
    expect(result.exemptedCourses).toBeUndefined();
    expect(result.deficiencyCourses).toBeUndefined();
  });

  it('should handle undefined exempted courses', async () => {
    mockPythonExecution({
      programInfo: {},
      semesters: [],
      transferedCourses: [],
      exemptedCourses: undefined,
      deficiencyCourses: [],
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.exemptedCourses).toBeUndefined();
  });

  it('should handle exempted courses array correctly', async () => {
    mockPythonExecution({
      programInfo: {},
      semesters: [],
      transferedCourses: [],
      exemptedCourses: ['COMP101', 'MATH203'],
      deficiencyCourses: [],
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.exemptedCourses).toHaveLength(2);
    expect(result.exemptedCourses[0]).toBe('COMP101');
    expect(result.exemptedCourses[1]).toBe('MATH203');
  });

  it('should handle semesters with missing fields', async () => {
    mockPythonExecution({
      programInfo: {},
      semesters: [
        {
          term: 'Fall 2023',
          courses: [
            {
              code: 'COMP101',
              // Missing grade
            },
            {
              code: 'COMP202',
              grade: 'A',
            },
          ],
        },
      ],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: [],
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.semesters).toHaveLength(1);
    expect(result.semesters[0].term).toBe('Fall 2023');
    expect(result.semesters[0].courses).toHaveLength(2);
    expect(result.semesters[0].courses[0].code).toBe('COMP101');
    expect(result.semesters[0].courses[0].grade).toBeUndefined();
    expect(result.semesters[0].courses[1].code).toBe('COMP202');
    expect(result.semesters[0].courses[1].grade).toBe('A');
  });

  it('should handle undefined semesters', async () => {
    mockPythonExecution({
      programInfo: {},
      semesters: undefined,
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: [],
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.semesters).toBeUndefined();
  });

  it('should handle courses with grade field', async () => {
    mockPythonExecution({
      programInfo: {},
      semesters: [
        {
          term: 'Winter 2024',
          courses: [
            {
              code: 'COMP249',
              grade: 'A+',
            },
          ],
        },
      ],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: [],
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    const course = result.semesters[0].courses[0];
    expect(course.code).toBe('COMP249');
    expect(course.grade).toBe('A+');
  });

  it('should handle semesters with empty courses', async () => {
    mockPythonExecution({
      programInfo: {},
      semesters: [
        {
          term: 'Fall 2023',
          courses: [],
        },
      ],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: [],
    });

    const result = await parser.parseFromFile('/path/to/transcript.pdf');
    expect(result.semesters[0].term).toBe('Fall 2023');
    expect(result.semesters[0].courses).toHaveLength(0);
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
