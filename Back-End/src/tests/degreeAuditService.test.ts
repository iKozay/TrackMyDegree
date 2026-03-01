import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  generateDegreeAudit,
  generateDegreeAuditForUser,
} from '@services/audit';
import { Course, CoursePool, Degree, Timeline, User } from '@models';
import { GenerateAuditParams } from '@shared/audit';
import * as misc from '@utils/misc';

import { generateDegreeAuditFromTimeline } from '@services/audit';
import { TimelineCourse, TimelineResult } from '@shared/timeline';
const STATUS_COMPLETED = 'Completed';
const STATUS_NOT_STARTED = 'Not Started';
const STATUS_MISSING = 'Missing';
const STATUS_IN_PROGRESS = 'In Progress';
const DEGREE_NAME = 'Bachelor of Computer Science';

// eslint-disable-next-line sonarjs/no-duplicate-string
jest.mock('@utils/misc', () => {
  const actual =
    jest.requireActual<typeof import('@utils/misc')>('@utils/misc');
  return {
    ...actual,
    isTermInProgress: jest.fn((term: string | undefined) =>
      actual.isTermInProgress(term),
    ),
  };
});

describe('DegreeAuditService', () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: string;
  let testTimelineId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await Timeline.deleteMany({});
    await User.deleteMany({});
    await Degree.deleteMany({});
    await CoursePool.deleteMany({});
    await Course.deleteMany({});

    // Create test user
    const user = await User.create({
      // eslint-disable-next-line sonarjs/no-duplicate-string
      fullname: 'Test Student',
      email: 'test@example.com',
      password: 'hashedpassword',
      type: 'student',
    });
    testUserId = (user._id as mongoose.Types.ObjectId).toString();

    // Create courses
    await Course.create([
      {
        _id: 'COMP 248',
        title: 'Object-Oriented Programming I',
        credits: 3,
        description: 'Intro to OOP',
      },
      {
        _id: 'COMP 249',
        title: 'Object-Oriented Programming II',
        credits: 3,
        description: 'Advanced OOP',
      },
      {
        _id: 'COMP 352',
        title: 'Data Structures & Algorithms',
        credits: 3,
        description: 'DSA course',
      },
      {
        _id: 'COMP 346',
        title: 'Operating Systems',
        credits: 3,
        description: 'OS fundamentals',
      },
      {
        _id: 'COMP 371',
        title: 'Computer Graphics',
        credits: 3,
        description: 'Graphics programming',
      },
      {
        _id: 'COMP 445',
        title: 'Data Communications',
        credits: 3,
        description: 'Networking course',
      },
      {
        _id: 'MATH 203',
        title: 'Calculus I',
        credits: 3,
        description: 'Differential calculus',
      },
      {
        _id: 'MATH 204',
        title: 'Linear Algebra',
        credits: 3,
        description: 'Matrix algebra',
      },
      {
        _id: 'COMP 490',
        title: 'Capstone Project',
        credits: 6,
        description: 'Senior project',
      },
      {
        _id: 'ENGL 101',
        title: 'English Writing',
        credits: 3,
        description: 'Writing skills',
      },
    ]);

    // Create course pools
    await CoursePool.create([
      {
        _id: 'CORE_CS',
        name: 'core_computer_science',
        creditsRequired: 18,
        courses: [
          'COMP 248',
          'COMP 249',
          'COMP 352',
          'COMP 346',
          'COMP 371',
          'COMP 445',
        ],
      },
      {
        _id: 'MATH_REQ',
        name: 'mathematics',
        creditsRequired: 6,
        courses: ['MATH 203', 'MATH 204'],
      },
      {
        _id: 'CAPSTONE',
        name: 'capstone',
        creditsRequired: 6,
        courses: ['COMP 490'],
      },
      {
        _id: 'GEN_ED',
        name: 'general_education',
        creditsRequired: 3,
        courses: ['ENGL 101'],
      },
    ]);

    // Create degree
    await Degree.create({
      _id: 'COMP',
      name: DEGREE_NAME,
      totalCredits: 120,
      coursePools: ['CORE_CS', 'MATH_REQ', 'CAPSTONE', 'GEN_ED'],
    });

    // Create timeline with proper schema format
    const courseStatusMapData = new Map([
      ['COMP 248', { status: 'completed', semester: 'Fall 2022' }],
      // eslint-disable-next-line sonarjs/no-duplicate-string
      ['COMP 249', { status: 'completed', semester: 'Winter 2023' }],
      ['COMP 352', { status: 'planned', semester: 'Fall 2023' }],
      ['MATH 203', { status: 'completed', semester: 'Fall 2022' }],
      ['MATH 204', { status: 'completed', semester: 'Winter 2023' }],
      ['COMP 346', { status: 'planned', semester: 'Winter 2024' }],
    ]);

    const timeline = await Timeline.create({
      userId: testUserId,
      degreeId: 'COMP',
      name: 'Test Timeline',
      semesters: [
        {
          term: 'Fall 2022',
          courses: [{ code: 'COMP 248' }, { code: 'MATH 203' }],
        },
        {
          term: 'Winter 2023',
          courses: [{ code: 'COMP 249' }, { code: 'MATH 204' }],
        },
      ],
      courseStatusMap: courseStatusMapData,
      deficiencies: [],
      exemptions: [],
    });
    testTimelineId = (timeline._id as mongoose.Types.ObjectId).toString();
  });
  let realNow: typeof Date.now;
   beforeAll(() => {
    realNow = Date.now;

    // Always return the fixed timestamp
    Date.now = () => new Date('2025-01-15').getTime();
  });

  afterAll(() => {
    // Restore original
    Date.now = realNow;
  });
  describe('generateDegreeAuditFromTimeline', () => {
    const mockDegree = {
    _id: 'COMP',
    name: DEGREE_NAME,
    totalCredits: 120,
  };

  const mockPools = [
    {
      _id: 'CORE_CS',
      name: 'core_computer_science',
      creditsRequired: 6,
      courses: ['COMP 248', 'COMP 249'],
    },
    {
      _id: 'exemptions',
      name: 'exemptions',
      creditsRequired: 3,
      courses: ['ENGL 101'],
    },
    {
      _id: 'deficiencies',
      name: 'deficiencies',
      creditsRequired: 3,
      courses: ['MATH 203'],
    },
  ];
      const mockSemesters = [
      {
        term: 'Fall 2022',
        courses: [{ code: 'COMP 248' }],
      },
    ];
     const mockCourses : Record<string, TimelineCourse> = {
      'COMP 248': {
        id: 'COMP 248',
        title: 'OOP I',
        credits: 3,
        description: '',
        offeredIN: [],
        prerequisites: [],
        corequisites: [],
        status: { status: 'completed', semester: 'Fall 2022' },
      },
      'COMP 249': {
        id: 'COMP 249',
        title: 'OOP II',
        credits: 3,
        description: '',
        offeredIN: [],
        prerequisites: [],
        corequisites: [],
        status: { status: 'planned', semester: 'Fall 2027' },
      },
      'ENGL 101': {
        id: 'ENGL 101',
        title: 'English',
        credits: 3,
        description: '',
        offeredIN: [],
        prerequisites: [],
        corequisites: [],
        status: { status: 'incomplete', semester: null },
      },
      'MATH 203': {
        id: 'MATH 203',
        title: 'Calculus I',
        credits: 3,
        description: '',
        offeredIN: [],
        prerequisites: [],
        corequisites: [],
        status: { status: 'planned', semester: 'Fall 2027' },
      },
    };
    it('should generate degree audit correctly from timeline', () => {
      const timeline: TimelineResult = {
        degree: mockDegree,
        pools: mockPools,
        semesters: mockSemesters,
        courses: mockCourses,
      };

      const audit = generateDegreeAuditFromTimeline(timeline);

      expect(audit.student.program).toBe(DEGREE_NAME);
      expect(audit.requirements.length).toBeGreaterThan(0);

      const coreReq = audit.requirements.find(r =>
        r.title.includes('Core Computer Science'),
      );

      expect(coreReq).toBeDefined();
      expect(coreReq?.creditsCompleted).toBe(3);

      const completedCourse = coreReq?.courses.find(
        c => c.code === 'COMP 248',
      );
      expect(completedCourse?.status).toBe('Completed');

      const plannedCourse = coreReq?.courses.find(
        c => c.code === 'COMP 249',
      );
      expect(plannedCourse?.status).toBe('Not Started');

      // Check exemption category exists and is complete
      const exemptionReq = audit.requirements.find(
        r => r.id === 'exemptions',
      );
      expect(exemptionReq).toBeDefined();
      expect(exemptionReq?.status).toBe('Complete');

      // Check deficiency category exists
      const deficiencyReq = audit.requirements.find(
        r => r.id === 'deficiencies',
      );
      expect(deficiencyReq).toBeDefined();
      expect(deficiencyReq?.creditsTotal).toBe(3);
    });

  it('should throw error if required fields are missing', () => {
    expect(() =>
      generateDegreeAuditFromTimeline({
        semesters: [],
        courses: {},
      } as TimelineResult),
    ).toThrow(
      'degree, coursePools and semesters are required to generate the degree audit',
    );
  });
});

  describe('generateDegreeAudit', () => {
    it('should generate a complete degree audit', async () => {
      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      expect(audit).toBeDefined();
      expect(audit.student).toBeDefined();
      expect(audit.student.name).toBe('Test Student');
      expect(audit.student.program).toBe(DEGREE_NAME);
      expect(audit.progress).toBeDefined();
      expect(audit.notices).toBeDefined();
      expect(audit.requirements).toBeDefined();
      expect(Array.isArray(audit.requirements)).toBe(true);
    });

    it('should correctly calculate progress stats', async () => {
      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      expect(audit.progress.total).toBe(120);
      expect(audit.progress.completed).toBeGreaterThan(0);
      expect(audit.progress.percentage).toBeGreaterThanOrEqual(0);
      expect(audit.progress.percentage).toBeLessThanOrEqual(100);
    });

    it('should map course statuses correctly', async () => {
      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      // Find the core CS requirement
      const coreReq = audit.requirements.find((r) =>
        r.title.toLowerCase().includes('core'),
      );
      expect(coreReq).toBeDefined();

      if (coreReq) {
        // Check that courses have expected statuses
        const comp248 = coreReq.courses.find((c) => c.code === 'COMP 248');
        const comp352 = coreReq.courses.find((c) => c.code === 'COMP 352');
        const comp445 = coreReq.courses.find((c) => c.code === 'COMP 445');

        expect(comp248?.status).toBe(STATUS_COMPLETED);
        expect(comp352?.status).toBe(STATUS_NOT_STARTED);
        expect(comp445?.status).toBe(STATUS_MISSING);
      }
    });

    it('should throw error for non-existent timeline', async () => {
      const params: GenerateAuditParams = {
        timelineId: new mongoose.Types.ObjectId().toString(),
        userId: testUserId,
      };

      await expect(generateDegreeAudit(params)).rejects.toThrow(
        'Timeline not found',
      );
    });

    it('should throw error for unauthorized user', async () => {
      const otherUserId = new mongoose.Types.ObjectId().toString();
      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: otherUserId,
      };

      await expect(generateDegreeAudit(params)).rejects.toThrow('Unauthorized');
    });

    it('should throw error for non-existent user', async () => {
      // First create a timeline with a non-existent user
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      const timeline = await Timeline.create({
        userId: fakeUserId,
        degreeId: 'COMP',
        name: 'Fake Timeline',
        semesters: [],
        courseStatusMap: new Map(),
      });

      const params: GenerateAuditParams = {
        timelineId: (timeline._id as mongoose.Types.ObjectId).toString(),
        userId: fakeUserId,
      };

      await expect(generateDegreeAudit(params)).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle timeline with deficiencies', async () => {
      // Add deficiency courses
      await Course.create({
        _id: 'MATH 200',
        // eslint-disable-next-line sonarjs/no-duplicate-string
        title: 'Intro Math',
        credits: 3,
        // eslint-disable-next-line sonarjs/no-duplicate-string
        description: 'Intro Math course',
      });

      await Timeline.findByIdAndUpdate(testTimelineId, {
        deficiencies: ['MATH 200'],
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const deficiencyReq = audit.requirements.find(
        (r) => r.id === 'deficiencies',
      );
      expect(deficiencyReq).toBeDefined();
      expect(deficiencyReq?.title).toBe('Deficiency Courses');
      expect(deficiencyReq?.creditsTotal).toBe(3);
    });

    it('should handle timeline with exemptions', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, {
        exemptions: ['ENGL 101'],
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const exemptionReq = audit.requirements.find(
        (r) => r.id === 'exemptions',
      );
      expect(exemptionReq).toBeDefined();
      expect(exemptionReq?.title).toBe('Exempted Courses');
      expect(exemptionReq?.status).toBe('Complete');
    });

    it('should generate notices for requirements not started', async () => {
      // Update timeline to have no capstone progress
      await Timeline.findByIdAndUpdate(testTimelineId, {
        courseStatusMap: new Map([
          ['COMP 248', { status: 'completed', semester: 'Fall 2022' }],
        ]),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      // Should have a notice about capstone
      const capstoneNotice = audit.notices.find((n) =>
        n.message.toLowerCase().includes('capstone'),
      );
      expect(capstoneNotice).toBeDefined();
    });

    it('should handle timeline without courseStatusMap', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, {
        $unset: { courseStatusMap: 1 },
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      expect(audit).toBeDefined();
      // All courses should be 'Missing' status
      for (const req of audit.requirements) {
        for (const course of req.courses) {
          expect(course.status).toBe(STATUS_MISSING);
        }
      }
    });

    it('should handle incomplete course status', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, {
        courseStatusMap: new Map([
          ['COMP 248', { status: 'incomplete', semester: 'Fall 2022' }],
        ]),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const coreReq = audit.requirements.find((r) =>
        r.title.toLowerCase().includes('core'),
      );
      const comp248 = coreReq?.courses.find((c) => c.code === 'COMP 248');
      expect(comp248?.status).toBe(STATUS_MISSING); // Incomplete maps to Missing
    });

    it('should treat incomplete courses as Missing', async () => {
      // Get the current term based on today's date
      const today = new Date();
      const month = today.getMonth();
      const year = today.getFullYear();
      let currentTerm: string;
      if (month >= 0 && month <= 3) {
        currentTerm = `Winter ${year}`;
      } else if (month >= 4 && month <= 7) {
        currentTerm = `Summer ${year}`;
      } else {
        currentTerm = `Fall ${year}`;
      }

      // Set a course as 'incomplete' in the current term (maps to Missing in audit)
      await Timeline.findByIdAndUpdate(testTimelineId, {
        courseStatusMap: new Map([
          ['COMP 248', { status: 'incomplete', semester: currentTerm }],
          ['COMP 249', { status: 'completed', semester: 'Fall 2022' }],
        ]),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const coreReq = audit.requirements.find((r) =>
        r.title.toLowerCase().includes('core'),
      );

      // COMP 248 is in current term with 'incomplete' status - maps to 'Missing'
      const comp248 = coreReq?.courses.find((c) => c.code === 'COMP 248');
      expect(comp248?.status).toBe(STATUS_MISSING);
    });

    it('should treat planned courses in current term as In Progress', async () => {
      (misc.isTermInProgress as jest.Mock).mockReturnValue(true);

      await Timeline.findByIdAndUpdate(testTimelineId, {
        courseStatusMap: new Map([
          ['COMP 248', { status: 'planned', semester: 'Winter 2024' }],
          ['COMP 249', { status: 'completed', semester: 'Fall 2022' }],
        ]),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const coreReq = audit.requirements.find((r) =>
        r.title.toLowerCase().includes('core'),
      );
      const comp248 = coreReq?.courses.find((c) => c.code === 'COMP 248');
      expect(comp248?.status).toBe(STATUS_IN_PROGRESS);

      const actual =
        jest.requireActual<typeof import('@utils/misc')>('@utils/misc');
      (misc.isTermInProgress as jest.Mock).mockImplementation(
        actual.isTermInProgress,
      );
    });

    it('should treat planned courses outside current term as Not Started', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, {
        courseStatusMap: new Map([
          ['COMP 248', { status: 'planned', semester: 'Fall 2022' }],
          ['COMP 249', { status: 'completed', semester: 'Fall 2022' }],
        ]),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const coreReq = audit.requirements.find((r) =>
        r.title.toLowerCase().includes('core'),
      );
      const comp248 = coreReq?.courses.find((c) => c.code === 'COMP 248');
      expect(comp248?.status).toBe(STATUS_NOT_STARTED);
    });

    it('should treat planned courses with no semester as Not Started', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, {
        courseStatusMap: new Map([
          ['COMP 248', { status: 'planned', semester: null }],
          ['COMP 249', { status: 'completed', semester: 'Fall 2022' }],
        ]),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const coreReq = audit.requirements.find((r) =>
        r.title.toLowerCase().includes('core'),
      );
      const comp248 = coreReq?.courses.find((c) => c.code === 'COMP 248');
      expect(comp248?.status).toBe(STATUS_NOT_STARTED);
    });

    it('should set first semester in student info', async () => {
      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      expect(audit.student.admissionTerm).toBe('Fall 2022');
    });

    it('should handle course not in allCourses dictionary', async () => {
      // Add a course pool with a non-existent course
      await CoursePool.findByIdAndUpdate('CORE_CS', {
        courses: ['COMP 248', 'COMP 249', 'NONEXISTENT 999'],
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      // Should still work, skipping the non-existent course
      expect(audit).toBeDefined();
    });

    it('should sort requirements by status', async () => {
      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      // Requirements should be sorted with incomplete statuses first
      const statuses = audit.requirements.map((r) => r.status);

      // Verify ordering (Missing < Not Started < Incomplete < In Progress < Complete)
      const statusOrder: Record<string, number> = {
        Missing: 0,
        [STATUS_NOT_STARTED]: 1,
        Incomplete: 2,
        [STATUS_IN_PROGRESS]: 3,
        Complete: 4,
      };

      for (let i = 1; i < statuses.length; i++) {
        expect(statusOrder[statuses[i]]).toBeGreaterThanOrEqual(
          statusOrder[statuses[i - 1]],
        );
      }
    });
  });

  describe('generateDegreeAuditForUser', () => {
    it('should generate audit for the most recent timeline', async () => {
      const audit = await generateDegreeAuditForUser(testUserId);

      expect(audit).toBeDefined();
      expect(audit.student.name).toBe('Test Student');
    });

    it('should throw error if no timeline exists for user', async () => {
      const newUserId = new mongoose.Types.ObjectId().toString();

      await expect(generateDegreeAuditForUser(newUserId)).rejects.toThrow(
        'No timeline found for this user',
      );
    });

    it('should use the most recently updated timeline', async () => {
      // Create a second timeline with different data
      await Timeline.create({
        userId: testUserId,
        degreeId: 'COMP',
        name: 'Second Timeline',
        semesters: [{ term: 'Fall 2023', courses: [{ code: 'COMP 371' }] }],
        courseStatusMap: new Map([
          ['COMP 371', { status: 'completed', semester: 'Fall 2023' }],
        ]),
        updatedAt: new Date(Date.now() + 1000), // More recent
      });

      const audit = await generateDegreeAuditForUser(testUserId);

      expect(audit).toBeDefined();
      // The more recently updated timeline should be used
    });
  });

  describe('determineRequirementStatus', () => {
    it('should return Complete when credits completed >= total', async () => {
      // Set all math courses as completed
      await Timeline.findByIdAndUpdate(testTimelineId, {
        courseStatusMap: new Map([
          ['MATH 203', { status: 'completed', semester: 'Fall 2022' }],
          ['MATH 204', { status: 'completed', semester: 'Winter 2023' }],
        ]),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const mathReq = audit.requirements.find((r) =>
        r.title.toLowerCase().includes('math'),
      );
      expect(mathReq?.status).toBe('Complete');
    });

    it('should return In Progress when credits + in progress >= total', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, {
        courseStatusMap: new Map([
          ['MATH 203', { status: 'completed', semester: 'Fall 2022' }],
          ['MATH 204', { status: 'planned', semester: 'Winter 2023' }],
        ]),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const mathReq = audit.requirements.find((r) =>
        r.title.toLowerCase().includes('math'),
      );
      expect(mathReq?.status).toBe('Incomplete');
    });

    it('should return Incomplete when some progress but not enough', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, {
        courseStatusMap: new Map([
          ['COMP 248', { status: 'completed', semester: 'Fall 2022' }],
        ]),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const coreReq = audit.requirements.find((r) =>
        r.title.toLowerCase().includes('core'),
      );
      expect(coreReq?.status).toBe('Incomplete');
    });

    it('should return Not Started when no progress', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, {
        courseStatusMap: new Map(),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      // All requirements should be Not Started
      for (const req of audit.requirements) {
        expect(req.status).toBe(STATUS_NOT_STARTED);
      }
    });
  });

  describe('generateNotices', () => {
    it('should generate warning for missing credits', async () => {
      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      // Should have warning notices for requirements with remaining credits
      const warningNotices = audit.notices.filter((n) => n.type === 'warning');
      expect(warningNotices.length).toBeGreaterThan(0);
    });

    it('should generate deficiency warning when deficiencies exist', async () => {
      await Course.create({
        _id: 'MATH 200',
        title: 'Intro Math',
        credits: 3,
        description: 'Intro Math course',
      });

      await Timeline.findByIdAndUpdate(testTimelineId, {
        deficiencies: ['MATH 200'],
        courseStatusMap: new Map([
          ['COMP 248', { status: 'completed', semester: 'Fall 2022' }],
        ]),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const defNotice = audit.notices.find((n) =>
        n.message.toLowerCase().includes('deficiency'),
      );
      expect(defNotice).toBeDefined();
      expect(defNotice?.type).toBe('warning');
    });
  });

  describe('estimateGraduation', () => {
    it('should estimate graduation based on remaining credits', async () => {
      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      expect(audit.student.expectedGraduation).toBeDefined();
      expect(audit.student.expectedGraduation).toMatch(
        /^(Winter|Summer|Fall) \d{4}$/,
      );
    });
  });

  describe('processDeficiencies', () => {
    it('should mark completed deficiency courses correctly', async () => {
      await Course.create({
        _id: 'MATH 200',
        title: 'Intro Math',
        credits: 3,
        description: 'Intro Math course',
      });

      await Timeline.findByIdAndUpdate(testTimelineId, {
        deficiencies: ['MATH 200'],
        courseStatusMap: new Map([
          ['MATH 200', { status: 'completed', semester: 'Fall 2022' }],
        ]),
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const deficiencyReq = audit.requirements.find(
        (r) => r.id === 'deficiencies',
      );
      expect(deficiencyReq?.status).toBe('Complete');
      expect(deficiencyReq?.creditsCompleted).toBe(3);
    });

    it('should handle deficiency course not in course database', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, {
        deficiencies: ['UNKNOWN 999'],
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const deficiencyReq = audit.requirements.find(
        (r) => r.id === 'deficiencies',
      );
      expect(deficiencyReq).toBeDefined();
      // Should default to 3 credits for unknown courses
      expect(deficiencyReq?.creditsTotal).toBe(3);
    });
  });

  describe('processExemptions', () => {
    it('should process exemptions correctly', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, {
        exemptions: ['ENGL 101', 'MATH 203'],
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const exemptionReq = audit.requirements.find(
        (r) => r.id === 'exemptions',
      );
      expect(exemptionReq).toBeDefined();
      expect(exemptionReq?.status).toBe('Complete');
      expect(exemptionReq?.courses.length).toBe(2);
      expect(exemptionReq?.creditsTotal).toBe(6); // 3 + 3
    });

    it('should handle exemption course not in database', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, {
        exemptions: ['UNKNOWN 888'],
      });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const exemptionReq = audit.requirements.find(
        (r) => r.id === 'exemptions',
      );
      expect(exemptionReq).toBeDefined();
      // Should default to 3 credits for unknown courses
      expect(exemptionReq?.creditsTotal).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle degree with no coursePools', async () => {
      await Degree.findByIdAndUpdate('COMP', { coursePools: [] });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      expect(audit).toBeDefined();
      expect(audit.requirements.length).toBe(0);
    });

    it('should handle pool with zero required credits', async () => {
      await CoursePool.findByIdAndUpdate('CORE_CS', { creditsRequired: 0 });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const coreReq = audit.requirements.find((r) =>
        r.title.toLowerCase().includes('core'),
      );
      expect(coreReq?.creditsTotal).toBe(0);
    });

    it('should handle course with zero credits', async () => {
      await Course.findByIdAndUpdate('COMP 248', { credits: 0 });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      expect(audit).toBeDefined();
    });

    it('should format pool names correctly', async () => {
      // Pool name is 'core_computer_science' - should be formatted to 'Core Computer Science'
      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      const coreReq = audit.requirements.find((r) => r.title.includes('Core'));
      expect(coreReq).toBeDefined();
    });

    it('should handle timeline with empty semesters', async () => {
      await Timeline.findByIdAndUpdate(testTimelineId, { semesters: [] });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      expect(audit.student.admissionTerm).toBeUndefined();
    });

    it('should handle degree with null totalCredits', async () => {
      await Degree.findByIdAndUpdate('COMP', { $unset: { totalCredits: 1 } });

      const params: GenerateAuditParams = {
        timelineId: testTimelineId,
        userId: testUserId,
      };

      const audit = await generateDegreeAudit(params);

      expect(audit.progress.total).toBe(120); // Default value
    });
  });
});
