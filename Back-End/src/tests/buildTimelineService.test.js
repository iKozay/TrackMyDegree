const { Buffer } = require('buffer');
const { buildTimeline } = require('../services/timeline/timelineService'); // adjust path if needed
const { parseFile } = require('@services/parsingService');
const { degreeController } = require('@controllers/degreeController');

jest.mock('@services/parsingService');
jest.mock('@controllers/degreeController');

describe('buildTimeline', () => {
  const mockDegreeData = {
    degree: { _id: 'deg1', name: 'Beng in Computer Engineering' },
    pools: [
      { name: 'Core Courses', courses: ['COMP 232', 'COMP 248','COMP 249'] }
    ],
    courses: {
      'COMP 232': { _id: 'COMP 232', name: 'Discrete Math', rules: { prereq: [] } },
      'COMP 248': { _id: 'COMP 248', name: 'Object Oriented Programing', rules: { prereq: [] } },
      'COMP 249': { _id: 'COMP 249', name: 'Object Oriented Programing 2', rules: { prereq: [['COMP 248'],['COMP 232']] } }
    }
  };

  beforeEach(() => {
    jest.resetAllMocks();
    degreeController.readAllDegrees.mockResolvedValue([
      { _id: 'deg1', name: 'BEng in Computer Engineering' }
    ]);
    degreeController.readDegreeData.mockResolvedValue(mockDegreeData);
  });

  it('builds timeline from form data', async () => {
    const formData = {
      type: 'form',
      data: {
        degree: 'Bachelor of Engineering Computer Engineering',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false
      }
    };

    const result = await buildTimeline(formData);

    expect(result).toBeDefined();
    expect(result.degree._id).toBe('deg1');
    expect(result.pools.length).toBe(1);
    expect(Object.keys(result.courses).length).toBe(3);
    expect(result.semesters.length).toBeGreaterThan(0);
  });

  it('builds timeline from file data', async () => {
    const mockParsedData = {
      programInfo: {
        degree: 'Bachelor of Engineering Computer Engineering',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false
      },
      semesters: [
        {
          term: 'FALL 2023',
          courses: [{ code: 'COMP232', grade: 'A' }]
        }
      ],
      transferedCourses: [],
      exemptedCourses: []
    };

    parseFile.mockResolvedValue(mockParsedData);

    const fileData = {
      type: 'file',
      data: Buffer.from('mock file')
    };

    const result = await buildTimeline(fileData);

    expect(result).toBeDefined();
    expect(result.courses['COMP 232'].status).toBe('complete');
    expect(result.semesters[0].courses[0].code).toBe('COMP 232');
  });

  it('throws error if degree not found', async () => {
    degreeController.readDegreeData.mockResolvedValue(undefined);

    const formData = {
      type: 'form',
      data: {
        degree: 'Nonexistent Degree',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false
      }
    };

    await expect(buildTimeline(formData)).rejects.toThrow('Error fetching degree data from database');
  });

  it('correctly validates 200-level C- requirement', async () => {
    const mockParsedData = {
      programInfo: {
        degree: 'Bachelor of Engineering Computer Engineering',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false,
        isCoop: false
      },
      semesters: [
        {
          term: 'FALL 2023',
          courses: [
            { code: 'COMP232', grade: 'D' }, // fails C-
            { code: 'COMP248', grade: 'C+' } // passes
          ]
        }
      ],
      transferedCourses: [],
      exemptedCourses: []
    };

    parseFile.mockResolvedValue(mockParsedData);

    const fileData = {
      type: 'file',
      data: Buffer.from('mock file')
    };

    const result = await buildTimeline(fileData);

    const comp232 = result.courses['COMP 232'];
    const comp248 = result.courses['COMP 248'];
    const comp249 = result.courses['COMP 249'];

    expect(comp232.status).toBe('incomplete');
    expect(result.semesters[0].courses.find(c => c.code === 'COMP 232').message)
      .toContain('Minimum grade not met');

    expect(comp248.status).toBe('complete');
    expect(result.semesters[0].courses.find(c => c.code === 'COMP 248').message).toBe('');


    expect(comp249.status).toBe('incomplete');
    expect(result.semesters[0].courses.find(c => c.code === 'COMP 249')).toBe(undefined);
  });
});
