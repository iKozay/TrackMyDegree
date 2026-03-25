jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

jest.mock('@services/catalogVersionService', () => ({
  resolveEntityVersion: jest.fn(),
  resolveEntityVersions: jest.fn(),
}));

import * as Sentry from '@sentry/node';
import { resolveEntityVersion, resolveEntityVersions } from '@services/catalogVersionService';
import { CoursePoolController } from '../controllers/coursepoolController';

describe('CoursePoolController', () => {
  let controller: CoursePoolController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CoursePoolController();
  });

  it('resolves and normalizes all course pools', async () => {
    controller.findAll = jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: 'POOL1',
          name: 'Pool 1',
          creditsRequired: 3,
          courses: ['COMP 248'],
          baseAcademicYear: '2025-2026',
        },
      ],
    });
    (resolveEntityVersions as jest.Mock).mockResolvedValue([
      {
        _id: 'POOL1',
        name: 'Pool 1',
        creditsRequired: 3,
        courses: ['COMP 248'],
        baseAcademicYear: '2026-2027',
      },
    ]);

    await expect(controller.getAllCoursePools('2026-2027')).resolves.toEqual([
      {
        _id: 'POOL1',
        name: 'Pool 1',
        creditsRequired: 3,
        courses: ['COMP 248'],
        baseAcademicYear: '2026-2027',
      },
    ]);
  });

  it('normalizes missing course arrays on successful responses', async () => {
    controller.findAll = jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          _id: 'POOL1',
          name: 'Pool 1',
          creditsRequired: 3,
          baseAcademicYear: '2025-2026',
        },
      ],
    });
    (resolveEntityVersions as jest.Mock).mockResolvedValue([
      {
        _id: 'POOL1',
        name: 'Pool 1',
        creditsRequired: 3,
        baseAcademicYear: '2026-2027',
      },
    ]);

    await expect(controller.getAllCoursePools('2026-2027')).resolves.toEqual([
      {
        _id: 'POOL1',
        name: 'Pool 1',
        creditsRequired: 3,
        baseAcademicYear: '2026-2027',
      },
    ]);

    controller.findById = jest.fn().mockResolvedValue({
      success: true,
      data: {
        _id: 'POOL1',
        name: 'Pool 1',
        creditsRequired: 3,
        baseAcademicYear: '2025-2026',
      },
    });
    (resolveEntityVersion as jest.Mock).mockResolvedValue({
      entity: {
        _id: 'POOL1',
        name: 'Updated Pool',
        creditsRequired: 6,
        baseAcademicYear: '2026-2027',
      },
    });

    await expect(controller.getCoursePool('POOL1', '2026-2027')).resolves.toEqual({
      _id: 'POOL1',
      name: 'Updated Pool',
      creditsRequired: 6,
      courses: [],
      baseAcademicYear: '2026-2027',
    });
  });

  it('captures and swallows getAllCoursePools errors', async () => {
    controller.findAll = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(controller.getAllCoursePools()).resolves.toEqual([]);
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('resolves a single course pool for an academic year', async () => {
    controller.findById = jest.fn().mockResolvedValue({
      success: true,
      data: {
        _id: 'POOL1',
        name: 'Pool 1',
        creditsRequired: 3,
        courses: ['COMP 248'],
        baseAcademicYear: '2025-2026',
      },
    });
    (resolveEntityVersion as jest.Mock).mockResolvedValue({
      entity: {
        _id: 'POOL1',
        name: 'Updated Pool',
        creditsRequired: 6,
        courses: ['COMP 248', 'COMP 249'],
        baseAcademicYear: '2026-2027',
      },
    });

    await expect(controller.getCoursePool('POOL1', '2026-2027')).resolves.toEqual({
      _id: 'POOL1',
      name: 'Updated Pool',
      creditsRequired: 6,
      courses: ['COMP 248', 'COMP 249'],
      baseAcademicYear: '2026-2027',
    });
  });

  it('captures and swallows getCoursePool errors', async () => {
    controller.findById = jest.fn().mockResolvedValue({
      success: false,
      error: 'not found',
    });

    await expect(controller.getCoursePool('POOL1')).resolves.toBeUndefined();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('uses the default not-found message when a pool lookup fails without an error', async () => {
    controller.findById = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });

    await expect(controller.getCoursePool('POOL1')).resolves.toBeUndefined();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('returns fallback values for write failures after handleError', async () => {
    const handleErrorSpy = jest
      .spyOn(controller as any, 'handleError')
      .mockImplementation(() => undefined as never);

    controller.bulkWrite = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });
    await expect(
      controller.bulkCreateCoursePools([{ _id: 'POOL1' } as any]),
    ).resolves.toBe(false);
    expect(handleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to create course pools' }),
      'bulkCreateCoursePool',
    );

    controller.findById = jest.fn().mockResolvedValue({
      success: true,
      data: { _id: 'POOL1' },
    });
    controller.updateById = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });
    await expect(
      controller.updateCoursePool('POOL1', { name: 'Updated' }),
    ).resolves.toBeNull();
    expect(handleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to update course pool' }),
      'updateCoursePool',
    );

    controller.deleteById = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });
    await expect(controller.deleteCoursePool('POOL1')).resolves.toBe(false);
    expect(handleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to delete course pool' }),
      'deleteCoursePool',
    );

    controller.findById = jest.fn().mockResolvedValue({
      success: true,
      data: { _id: 'POOL1', name: 'Pool 1', creditsRequired: 3 },
    });
    controller.updateById = jest.fn().mockResolvedValue({
      success: true,
      data: { _id: 'POOL1', name: 'Pool 1', creditsRequired: 3 },
    });

    await expect(
      controller.updateCoursePool('POOL1', { name: 'Updated' }),
    ).resolves.toEqual({
      _id: 'POOL1',
      name: 'Pool 1',
      creditsRequired: 3,
      courses: [],
    });
  });
});
