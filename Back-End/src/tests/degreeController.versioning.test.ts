jest.mock('@models', () => ({
  Degree: {},
  CoursePool: { find: jest.fn() },
  Course: { find: jest.fn() },
}));

jest.mock('@services/catalogVersionService', () => ({
  resolveEntityVersion: jest.fn(),
  resolveEntityVersions: jest.fn(),
}));

import { DegreeController } from '../controllers/degreeController';
import { Course, CoursePool } from '@models';
import { resolveEntityVersion, resolveEntityVersions } from '@services/catalogVersionService';

describe('DegreeController versioning and logic branches', () => {
  let controller: DegreeController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DegreeController();
  });

  it('propagates errors from getCoursesForDegree', async () => {
    controller.getCoursePoolsForDegree = jest.fn().mockRejectedValue(new Error('unexpected failure'));

    await expect(controller.getCoursesForDegree('COMP')).rejects.toThrow('unexpected failure');
  });

  it('translates not-found errors correctly', async () => {
    controller.getCoursePoolsForDegree = jest
      .fn()
      .mockRejectedValue(new Error('Degree not found'));

    await expect(controller.getCoursesForDegree('COMP')).rejects.toThrow('Degree not found');
  });

 it('updateDegree returns mapped result', async () => {
  // Mock updateById to return the updated document directly
  controller.updateById = jest.fn().mockResolvedValue({
    _id: 'COMP',
    name: 'CompSci',
    totalCredits: 120,
    degreeType: 'BSc',
    coursePools: [],
    ecpDegreeId: undefined,
  });

  const updated = await controller.updateDegree('COMP', { name: 'CompSci' });

  expect(updated).toEqual({
    _id: 'COMP',
    name: 'CompSci',
    totalCredits: 120,
    degreeType: 'BSc',
    coursePools: [],
    ecpDegreeId: undefined,
  });
});

it('readDegree resolves versions', async () => {
  // Mock findById to return the raw document
  controller.findById = jest.fn().mockResolvedValue({
    _id: 'COMP',
    name: 'CompSci',
    totalCredits: 120,
    degreeType: 'BSc',
    ecpDegreeId: '',
    baseAcademicYear: '2026-2027',
    coursePools: [],
  });

  (resolveEntityVersion as jest.Mock).mockResolvedValue({
    entity: {
      _id: 'COMP',
      name: 'CompSci',
      totalCredits: 120,
      degreeType: 'BSc',
      coursePools: [],
      ecpDegreeId: '',
      baseAcademicYear: '2026-2027',
    },
  });

  const degree = await controller.readDegree('COMP', '2026-2027');

  expect(degree).toEqual({
    _id: 'COMP',
    name: 'CompSci',
    totalCredits: 120,
    degreeType: 'BSc',
    coursePools: [],
    ecpDegreeId: '',
    baseAcademicYear: '2026-2027',
  });
});

  it('getCoursePoolsForDegree resolves pools', async () => {
    controller.readDegree = jest.fn().mockResolvedValue({
      _id: 'COMP',
      coursePools: ['POOL1'],
    });

    (CoursePool.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        { _id: 'POOL1', name: 'Core', creditsRequired: 3, rules: [], baseAcademicYear: '2026-2027' },
      ]),
    });
    (resolveEntityVersions as jest.Mock).mockResolvedValue([
      { _id: 'POOL1', name: 'Core', creditsRequired: 3, rules: [], baseAcademicYear: '2026-2027' },
    ]);

    const pools = await controller.getCoursePoolsForDegree('COMP');
    expect(pools).toEqual([
      {
        _id: 'POOL1',
        name: 'Core',
        creditsRequired: 3,
        courses: [],
        rules: [],
        baseAcademicYear: '2026-2027',
      },
    ]);
  });

  it('getCoursesForDegree fetches courses correctly', async () => {
    controller.getCoursePoolsForDegree = jest.fn().mockResolvedValue([
      { _id: 'POOL1', courses: ['COMP248'] },
    ]);
    (Course.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 'COMP248', title: 'Intro', credits: 3 }]),
    });
    (resolveEntityVersions as jest.Mock).mockResolvedValue([{ _id: 'COMP248', title: 'Intro', credits: 3 }]);

    const courses = await controller.getCoursesForDegree('COMP', '2026-2027');
    expect(courses).toEqual([{ _id: 'COMP248', title: 'Intro', credits: 3 }]);
  });

  it('getCreditsForDegree returns totalCredits', async () => {
    controller.readDegree = jest.fn().mockResolvedValue({ totalCredits: 120 });
    const credits = await controller.getCreditsForDegree('COMP');
    expect(credits).toBe(120);
  });
});