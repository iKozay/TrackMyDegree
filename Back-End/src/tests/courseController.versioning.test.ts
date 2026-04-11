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

  // --------------------------
  // getCoursesByCodes
  // --------------------------
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

    const result = await controller.getCoursesByCodes(['COMP 248', 'COMP 248'], '2026-2027');
    expect(result).toEqual([{ _id: 'COMP 248', title: 'Updated', description: '', credits: 3 }]);
  });

  it('propagates getCoursesByCodes errors', async () => {
    (Course.find as jest.Mock).mockImplementation(() => {
      throw new Error('find failed');
    });
    await expect(controller.getCoursesByCodes(['COMP 248'])).rejects.toThrow('find failed');
  });

  // --------------------------
  // getAllCourseCodes
  // --------------------------
  it('returns an empty array if findAll returns non-array', async () => {
    controller.findAll = jest.fn().mockResolvedValue(null);
    await expect(controller.getAllCourseCodes()).resolves.toEqual([]);
  });

  it('maps course IDs when findAll returns an array', async () => {
    controller.findAll = jest.fn().mockResolvedValue([{ _id: 'COMP 248' }, { _id: 'COMP 249' }]);
    const result = await controller.getAllCourseCodes();
    expect(result).toEqual(['COMP 248', 'COMP 249']);
  });

  it('propagates errors in getAllCourseCodes', async () => {
    controller.findAll = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(controller.getAllCourseCodes()).rejects.toThrow('boom');
  });

  // --------------------------
  // getCourseByCode
  // --------------------------
  it('resolves a single course by code', async () => {
    const baseCourse = { _id: 'COMP 248', title: 'Intro', description: '', credits: 3 };
    controller.findById = jest.fn().mockResolvedValue(baseCourse);

    (resolveEntityVersion as jest.Mock).mockResolvedValue({
      entity: { _id: 'COMP 248', title: 'Updated', description: '', credits: 3 },
    });

    const result = await controller.getCourseByCode('COMP 248', '2026-2027');
    expect(resolveEntityVersion).toHaveBeenCalledWith({
      entityType: 'Course',
      entityId: 'COMP 248',
      baseEntity: baseCourse,
      academicYear: '2026-2027',
    });
    expect(result).toEqual({ _id: 'COMP 248', title: 'Updated', description: '', credits: 3 });
  });

  // --------------------------
  // getAllCourses & getCoursesByPool
  // --------------------------
  it('maps filters and resolves courses for getAllCourses', async () => {
    controller.findAll = jest.fn().mockResolvedValue([{ _id: 'COMP 248', title: 'Intro', description: '', credits: 3 }]);
    (resolveEntityVersions as jest.Mock).mockResolvedValue([{ _id: 'COMP 248', title: 'Intro', description: '', credits: 3 }]);

    const result = await controller.getAllCourses({
      pool: 'Fall',
      search: 'Intro',
      page: 1,
      limit: 10,
      sort: 'credits',
      academicYear: '2026-2027',
    });

    expect(controller.findAll).toHaveBeenCalledWith(
      { offeredIn: 'Fall' },
      { page: 1, limit: 10, sort: { credits: 1 }, search: 'Intro', fields: ['title', 'description', '_id'] }
    );
    expect(result).toEqual([{ _id: 'COMP 248', title: 'Intro', description: '', credits: 3 }]);
  });

  it('resolves courses by pool', async () => {
    controller.findAll = jest.fn().mockResolvedValue([{ _id: 'COMP 248', title: 'Intro', description: '', credits: 3 }]);
    (resolveEntityVersions as jest.Mock).mockResolvedValue([{ _id: 'COMP 248', title: 'Intro', description: '', credits: 3 }]);

    const result = await controller.getCoursesByPool('Fall', '2026-2027');
    expect(result).toEqual([{ _id: 'COMP 248', title: 'Intro', description: '', credits: 3 }]);
    expect(controller.findAll).toHaveBeenCalledWith({ offeredIn: 'Fall' });
  });
});