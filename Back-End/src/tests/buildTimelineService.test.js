const { Buffer } = require('buffer');
const { buildTimeline, buildTimelineFromDB } = require('../services/timeline/timelineService'); // adjust path if needed
const { parseFile } = require('@services/parsingService');
const { degreeController } = require('@controllers/degreeController');
const { courseController } = require('@controllers/courseController');
const { coursepoolController } = require('@controllers/coursepoolController');
const { Timeline } = require('../models/timeline');

jest.mock('@services/parsingService');
jest.mock('@controllers/degreeController');
jest.mock('@controllers/courseController');
jest.mock('@controllers/coursepoolController');

describe('timelineService', () => {
  const mockDegreeData = { _id: 'deg1', name: 'Beng in Computer Engineering', coursePools: [] }

  const mockCourses = [
    { _id: 'COMP 232', title: 'Discrete Math', rules: { prereq: [] }, credits: 3 },
    { _id: 'COMP 248', title: 'Object Oriented Programming', rules: { prereq: [] }, credits: 3 },
    { _id: 'COMP 249', title: 'Object Oriented Programming 2', rules: { prereq: [['COMP 248'], ['COMP 232']] }, credits: 3 },
    { _id: 'MATH 204', title: 'Algebra', rules: { prereq: [] }, credits: 3 },
    { _id: 'CHEM 206', title: 'General Chemistry', rules: { prereq: [] }, credits: 3 },
  ]


  beforeEach(() => {
    jest.resetAllMocks();
    degreeController.readAllDegrees.mockResolvedValue([mockDegreeData]);

    degreeController.readDegree.mockResolvedValue(mockDegreeData);

    degreeController.getCoursePoolsForDegree.mockResolvedValue([
      { name: 'Core Courses', courses: ['COMP 232', 'COMP 248', 'COMP 249'] }
    ]);

    degreeController.getCoursesForDegree.mockResolvedValue(mockCourses);
    courseController.getCourseByCode.mockResolvedValue(null);

    // Mock coursepoolController for coop courses
    coursepoolController.getCoursePool.mockResolvedValue({
      _id: 'COOP_Co-op Work Terms',
      name: 'Co-op Work Terms',
      creditsRequired: 0,
      courses: ['CWT 100', 'CWT 101']
    });
  });

  afterEach(() => {
    jest.restoreAllMocks(); // restores any spyOn
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
    expect(result.pools.length).toBe(3);
    expect(Object.keys(result.courses).length).toBe(5);
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
    expect(result.courses['COMP 232'].status.status).toBe("completed");
    expect(result.semesters[0].courses[0].code).toBe('COMP 232');
  });

  it('throws error if degree not found', async () => {
    degreeController.readDegree.mockResolvedValue(undefined);

    const mockParsedData = {
      programInfo: {
        degree: 'Non existant degree',
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
    await expect(buildTimeline(fileData)).rejects.toThrow('Error fetching degree data from database');
  });

  it('builds timeline from parsedData and correctly computes courses statuses and validates 200-level C- requirement', async () => {

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

    expect(comp248.status.status).toBe('completed');
    expect(comp248.status.semester).toBe("FALL 2023");
    expect(result.semesters[1].courses.find(c => c.code === 'COMP 248').message).toBeUndefined();


    expect(comp249.status.status).toBe('planned');
    expect(comp249.status.semester).toBe(futureTerm);
    expect(result.semesters[2].courses.find(c => c.code === 'COMP 249').message).toBeUndefined();
  });

  it('builds timeline from timelineData and reuses stored semesters and courseStatusMap', async () => {
    const timelineData = {
      _id: 'timeline1',
      userId: 'user1',
      name: 'My Timeline',
      degreeId: 'Bachelor of Engineering Computer Engineering',
      isExtendedCredit: false,
      isCoop: false,
      semesters: [
        {
          term: 'FALL 2023',
          courses: [{ code: 'COMP 232' }]
        }
      ],
      courseStatusMap: {
        'COMP 232': {
          status: 'completed',
          semester: 'FALL 2023'
        },
        'COMP 248': {
          status: 'planned',
          semester: 'WINTER 2024'
        }
      }
    };

    const result = await buildTimeline({
      type: 'timelineData',
      data: timelineData
    });

    // sanity
    expect(result).toBeDefined();

    // semesters reused exactly
    expect(result.semesters).toEqual(timelineData.semesters);

    // course statuses come from courseStatusMap
    expect(result.courses['COMP 232'].status).toEqual({
      status: 'completed',
      semester: 'FALL 2023'
    });

    expect(result.courses['COMP 248'].status).toEqual({
      status: 'planned',
      semester: 'WINTER 2024'
    });

    // course without entry defaults to incomplete
    expect(result.courses['COMP 249'].status).toEqual({
      status: 'incomplete',
      semester: null
    });

    // parseFile must NOT be called
    expect(parseFile).not.toHaveBeenCalled();
  });

  it('adds exemptions correctly', async () => {
    const mockParsedData = {
      programInfo: {
        degree: 'Bachelor of Engineering Computer Engineering',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false
      },
      semesters: [],
      transferedCourses: [],
      exemptedCourses: ['COMP 232'],
      deficiencyCourses: []
    };

    parseFile.mockResolvedValue(mockParsedData);

    const fileData = { type: 'file', data: Buffer.from('mock file') };
    const result = await buildTimeline(fileData);

    // Exemption pool exists
    const exemptionPool = result.pools.find(p => p._id === 'exemptions');
    expect(exemptionPool).toBeDefined();
    expect(exemptionPool.courses).toContain('COMP 232');

    // Status map updated
    expect(result.courses['COMP 232'].status.status).toBe('completed');
    expect(result.courses['COMP 232'].status.semester).toBeNull();
  });

  it('adds deficiencies correctly', async () => {
    const mockParsedData = {
      programInfo: {
        degree: 'Bachelor of Engineering Computer Engineering',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false
      },
      semesters: [],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: ['COMP 249']
    };

    parseFile.mockResolvedValue(mockParsedData);

    const fileData = { type: 'file', data: Buffer.from('mock file') };
    const result = await buildTimeline(fileData);

    const deficiencyPool = result.pools.find(p => p._id === 'deficiencies');
    expect(deficiencyPool).toBeDefined();
    expect(deficiencyPool.courses).toContain('COMP 249');

    // creditsRequired matches course
    const course = mockCourses.find(c => c._id === 'COMP 249');
    expect(deficiencyPool.creditsRequired).toBe(course?.credits);

    expect(result.courses['COMP 249'].status.status).toBe('incomplete');
    expect(result.courses['COMP 249'].status.semester).toBeNull();
  });

  it('buildTimelineFromDB returns timeline correctly', async () => {
    const mockTimeline = {
      _id: 'timeline1',
      userId: 'user1',
      name: 'My Timeline',
      degreeId: 'Bachelor of Engineering Computer Engineering',
      semesters: [],
      isExtendedCredit: false,
      isCoop: false,
      courseStatusMap: {
        'MATH 204': { status: 'completed', semester: 'FALL 2023' }
      },
      exemptions: ['MATH 204'],
      deficiencies: ['CHEM 206']
    };

    // mock Mongoose findById().lean().exec()
    const findByIdMock = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockTimeline)
    };
    jest.spyOn(Timeline, 'findById').mockReturnValue(findByIdMock);

    const result = await buildTimelineFromDB('timeline1');
    expect(result).toBeDefined();
    expect(result.courses['MATH 204'].status.status).toBe('completed');
    expect(result.courses['CHEM 206'].status.status).toBe('incomplete');

    const exemptionPool = result.pools.find(p => p._id === 'exemptions');
    expect(exemptionPool.courses).toContain('MATH 204');

    const deficiencyPool = result.pools.find(p => p._id === 'deficiencies');
    expect(deficiencyPool.courses).toContain('CHEM 206');

    expect(result.timelineName).toBe('My Timeline');
  });

  it('buildTimelineFromDB throws when timeline is not found', async () => {
      const findByIdMock = {
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(null)
      };
      jest.spyOn(Timeline, 'findById').mockReturnValue(findByIdMock);
     await expect(buildTimelineFromDB('missing-id')).rejects.toThrow('Timeline not found');
  });

  it('adds missing course data for non-degree courses', async () => {
    const mockParsedData = {
      programInfo: {
        degree: 'Bachelor of Engineering Computer Engineering',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false,
      },
      semesters: [
        {
          term: 'FALL 2023',
          courses: [{ code: 'MATH999', grade: 'A' }],
        },
      ],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: ['MATH999'],
    };

    parseFile.mockResolvedValue(mockParsedData);
    courseController.getCourseByCode.mockResolvedValue({
      _id: 'MATH 999',
      title: 'Special Topics',
      rules: { prereq: [] },
      credits: 3,
    });

    const result = await buildTimeline({
      type: 'file',
      data: Buffer.from('mock file'),
    });

    const semesterCourse = result.semesters[0].courses[0];
    expect(semesterCourse.code).toBe('MATH 999');
    expect(semesterCourse.message).toBeUndefined();
    expect(result.courses['MATH 999']).toBeDefined();
  });

  it('marks DISC grades with message', async () => {
    const mockParsedData = {
      programInfo: {
        degree: 'Bachelor of Engineering Computer Engineering',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false,
      },
      semesters: [
        {
          term: 'FALL 2023',
          courses: [{ code: 'COMP232', grade: 'DISC' }],
        },
      ],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: [],
    };

    parseFile.mockResolvedValue(mockParsedData);

    const result = await buildTimeline({
      type: 'file',
      data: Buffer.from('mock file'),
    });

    expect(result.semesters[0].courses[0].message).toBe('DISC');
  });

  it('sets  planned statuses based on term', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2023, 9, 1)); // Oct 1, 2023

    const mockParsedData = {
      programInfo: {
        degree: 'Bachelor of Engineering Computer Engineering',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false,
      },
      semesters: [
        {
          term: 'FALL 2024',
          courses: [{ code: 'COMP249' }],
        },
      ],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: [],
    };

    parseFile.mockResolvedValue(mockParsedData);

    const result = await buildTimeline({
      type: 'file',
      data: Buffer.from('mock file'),
    });
    expect(result.courses['COMP 249'].status.status).toBe('planned');
    jest.useRealTimers();
  });

  it('marks coop CWT courses as completed when PASS', async () => {
    const mockParsedData = {
      programInfo: {
        degree: 'Bachelor of Engineering Computer Engineering',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false,
        isCoop: true,
      },
      semesters: [
        {
          term: 'FALL 2023',
          courses: [{ code: 'CWT 100', grade: 'PASS' }, { code: 'CWT 101', grade: 'PASS' }],
        },
      ],
      transferedCourses: [],
      exemptedCourses: [],
      deficiencyCourses: [],
    };

    parseFile.mockResolvedValue(mockParsedData);

    courseController.getCourseByCode
      .mockResolvedValueOnce({ _id: 'CWT 100', title: 'Work Term 1', credits: 0 })
      .mockResolvedValueOnce({ _id: 'CWT 101', title: 'Reflective Learning I', credits: 0 });


    courseController.getCourseByCode
      .mockResolvedValueOnce({ _id: 'CWT 100', title: 'Work Term 1', credits: 0 })
      .mockResolvedValueOnce({ _id: 'CWT 101', title: 'Reflective Learning I', credits: 0 });

  
    const result = await buildTimeline({
      type: 'file',
      data: Buffer.from('mock file'),
    });

    expect(result.courses['CWT 100'].status.status).toBe('completed');
    expect(result.courses['CWT 101'].status.status).toBe('completed');
  });

  it('adds coop course pool when isCoop is true', async () => {
    courseController.getCourseByCode
      .mockResolvedValueOnce({ _id: 'CWT 100', title: 'Work Term 1', credits: 0 })
      .mockResolvedValueOnce({ _id: 'CWT 101', title: 'Reflective Learning I', credits: 0 });

    const formData = {
      type: 'form',
      data: {
        degree: 'Bachelor of Engineering Computer Engineering',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false,
        isCoop: true
      }
    };

    const result = await buildTimeline(formData);
    // Check that coop course pool was added
    const coopPool = result.pools.find(pool => pool.name === 'Co-op Work Terms');
    expect(coopPool).toBeDefined();
    expect(coopPool.courses).toEqual(['CWT 100', 'CWT 101']);

    // Check that coop courses are included in the courses map
    expect(result.courses['CWT 100']).toBeDefined();
    expect(result.courses['CWT 101']).toBeDefined();

    // Verify that the coursepoolController was called
    expect(coursepoolController.getCoursePool).toHaveBeenCalledWith('COOP_Co-op Work Terms');
  });

  it('builds timeline from predefined sequence', async () => {
    const formData = {
      type: 'form',
      data: {
        degree: 'Bachelor of Engineering Computer Engineering',
        firstTerm: 'FALL 2023',
        lastTerm: 'FALL 2024',
        isExtendedCreditProgram: false,
        predefinedSequence: [
          {
            term: 'Term 1',
            type: 'Academic',
            courses: ['COMP 232', 'COMP 248']
          },
          {
            term: 'Term 2',
            type: 'Co-op',
            coopLabel: 'Work Term 1'
          }
        ]
      }
    };

    const result = await buildTimeline(formData);

    expect(result).toBeDefined();
    expect(result.semesters.length).toBe(2);
    expect(result.semesters[0].term).toContain('FALL 2023');
    expect(result.semesters[0].courses.length).toBe(2);
    expect(result.semesters[0].courses[0].code).toBe('COMP 232');
    expect(result.semesters[1].term).toContain('WINTER 2024'); // Implicitly calculated next term
    expect(result.semesters[1].courses[0].code).toBe('Work Term 1');
  });

});


const {
  addCourseToUsedUnusedPool,
  mapNonDegreeSemesterCoursesToUsedUnusedPool,
} = require('../services/timeline/timelineService'); // <-- change path

// These MUST match the modules your helpers import internally

describe('Used/Unused pool helpers', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('addCourseToUsedUnusedPool', () => {
    it('creates the Used/Unused pool if missing and adds the course', () => {
      const pools = [];
      addCourseToUsedUnusedPool(pools, 'CHEM 205');

      const usedPool = pools.find((p) => p._id === 'used-unused-credits');
      expect(usedPool).toBeDefined();
      expect(usedPool.name).toBe('Used/Unused credits');
      expect(usedPool.creditsRequired).toBe(0);
      expect(usedPool.courses).toEqual(['CHEM 205']);
    });

    it('does not duplicate the same course code', () => {
      const pools = [
        {
          _id: 'used-unused-credits',
          name: 'Used/Unused credits',
          creditsRequired: 0,
          courses: ['CHEM 205'],
        },
      ];

      addCourseToUsedUnusedPool(pools, 'CHEM 205');
      addCourseToUsedUnusedPool(pools, 'CHEM 205');

      const usedPool = pools.find((p) => p._id === 'used-unused-credits');
      expect(usedPool.courses).toEqual(['CHEM 205']);
    });

    it('reuses existing pool by id', () => {
      const pools = [
        {
          _id: 'used-unused-credits',
          name: 'Used/Unused credits',
          creditsRequired: 0,
          courses: [],
        },
      ];

      addCourseToUsedUnusedPool(pools, 'PHYS 204');

      expect(pools).toHaveLength(1);
      expect(pools[0].courses).toEqual(['PHYS 204']);
    });
  });
});


