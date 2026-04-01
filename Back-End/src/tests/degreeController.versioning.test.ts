jest.mock('@models', () => ({
  Degree: {},
  CoursePool: { find: jest.fn() },
  Course: { find: jest.fn() },
}));

jest.mock('@services/catalogVersionService', () => ({
  resolveEntityVersion: jest.fn(),
  resolveEntityVersions: jest.fn(),
}));

import { Course, CoursePool } from '@models';
import {
  resolveEntityVersion,
  resolveEntityVersions,
} from '@services/catalogVersionService';
import { DegreeController } from '../controllers/degreeController';

describe('DegreeController versioning branches', () => {
  let controller: DegreeController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DegreeController();
  });

  it('propagates unexpected getCoursesForDegree errors', async () => {
    controller.getCoursePoolsForDegree = jest
      .fn()
      .mockRejectedValue(new Error('unexpected failure'));

    await expect(controller.getCoursesForDegree('COMP')).rejects.toThrow(
      'unexpected failure',
    );
  });

  it('translates missing-degree errors in getCoursesForDegree', async () => {
    controller.getCoursePoolsForDegree = jest
      .fn()
      .mockRejectedValue(new Error('Degree with this id does not exist.'));

    await expect(controller.getCoursesForDegree('COMP')).rejects.toThrow(
      'Degree not found',
    );
  });

  it('throws when updateDegree receives an unsuccessful update result', async () => {
    controller.updateById = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });

    await expect(
      controller.updateDegree('COMP', { name: 'Updated' }),
    ).rejects.toThrow('Failed to update degree');
  });

  it('uses fallback defaults for optional arrays and error messages', async () => {
    controller.findById = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });
    controller.create = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });

    await expect(
      controller.createDegree({ _id: 'COMP', name: 'CompSci' } as any),
    ).rejects.toThrow('Failed to create degree');

    controller.updateById = jest.fn().mockResolvedValue({
      success: true,
      data: {
        _id: 'COMP',
        name: 'CompSci',
        totalCredits: 120,
        degreeType: 'BSc',
      },
    });
    await expect(
      controller.updateDegree('COMP', { name: 'CompSci' }),
    ).resolves.toEqual({
      _id: 'COMP',
      name: 'CompSci',
      totalCredits: 120,
      degreeType: 'BSc',
      coursePools: [],
      ecpDegreeId: undefined,
    });

    controller.deleteById = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });
    await expect(controller.deleteDegree('COMP')).rejects.toThrow(
      'Failed to delete degree',
    );
  });

  it('resolves read paths and handles missing optional course pools', async () => {
    controller.findById = jest.fn().mockResolvedValue({
      success: true,
      data: {
        _id: 'COMP',
        name: 'CompSci',
        totalCredits: 120,
        degreeType: 'BSc',
        ecpDegreeId: '',
      },
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

    await expect(controller.readDegree('COMP', '2026-2027')).resolves.toEqual({
      _id: 'COMP',
      name: 'CompSci',
      totalCredits: 120,
      degreeType: 'BSc',
      coursePools: [],
      ecpDegreeId: '',
      baseAcademicYear: '2026-2027',
    });

    (CoursePool.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });
    (resolveEntityVersions as jest.Mock).mockResolvedValue([]);

    await expect(
      controller.getCoursePoolsForDegree('COMP', '2026-2027'),
    ).resolves.toEqual([]);
    expect(CoursePool.find).toHaveBeenCalledWith({ _id: { $in: [] } });
  });

  it('resolves course lists, credits, and all degrees for an academic year', async () => {
    controller.getCoursePoolsForDegree = jest.fn().mockResolvedValue([
      { _id: 'POOL1', name: 'Core', creditsRequired: 3, courses: ['COMP248'] },
      { _id: 'POOL2', name: 'Elective', creditsRequired: 3 },
    ]);
    (Course.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        { _id: 'COMP248', title: 'Intro', description: '', credits: 3 },
      ]),
    });
    (resolveEntityVersions as jest.Mock).mockResolvedValue([
      { _id: 'COMP248', title: 'Intro', description: '', credits: 3 },
    ]);

    await expect(
      controller.getCoursesForDegree('COMP', '2026-2027'),
    ).resolves.toEqual([
      { _id: 'COMP248', title: 'Intro', description: '', credits: 3 },
    ]);

    controller.readDegree = jest.fn().mockResolvedValue({
      _id: 'COMP',
      name: 'CompSci',
      totalCredits: 120,
      coursePools: [],
    });
    await expect(controller.getCreditsForDegree('COMP')).resolves.toBe(120);

    controller.findAll = jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: 'COMP',
          name: 'CompSci',
          totalCredits: 120,
          degreeType: 'BSc',
          ecpDegreeId: '',
          baseAcademicYear: '2025-2026',
        },
      ],
    });
    (resolveEntityVersions as jest.Mock).mockResolvedValue([
      {
        _id: 'COMP',
        name: 'CompSci',
        totalCredits: 120,
        degreeType: 'BSc',
        coursePools: [],
        ecpDegreeId: '',
        baseAcademicYear: '2026-2027',
      },
    ]);

    await expect(controller.readAllDegrees('2026-2027')).resolves.toEqual([
      {
        _id: 'COMP',
        name: 'CompSci',
        totalCredits: 120,
        degreeType: 'BSc',
        coursePools: [],
        ecpDegreeId: '',
        baseAcademicYear: '2026-2027',
      },
    ]);
  });

  it('normalizes missing course pool arrays when loading pools for a degree', async () => {
    controller.readDegree = jest.fn().mockResolvedValue({
      _id: 'COMP',
      name: 'CompSci',
      totalCredits: 120,
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

    await expect(controller.getCoursePoolsForDegree('COMP')).resolves.toEqual([
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
});
