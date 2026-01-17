import { buildTimeline, buildTimelineFromDB, addEcpCoursePools } from '../services/timeline/timelineService';
import { ParsedData, ProgramInfo } from '../types/transcript';
import { degreeController, CoursePoolInfo, DegreeData } from '../controllers/degreeController';
import { courseController } from '../controllers/courseController';
import { SEASONS } from '../utils/constants';

const MOCK_DEGREE_ID = 'degree-123';
const ENGR_ECP_DEGREE_ID = 'ENGR_ECP';
const COMP_ECP_DEGREE_ID = 'COMP_ECP';
const BENG_COMP_ENG_NAME = 'BEng in Computer Engineering';
const INTRO_TO_ENGINEERING_TITLE = 'Intro to Engineering';

// Mock the degreeController and courseController
jest.mock('../controllers/degreeController', () => ({
  degreeController: {
    readDegree: jest.fn(),
    getCoursePoolsForDegree: jest.fn(),
    getCoursesForDegree: jest.fn(),
    readAllDegrees: jest.fn(),
  },
  CoursePoolInfo: {},
  DegreeData: {},
}));

jest.mock('../controllers/courseController', () => ({
  courseController: {
    getCourseByCode: jest.fn(),
  },
}));

// Mock the Timeline model
jest.mock('../models', () => ({
  Timeline: {
    findById: jest.fn(),
  },
}));

// Import mocks after jest.mock
const mockReadDegree = jest.mocked(degreeController.readDegree);
const mockGetCoursePoolsForDegree = jest.mocked(degreeController.getCoursePoolsForDegree);
const mockGetCoursesForDegree = jest.mocked(degreeController.getCoursesForDegree);
const mockReadAllDegrees = jest.mocked(degreeController.readAllDegrees);
const mockGetCourseByCode = jest.mocked(courseController.getCourseByCode);
const mockTimelineFindById = jest.mocked(require('../models').Timeline.findById);

describe('buildTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when called with file type', () => {
    it('should build timeline from parsed data', async () => {
      // Mock degree data
      const mockDegree = {
        _id: MOCK_DEGREE_ID,
        name: BENG_COMP_ENG_NAME,
        totalCredits: 120,
      };
      
      const mockCoursePools = [
        { _id: 'core', name: 'Core', courses: ['ENGR 201', 'ENGR 202'], creditsRequired: 6 },
      ];

      const mockCourses = {
        'ENGR 201': {
          _id: 'ENGR 201',
          title: INTRO_TO_ENGINEERING_TITLE,
          credits: 3,
          offeredIn: ['FALL', 'WINTER'],
        },
        'ENGR 202': { _id: 'ENGR 202', title: 'Engineering Math', credits: 3, offeredIn: ['FALL', 'WINTER'] },
      };

      mockReadDegree.mockResolvedValue(mockDegree);
      mockGetCoursePoolsForDegree.mockResolvedValue(mockCoursePools);
      mockGetCoursesForDegree.mockResolvedValue(Object.values(mockCourses));
      mockReadAllDegrees.mockResolvedValue([{ _id: MOCK_DEGREE_ID, name: BENG_COMP_ENG_NAME, totalCredits: 120 }]);

      // Mock parsed data
      const mockParsedData: ParsedData = {
        programInfo: {
          degree: 'Bachelor of Engineering Computer Engineering',
          firstTerm: 'FALL 2024',
          lastTerm: 'WINTER 2028',
          isCoop: false,
          isExtendedCreditProgram: false,
        },
        semesters: [
          { term: 'FALL 2024', courses: [{ code: 'ENGR 201', grade: 'A' }] },
        ],
        transferedCourses: [],
        deficiencyCourses: [],
        exemptedCourses: [],
      };

      const mockBuffer = Buffer.from('mock file content');

      const result = await buildTimeline({
        type: 'file',
        data: mockBuffer,
      });

      expect(result).toBeDefined();
      expect(result?.courses).toBeDefined();
      expect(result?.semesters).toBeDefined();
    });
  });

  describe('when called with form type', () => {
    it('should build timeline from form data', async () => {
      const mockDegree = {
        _id: MOCK_DEGREE_ID,
        name: 'BEng in Software Engineering',
        totalCredits: 120,
      };
      
      const mockCoursePools = [
        { _id: 'core', name: 'Core', courses: ['ENGR 201'], creditsRequired: 3 },
      ];

      const mockCourses = {
        'ENGR 201': { _id: 'ENGR 201', title: INTRO_TO_ENGINEERING_TITLE, credits: 3, offeredIn: ['FALL', 'WINTER'] },
      };

      mockReadDegree.mockResolvedValue(mockDegree);
      mockGetCoursePoolsForDegree.mockResolvedValue(mockCoursePools);
      mockGetCoursesForDegree.mockResolvedValue(Object.values(mockCourses));
      mockReadAllDegrees.mockResolvedValue([{ _id: MOCK_DEGREE_ID, name: 'BEng in Software Engineering', totalCredits: 120 }]);

      const formData: ProgramInfo = {
        degree: MOCK_DEGREE_ID,
        firstTerm: 'FALL 2024',
        lastTerm: 'WINTER 2027',
        isCoop: false,
        isExtendedCreditProgram: false,
      };

      const result = await buildTimeline({
        type: 'form',
        data: formData,
      });

      expect(result).toBeDefined();
      expect(mockReadDegree).toHaveBeenCalledWith(MOCK_DEGREE_ID);
    });
  });
});

describe('addEcpCoursePools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when degreeId contains BEng', () => {
    it('should add ENGR_ECP course pools', async () => {
      const mockEcPools = [
        { _id: 'ecp-1', name: 'ECP Pool 1', courses: ['CHEM 101'], creditsRequired: 3 },
        { _id: 'ecp-2', name: 'ECP Pool 2', courses: ['MATH 101'], creditsRequired: 4 },
      ];

      mockGetCoursePoolsForDegree.mockResolvedValue(mockEcPools);
      mockGetCoursesForDegree.mockResolvedValue([]);
      mockReadDegree.mockResolvedValue({ _id: ENGR_ECP_DEGREE_ID, name: 'ENGR ECP', totalCredits: 30 });

      const coursePools: CoursePoolInfo[] = [
        { _id: 'core', name: 'Core', courses: ['ENGR 201'], creditsRequired: 3 },
      ];
      const deficiencies: string[] = [];

      await addEcpCoursePools(`${MOCK_DEGREE_ID}-BEng`, coursePools, deficiencies);

      expect(mockGetCoursePoolsForDegree).toHaveBeenCalledWith('ENGR_ECP');
      expect(mockReadDegree).toHaveBeenCalledWith('ENGR_ECP');
      expect(coursePools.length).toBe(3);
      expect(coursePools[1]._id).toBe('ecp-1');
      expect(coursePools[2]._id).toBe('ecp-2');
      expect(deficiencies).toContain('ECP Pool 1');
      expect(deficiencies).toContain('ECP Pool 2');
    });
  });

  describe('when degreeId contains BCompSc', () => {
    it('should add COMP_ECP course pools', async () => {
      const mockEcPools = [
        { _id: 'comp-ecp-1', name: 'Comp ECP Pool', courses: ['COMP 101'], creditsRequired: 3 },
      ];

      mockGetCoursePoolsForDegree.mockResolvedValue(mockEcPools);
      mockGetCoursesForDegree.mockResolvedValue([]);
      mockReadDegree.mockResolvedValue({ _id: COMP_ECP_DEGREE_ID, name: 'COMP ECP', totalCredits: 30 });

      const coursePools: CoursePoolInfo[] = [
        { _id: 'core', name: 'Core', courses: ['COMP 201'], creditsRequired: 3 },
      ];
      const deficiencies: string[] = [];

      await addEcpCoursePools('degree-456-BCompSc', coursePools, deficiencies);

      expect(mockGetCoursePoolsForDegree).toHaveBeenCalledWith('COMP_ECP');
      expect(mockReadDegree).toHaveBeenCalledWith('COMP_ECP');
      expect(coursePools.length).toBe(2);
      expect(coursePools[1]._id).toBe('comp-ecp-1');
      expect(deficiencies).toContain('Comp ECP Pool');
    });
  });

  describe('when degreeId does not contain BEng or BCompSc', () => {
    it('should not modify course pools or deficiencies', async () => {
      const coursePools: CoursePoolInfo[] = [
        { _id: 'core', name: 'Core', courses: ['MATH 201'], creditsRequired: 3 },
      ];
      const deficiencies: string[] = [];

      await addEcpCoursePools('degree-789-Arts', coursePools, deficiencies);

      expect(mockGetCoursePoolsForDegree).not.toHaveBeenCalled();
      expect(mockReadDegree).not.toHaveBeenCalled();
      expect(coursePools.length).toBe(1);
      expect(deficiencies.length).toBe(0);
    });
  });

  describe('when ECP degree data is not found in DB', () => {
    it('should not crash and should not modify arrays', async () => {
      mockReadDegree.mockResolvedValue(null as unknown as DegreeData);
      mockGetCoursePoolsForDegree.mockResolvedValue([]);

      const coursePools: CoursePoolInfo[] = [
        { _id: 'core', name: 'Core', courses: ['ENGR 201'], creditsRequired: 3 },
      ];
      const deficiencies: string[] = [];

      await addEcpCoursePools(`${MOCK_DEGREE_ID}-BEng`, coursePools, deficiencies);

      // getCoursePoolsForDegree is called inside getDegreeData even when readDegree returns null
      // but the function should handle this gracefully without crashing
      expect(coursePools.length).toBe(1);
      expect(deficiencies.length).toBe(0);
    });
  });

  describe('when degreeId includes BEng in longer string', () => {
    it('should still match and add ENGR_ECP pools', async () => {
      const mockEcPools = [
        { _id: 'ecp-1', name: 'Math ECP', courses: ['MATH 101'], creditsRequired: 4 },
      ];

      mockGetCoursePoolsForDegree.mockResolvedValue(mockEcPools);
      mockGetCoursesForDegree.mockResolvedValue([]);
      mockReadDegree.mockResolvedValue({ _id: ENGR_ECP_DEGREE_ID, name: 'ENGR ECP', totalCredits: 30 });

      const coursePools: CoursePoolInfo[] = [];
      const deficiencies: string[] = [];

      // Test with degreeId format that exactly matches "BEng" (case-sensitive)
      await addEcpCoursePools(`${MOCK_DEGREE_ID}-BEng`, coursePools, deficiencies);

      expect(mockGetCoursePoolsForDegree).toHaveBeenCalledWith('ENGR_ECP');
      expect(coursePools.length).toBe(1);
      expect(deficiencies).toContain('Math ECP');
    });
  });
});

describe('buildTimelineFromDB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error when timeline is not found', async () => {
    mockTimelineFindById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(buildTimelineFromDB('invalid-id')).rejects.toThrow('Timeline not found');
  });

  it('should build timeline from existing timeline document', async () => {
    const mockTimeline = {
      _id: 'timeline-123',
      userId: 'user-1',
      name: 'My Timeline',
      degreeId: MOCK_DEGREE_ID,
      semesters: [{ term: 'FALL 2024', courses: [{ code: 'ENGR 201' }] }],
      courseStatusMap: {},
      isExtendedCredit: false,
      isCoop: false,
      exemptions: [],
      deficiencies: [],
    };

    const mockDegree = {
      _id: MOCK_DEGREE_ID,
      name: BENG_COMP_ENG_NAME,
      totalCredits: 120,
    };
    
    const mockCoursePools = [
      { _id: 'core', name: 'Core', courses: ['ENGR 201'], creditsRequired: 3 },
    ];

    const mockCourses = {
      'ENGR 201': { _id: 'ENGR 201', title: INTRO_TO_ENGINEERING_TITLE, credits: 3, offeredIn: ['FALL', 'WINTER'] },
    };

    mockTimelineFindById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTimeline),
      }),
    });
    
    mockReadDegree.mockResolvedValue(mockDegree);
    mockGetCoursePoolsForDegree.mockResolvedValue(mockCoursePools);
    mockGetCoursesForDegree.mockResolvedValue(Object.values(mockCourses));
    mockReadAllDegrees.mockResolvedValue([{ _id: MOCK_DEGREE_ID, name: BENG_COMP_ENG_NAME, totalCredits: 120 }]);

    const result = await buildTimelineFromDB('timeline-123');

    expect(result).toBeDefined();
    expect(result?.semesters).toBeDefined();
    expect(mockReadDegree).toHaveBeenCalledWith(MOCK_DEGREE_ID);
  });
});

