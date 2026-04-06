
jest.mock('@services/catalogVersionService', () => ({
  resolveEntityVersion: jest.fn(),
  resolveEntityVersions: jest.fn(),
}));

import { resolveEntityVersion, resolveEntityVersions } from '@services/catalogVersionService';
import { CoursePoolController } from '../controllers/coursepoolController';
import { NotFoundError } from '@utils/errors';

describe('CoursePoolController - versioning', () => {
  let controller: CoursePoolController;
  const poolId = 'POOL1';
  const updatedPoolName = 'Updated Pool';

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CoursePoolController();
  });

  it('resolves and normalizes all course pools', async () => {
    jest.spyOn(controller, 'findAll').mockResolvedValue([
      {
        _id: poolId,
        name: 'Pool 1',
        creditsRequired: 3,
        courses: ['COMP 248'],
        baseAcademicYear: '2025-2026',
      },
    ]);

    (resolveEntityVersions as jest.Mock).mockResolvedValue([
      {
        _id: poolId,
        name: 'Pool 1',
        creditsRequired: 3,
        courses: ['COMP 248'],
        rules: [],
        baseAcademicYear: '2026-2027',
      },
    ]);

    const result = await controller.getAllCoursePools('2026-2027');

    expect(result).toEqual([
      {
        _id: poolId,
        name: 'Pool 1',
        creditsRequired: 3,
        courses: ['COMP 248'],
        rules: [],
        baseAcademicYear: '2026-2027',
      },
    ]);
    expect(resolveEntityVersions).toHaveBeenCalled();
  });

  it('normalizes missing course arrays on successful responses', async () => {
    jest.spyOn(controller, 'findAll').mockResolvedValue([
      {
        _id: poolId,
        name: 'Pool 1',
        creditsRequired: 3,
        baseAcademicYear: '2025-2026',
      },
    ]);

    (resolveEntityVersions as jest.Mock).mockResolvedValue([
      {
        _id: poolId,
        name: 'Pool 1',
        creditsRequired: 3,
        courses: [],
        rules: [],
        baseAcademicYear: '2026-2027',
      },
    ]);

    const result = await controller.getAllCoursePools('2026-2027');
    expect(result).toEqual([
      {
        _id: poolId,
        name: 'Pool 1',
        creditsRequired: 3,
        courses: [],
        rules: [],
        baseAcademicYear: '2026-2027',
      },
    ]);
  });

  it('resolves a single course pool for an academic year', async () => {
    jest.spyOn(controller, 'findById').mockResolvedValue({
      _id: poolId,
      name: 'Pool 1',
      creditsRequired: 3,
      courses: ['COMP 248'],
      baseAcademicYear: '2025-2026',
    } as any);

    (resolveEntityVersion as jest.Mock).mockResolvedValue({
      entity: {
        _id: poolId,
        name: updatedPoolName,
        creditsRequired: 6,
        courses: ['COMP 248', 'COMP 249'],
        rules: [],
        baseAcademicYear: '2026-2027',
      },
    });

    const result = await controller.getCoursePool(poolId, '2026-2027');

    expect(result).toEqual({
      _id: poolId,
      name: updatedPoolName,
      creditsRequired: 6,
      courses: ['COMP 248', 'COMP 249'],
      rules: [],
      baseAcademicYear: '2026-2027',
    });

    expect(resolveEntityVersion).toHaveBeenCalledWith({
      entityType: 'CoursePool',
      entityId: poolId,
      baseEntity: {
        _id: poolId,
        name: 'Pool 1',
        creditsRequired: 3,
        courses: ['COMP 248'],
        rules: [],
        baseAcademicYear: '2025-2026',
      },
      academicYear: '2026-2027',
    });
  });

  it('throws NotFoundError when pool is missing', async () => {
    jest.spyOn(controller, 'findById').mockImplementation(() => {
      throw new NotFoundError('CoursePool not found');
    });

    await expect(controller.getCoursePool(poolId)).rejects.toThrow(NotFoundError);
  });

  it('handles missing course/rule arrays in single course pool', async () => {
    jest.spyOn(controller, 'findById').mockResolvedValue({
      _id: poolId,
      name: 'Pool 1',
      creditsRequired: 3,
      baseAcademicYear: '2025-2026',
    } as any);

    (resolveEntityVersion as jest.Mock).mockResolvedValue({
      entity: {
        _id: poolId,
        name: updatedPoolName,
        creditsRequired: 6,
        courses: undefined,
        rules: undefined,
        baseAcademicYear: '2026-2027',
      },
    });

    const result = await controller.getCoursePool(poolId, '2026-2027');

    expect(result).toEqual({
      _id: poolId,
      name: updatedPoolName,
      creditsRequired: 6,
      courses: [],
      rules: [],
      baseAcademicYear: '2026-2027',
    });
  });
});