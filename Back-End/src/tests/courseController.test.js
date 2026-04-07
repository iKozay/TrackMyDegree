// __tests__/courseController.test.ts
const { CourseController } = require('../controllers/courseController');
const { Course } = require('@models');
const { resolveEntityVersion, resolveEntityVersions } = require('@services/catalogVersionService');

jest.mock('@models', () => ({
  Course: {
    find: jest.fn(),
  },
}));

jest.mock('@services/catalogVersionService', () => ({
  resolveEntityVersion: jest.fn(),
  resolveEntityVersions: jest.fn(),
}));

describe('CourseController', () => {
  let controller;

  beforeEach(() => {
    controller = new CourseController();
    jest.clearAllMocks();
  });

  describe('bulkCreateCourses', () => {
    it('calls bulkWrite and returns true', async () => {
      const spy = jest.spyOn(controller, 'bulkWrite').mockResolvedValue(undefined);

      const result = await controller.bulkCreateCourses([{ _id: 'C1' }]);

      expect(spy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('updateCourse', () => {
    it('calls updateById', async () => {
      const spy = jest.spyOn(controller, 'updateById').mockResolvedValue({ _id: 'C1' });

      const result = await controller.updateCourse('C1', { title: 'New' });

      expect(spy).toHaveBeenCalledWith('C1', { title: 'New' });
      expect(result).toEqual({ _id: 'C1' });
    });
  });

  describe('getAllCourses', () => {
    it('applies filter and resolves versions', async () => {
      jest.spyOn(controller, 'findAll').mockResolvedValue([{ _id: 'C1' }]);

      resolveEntityVersions.mockResolvedValue(['resolved']);

      const result = await controller.getAllCourses({
        pool: 'SCI',
        search: 'math',
        page: 1,
        limit: 10,
        sort: 'title',
        academicYear: '2024',
      });

      expect(controller.findAll).toHaveBeenCalledWith(
        { offeredIn: 'SCI' },
        expect.objectContaining({
          page: 1,
          limit: 10,
          search: 'math',
        }),
      );

      expect(resolveEntityVersions).toHaveBeenCalledWith(
        'Course',
        [{ _id: 'C1' }],
        '2024',
      );

      expect(result).toEqual(['resolved']);
    });

    it('handles empty result', async () => {
      jest.spyOn(controller, 'findAll').mockResolvedValue(null);
      resolveEntityVersions.mockResolvedValue([]);

      const result = await controller.getAllCourses();

      expect(result).toEqual([]);
    });
  });

  describe('getCoursesByCodes', () => {
    it('returns empty if no codes', async () => {
      const result = await controller.getCoursesByCodes([]);
      expect(result).toEqual([]);
    });

    it('fetches and resolves courses', async () => {
      Course.find.mockReturnValue({
        lean: () => ({
          exec: () => Promise.resolve([{ _id: 'C1' }]),
        }),
      });

      resolveEntityVersions.mockResolvedValue(['resolved']);

      const result = await controller.getCoursesByCodes(['C1', 'C1'], '2024');

      expect(Course.find).toHaveBeenCalled();
      expect(resolveEntityVersions).toHaveBeenCalled();
      expect(result).toEqual(['resolved']);
    });
  });

  describe('getAllCourseCodes', () => {
    it('returns course IDs', async () => {
      jest.spyOn(controller, 'findAll').mockResolvedValue([{ _id: 'C1' }]);

      const result = await controller.getAllCourseCodes();

      expect(result).toEqual(['C1']);
    });

    it('returns empty if no result', async () => {
      jest.spyOn(controller, 'findAll').mockResolvedValue(null);

      const result = await controller.getAllCourseCodes();

      expect(result).toEqual([]);
    });
  });

  describe('getCourseByCode', () => {
    it('resolves a single course', async () => {
      jest.spyOn(controller, 'findById').mockResolvedValue({ data: { _id: 'C1' } });

      resolveEntityVersion.mockResolvedValue({
        entity: { _id: 'C1', resolved: true },
      });

      const result = await controller.getCourseByCode('C1', '2024');

      expect(resolveEntityVersion).toHaveBeenCalled();
      expect(result).toEqual({ _id: 'C1', resolved: true });
    });
  });

  describe('getCoursesByPool', () => {
    it('fetches and resolves courses by pool', async () => {
      jest.spyOn(controller, 'findAll').mockResolvedValue([{ _id: 'C1' }]);

      resolveEntityVersions.mockResolvedValue(['resolved']);

      const result = await controller.getCoursesByPool('SCI', '2024');

      expect(controller.findAll).toHaveBeenCalledWith({ offeredIn: 'SCI' });
      expect(result).toEqual(['resolved']);
    });
  });

  describe('deleteCourse', () => {
    it('calls deleteById', async () => {
      const spy = jest.spyOn(controller, 'deleteById').mockResolvedValue('deleted');

      const result = await controller.deleteCourse('C1');

      expect(spy).toHaveBeenCalledWith('C1');
      expect(result).toBe('deleted');
    });
  });
});