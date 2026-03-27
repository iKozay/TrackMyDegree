jest.mock('@models', () => ({
  Course: { find: jest.fn() },
}));

jest.mock('@services/catalogVersionService', () => ({
  resolveEntityVersion: jest.fn(),
  resolveEntityVersions: jest.fn(),
}));

import { Course } from '@models';
import { resolveEntityVersion, resolveEntityVersions } from '@services/catalogVersionService';
import { CourseController } from '../controllers/courseController';

describe('CourseController versioning paths', () => {
  let controller: CourseController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CourseController();
  });

  it('returns an empty list when no course codes are requested', async () => {
    await expect(controller.getCoursesByCodes([])).resolves.toEqual([]);
  });

  it('resolves courses by codes for an academic year', async () => {
    (Course.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        { _id: 'COMP 248', title: 'Intro', description: '', credits: 3 },
      ]),
    });
    (resolveEntityVersions as jest.Mock).mockResolvedValue([
      { _id: 'COMP 248', title: 'Updated', description: '', credits: 3 },
    ]);

    await expect(
      controller.getCoursesByCodes(['COMP 248', 'COMP 248'], '2026-2027'),
    ).resolves.toEqual([
      { _id: 'COMP 248', title: 'Updated', description: '', credits: 3 },
    ]);
  });

  it('propagates getCoursesByCodes errors', async () => {
    (Course.find as jest.Mock).mockImplementation(() => {
      throw new Error('find failed');
    });

    await expect(controller.getCoursesByCodes(['COMP 248'])).rejects.toThrow(
      'find failed',
    );
  });

  it('returns an empty array when course codes cannot be loaded', async () => {
    controller.findAll = jest.fn().mockResolvedValue({
      success: false,
      data: null,
    });

    await expect(controller.getAllCourseCodes()).resolves.toEqual([]);
  });

  it('uses default error messages in failure branches and returns fallback values', async () => {
    const handleErrorSpy = jest
      .spyOn(controller as any, 'handleError')
      .mockImplementation(() => undefined as never);

    controller.bulkWrite = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });
    await expect(
      controller.bulkCreateCourses([{ _id: 'COMP 248' } as any]),
    ).resolves.toBeUndefined();
    expect(handleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to create courses' }),
      'bulkCreateCourse',
    );

    controller.updateById = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });
    await expect(
      controller.updateCourse('COMP 248', { title: 'Updated' }),
    ).resolves.toBeNull();
    expect(handleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to update course' }),
      'updateCourse',
    );

    controller.deleteById = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });
    await expect(controller.deleteCourse('COMP 248')).resolves.toBeUndefined();
    expect(handleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to delete course' }),
      'deleteCourse',
    );
  });

  it('propagates getAllCourseCodes errors', async () => {
    controller.findAll = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(controller.getAllCourseCodes()).rejects.toThrow('boom');
  });

  it('resolves a single course by code', async () => {
    controller.findById = jest.fn().mockResolvedValue({
      success: true,
      data: { _id: 'COMP 248', title: 'Intro', description: '', credits: 3 },
    });
    (resolveEntityVersion as jest.Mock).mockResolvedValue({
      entity: { _id: 'COMP 248', title: 'Updated', description: '', credits: 3 },
    });

    await expect(
      controller.getCourseByCode('COMP 248', '2026-2027'),
    ).resolves.toEqual({
      _id: 'COMP 248',
      title: 'Updated',
      description: '',
      credits: 3,
    });
  });

  it('maps optional filters when loading all courses and resolves by pool', async () => {
    controller.findAll = jest.fn().mockResolvedValue({
      success: true,
      data: [{ _id: 'COMP 248', title: 'Intro', description: '', credits: 3 }],
    });
    (resolveEntityVersions as jest.Mock).mockResolvedValue([
      { _id: 'COMP 248', title: 'Intro', description: '', credits: 3 },
    ]);

    await expect(
      controller.getAllCourses({
        pool: 'Fall',
        search: 'Intro',
        page: 2,
        limit: 10,
        sort: 'credits',
        academicYear: '2026-2027',
      }),
    ).resolves.toEqual([
      { _id: 'COMP 248', title: 'Intro', description: '', credits: 3 },
    ]);
    expect(controller.findAll).toHaveBeenCalledWith(
      { offeredIn: 'Fall' },
      {
        page: 2,
        limit: 10,
        sort: { credits: 1 },
        search: 'Intro',
        fields: ['title', 'description', '_id'],
      },
    );

    controller.findAll = jest.fn().mockResolvedValue({
      success: true,
      data: [{ _id: 'COMP 248', title: 'Intro', description: '', credits: 3 }],
    });
    await expect(controller.getCoursesByPool('Fall', '2026-2027')).resolves.toEqual([
      { _id: 'COMP 248', title: 'Intro', description: '', credits: 3 },
    ]);
  });

  it('uses the default getCoursesByPool error message when none is provided', async () => {
    const handleErrorSpy = jest
      .spyOn(controller as any, 'handleError')
      .mockImplementation(() => undefined as never);

    controller.findAll = jest.fn().mockResolvedValue({
      success: false,
      error: null,
    });

    await expect(controller.getCoursesByPool('Fall')).resolves.toBeUndefined();
    expect(handleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to fetch courses' }),
      'getCoursesByPool',
    );
  });
});
