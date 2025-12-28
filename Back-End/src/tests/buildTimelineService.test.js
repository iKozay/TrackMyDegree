const { Buffer } = require('buffer');
const { buildTimeline } = require('../services/timeline/timelineService'); // adjust path if needed
const { parseFile } = require('@services/parsingService');
const { degreeController } = require('@controllers/degreeController');

jest.mock('@services/parsingService');
jest.mock('@controllers/degreeController');

describe('buildTimeline', () => {
  const mockDegreeData =  { _id: 'deg1', name: 'Beng in Computer Engineering' }

  const mockPools = [
      { name: 'Core Courses', courses: ['COMP 232', 'COMP 248','COMP 249'] }
    ]
    
  const mockCourses = [
    { _id: 'COMP 232', title: 'Discrete Math', rules: { prereq: [] } },
    { _id: 'COMP 248', title: 'Object Oriented Programming', rules: { prereq: [] } },
    { _id: 'COMP 249', title: 'Object Oriented Programming 2', rules: { prereq: [['COMP 248'], ['COMP 232']] } }
  ]


  beforeEach(() => {
  jest.resetAllMocks();
  degreeController.readAllDegrees.mockResolvedValue([mockDegreeData]);
  
  degreeController.readDegree.mockResolvedValue(mockDegreeData);
  
  degreeController.getCoursePoolsForDegree.mockResolvedValue(mockPools);

  degreeController.getCoursesForDegree.mockResolvedValue(mockCourses);
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
    expect(result.courses['COMP 232'].status.semester).toBe("FALL 2023");
    expect(result.courses['COMP 232'].status.status).toBe("complete");
    expect(result.semesters[0].courses[0].code).toBe('COMP 232');
  });

  it('throws error if degree not found', async () => {
    degreeController.readDegree.mockResolvedValue(undefined);

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

  it('correctly computes courses statuses and validates 200-level C- requirement', async () => {
    
    const nextYear = new Date().getFullYear() + 1;
    const futureTerm = `WINTER ${nextYear}`;

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
          term: 'SUMMER 2023',
          courses: [
            { code: 'COMP232', grade: 'D' }, // fails C-
          ]
        },
        {
          term: 'FALL 2023',
          courses: [
            { code: 'COMP248', grade: 'C+' } // passes
          ]
        },
        {
          term: futureTerm,
          courses: [
            { code: 'COMP249' } // planned
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

    expect(comp232.status.status).toBe('incomplete');
    expect(comp232.status.semester).toBe("SUMMER 2023");
    expect(result.semesters[0].courses.find(c => c.code === 'COMP 232').message)
      .toContain('Minimum grade not met');

    expect(comp248.status.status).toBe('complete');
    expect(comp248.status.semester).toBe("FALL 2023");
    expect(result.semesters[1].courses.find(c => c.code === 'COMP 248').message).toBeUndefined();


    expect(comp249.status.status).toBe('planned');
    expect(comp249.status.semester).toBe(futureTerm);
    expect(result.semesters[2].courses.find(c => c.code === 'COMP 249').message).toBeUndefined();
  });
});
