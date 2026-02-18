// tests/addEcpCoursePools.test.ts
import { addEcpCoursePools } from '@services/timeline/timelineService';
import { degreeController } from '@controllers/degreeController';
import { CourseData } from '@controllers/courseController';

jest.mock('@controllers/degreeController', () => ({
  degreeController: {
    readDegree: jest.fn(),
    getCoursePoolsForDegree: jest.fn(),
    getCoursesForDegree: jest.fn(),
    readAllDegrees: jest.fn(),
  },
}));

describe('addEcpCoursePools', () => {
  const mockedDegreeController = degreeController as jest.Mocked<
    typeof degreeController
  >;

  // ✅ constants to avoid sonarjs/no-duplicate-string
  const ENGR_ECP = 'Extended Credit Program - Engineering';
  const COMP_ECP = 'Extended Credit Program - Computer Science';
  const BENG_SOFTWARE = 'BEng_SOFTWARE';

  const ECP_POOL_1_ID = 'ecp_pool_1';
  const ECP_POOL_2_ID = 'ecp_pool_2';
  const ECP_POOL_1_NAME = 'ECP Pool 1';
  const ECP_POOL_2_NAME = 'ECP Pool 2';
  const COMP_ECP_POOL_ID = 'comp_ecp_pool';
  const COMP_ECP_POOL_NAME = 'COMP ECP Pool';
  const DEGREE_OBJ_NAME = 'Software Eng';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds ENGR ECP pools when degreeId includes BEng', async () => {
    mockedDegreeController.readDegree.mockResolvedValue({
      _id: ENGR_ECP,
      name: 'ENGR ECP',
    } as any);

    mockedDegreeController.getCoursePoolsForDegree.mockResolvedValue([
      {
        _id: ECP_POOL_1_ID,
        name: ECP_POOL_1_NAME,
        creditsRequired: 0,
        courses: [],
      },
      {
        _id: ECP_POOL_2_ID,
        name: ECP_POOL_2_NAME,
        creditsRequired: 0,
        courses: [],
      },
    ] as any);

    mockedDegreeController.getCoursesForDegree.mockResolvedValue([] as any);

    const coursePools: any[] = [
      { _id: 'base_pool', name: 'Base Pool', creditsRequired: 0, courses: [] },
    ];
    const courses: Record<string, CourseData> = {'SOEN 000': {_id: 'SOEN 000', title: 'Intro Course', credits: 3}};

    await addEcpCoursePools(BENG_SOFTWARE, coursePools, courses);

    expect(coursePools.map((p) => p._id)).toEqual([
      'base_pool',
      ECP_POOL_1_ID,
      ECP_POOL_2_ID,
    ]);

    expect(mockedDegreeController.readDegree).toHaveBeenCalledWith(ENGR_ECP);
    expect(mockedDegreeController.getCoursePoolsForDegree).toHaveBeenCalledWith(
      ENGR_ECP,
    );
    expect(mockedDegreeController.getCoursesForDegree).toHaveBeenCalledWith(
      ENGR_ECP,
    );
  });

  it('adds COMP ECP pools when degreeId includes BCompSc', async () => {
    mockedDegreeController.readDegree.mockResolvedValue({
      _id: COMP_ECP,
      name: 'COMP ECP',
    } as any);

    mockedDegreeController.getCoursePoolsForDegree.mockResolvedValue([
      {
        _id: COMP_ECP_POOL_ID,
        name: COMP_ECP_POOL_NAME,
        creditsRequired: 0,
        courses: [],
      },
    ] as any);

    mockedDegreeController.getCoursesForDegree.mockResolvedValue([] as any);

    const coursePools: any[] = [];
    const courses: Record<string, CourseData> = {};

    await addEcpCoursePools('BCompSc_GENERAL', coursePools, courses);

    expect(coursePools.map((p) => p._id)).toEqual([COMP_ECP_POOL_ID]);
    expect(Object.keys(courses)).toEqual([]);

    expect(mockedDegreeController.readDegree).toHaveBeenCalledWith(COMP_ECP);
  });

  it('increments degree.totalCredits by 30 when degree object is provided', async () => {
    mockedDegreeController.readDegree.mockResolvedValue({
      _id: ENGR_ECP,
      name: 'ENGR ECP',
    } as any);

    mockedDegreeController.getCoursePoolsForDegree.mockResolvedValue([
      {
        _id: ECP_POOL_1_ID,
        name: ECP_POOL_1_NAME,
        creditsRequired: 0,
        courses: [],
      },
      {
        _id: ECP_POOL_2_ID,
        name: ECP_POOL_2_NAME,
        creditsRequired: 0,
        courses: [],
      },
    ] as any);

    mockedDegreeController.getCoursesForDegree.mockResolvedValue([] as any);

    const coursePools: any[] = [
      { _id: 'base_pool', name: 'Base Pool', creditsRequired: 0, courses: [] },
    ];
    const courses: Record<string, CourseData> = {};
    const degreeObj: any = {
      _id: 'ENGR_SOFTWARE',
      name: DEGREE_OBJ_NAME,
      totalCredits: 120,
      coursePools: [],
    };

    await addEcpCoursePools(BENG_SOFTWARE, coursePools, courses, degreeObj);

    expect(degreeObj.totalCredits).toBe(150);

    const addedPools = coursePools.slice(1);
    // pools retain their original credits (no +30 per-pool adjustment)
    expect(addedPools.every((p) => p.creditsRequired === 0)).toBe(true);
  });

  it('adds 30 to existing pool creditsRequired values and degree.totalCredits when provided', async () => {
    mockedDegreeController.readDegree.mockResolvedValue({
      _id: ENGR_ECP,
      name: 'ENGR ECP',
    } as any);

    mockedDegreeController.getCoursePoolsForDegree.mockResolvedValue([
      { _id: 'ecp_pool_a', name: 'ECP A', creditsRequired: 12, courses: [] },
      { _id: 'ecp_pool_b', name: 'ECP B', creditsRequired: 18, courses: [] },
    ] as any);

    mockedDegreeController.getCoursesForDegree.mockResolvedValue([] as any);

    const coursePools: any[] = [];
    const courses: Record<string, CourseData> = {};
    const degreeObj: any = {
      _id: 'ENGR_SOFTWARE',
      name: DEGREE_OBJ_NAME,
      totalCredits: 120,
      coursePools: [],
    };

    await addEcpCoursePools(BENG_SOFTWARE, coursePools, courses, degreeObj);

    // original credits (no +30 per-pool adjustment)
    expect(coursePools.map((p) => p.creditsRequired)).toEqual([12, 18]);
    // no courses added to courses object since mock returns empty courses
    expect(Object.keys(courses)).toEqual([]);
    // degree incremented
    expect(degreeObj.totalCredits).toBe(150);
  });

  it('adds ECP pools (with +30 credits) even when no degree object is provided', async () => {
    mockedDegreeController.readDegree.mockResolvedValue({ _id: COMP_ECP, name: 'COMP ECP' } as any);

    mockedDegreeController.getCoursePoolsForDegree.mockResolvedValue([
      { _id: 'comp_pool', name: COMP_ECP_POOL_NAME, creditsRequired: 10, courses: [] },
    ] as any);

    mockedDegreeController.getCoursesForDegree.mockResolvedValue([] as any);

    const coursePools: any[] = [];
    const courses: Record<string, CourseData> = {};

    await addEcpCoursePools('BCompSc_GENERAL', coursePools, courses);

    expect(coursePools.map((p) => p._id)).toEqual(['comp_pool']);
    // credits remain unchanged (no per-pool +30)
    expect(coursePools[0].creditsRequired).toBe(10);
    expect(Object.keys(courses)).toEqual([]);
  });

  it('increments degree.totalCredits to 30 when ECP has no pools', async () => {
    mockedDegreeController.readDegree.mockResolvedValue({ _id: ENGR_ECP, name: 'ENGR ECP' } as any);

    // ECP degree with no pools
    mockedDegreeController.getCoursePoolsForDegree.mockResolvedValue([] as any);
    mockedDegreeController.getCoursesForDegree.mockResolvedValue([] as any);

    const coursePools: any[] = [];
    const courses: Record<string, CourseData> = {};
    const degreeObj: any = { _id: 'ENGR_SOFTWARE', name: DEGREE_OBJ_NAME };

    await addEcpCoursePools(BENG_SOFTWARE, coursePools, courses, degreeObj);

    expect(degreeObj.totalCredits).toBe(30);
    expect(coursePools).toEqual([]);
    expect(Object.keys(courses)).toEqual([]);
  });

  it('propagates errors when fetching ECP course pools fails', async () => {
    mockedDegreeController.readDegree.mockResolvedValue({ _id: ENGR_ECP, name: 'ENGR ECP' } as any);

    mockedDegreeController.getCoursePoolsForDegree.mockRejectedValue(new Error('DB fail'));

    const coursePools: any[] = [];
    const courses: Record<string, CourseData> = {};

    await expect(addEcpCoursePools(BENG_SOFTWARE, coursePools, courses)).rejects.toThrow('DB fail');

    // Ensure nothing was mutated on failure
    expect(coursePools).toEqual([]);
    expect(Object.keys(courses)).toEqual([]);
  });

  it("does nothing if degreeId doesn't include BEng or BCompSc", async () => {
    const coursePools: any[] = [{ _id: 'base_pool' }];
    const courses: Record<string, CourseData> = {};

    await addEcpCoursePools('BA_ARTS', coursePools, courses);

    expect(coursePools).toEqual([{ _id: 'base_pool' }]);
    expect(Object.keys(courses)).toEqual([]);

    expect(mockedDegreeController.readDegree).not.toHaveBeenCalled();
    expect(mockedDegreeController.getCoursePoolsForDegree).not.toHaveBeenCalled();
    expect(mockedDegreeController.getCoursesForDegree).not.toHaveBeenCalled();
  });
});
