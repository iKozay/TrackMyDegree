const { CoursePoolController } = require('@controllers/coursepoolController');
const { CoursePool } = require('@models');
const { NotFoundError } = require('@utils/errors');
const { resolveEntityVersion, resolveEntityVersions } = require('@services/catalogVersionService');

jest.mock('@models', () => ({
  CoursePool: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOneAndDelete: jest.fn(),
    deleteMany: jest.fn(),
    exists: jest.fn(),
    bulkWrite: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.mock('@services/catalogVersionService', () => ({
  resolveEntityVersion: jest.fn(),
  resolveEntityVersions: jest.fn(),
}));

describe('CoursePoolController', () => {
  let controller;

  beforeEach(() => {
    controller = new CoursePoolController();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with CoursePool model', () => {
      expect(controller.model).toBe(CoursePool);
      expect(controller.modelName).toBe('CoursePool');
    });
  });

  describe('bulkCreateCoursePools', () => {
    it('should call bulkWrite and return true', async () => {
  const data = [{ _id: '1', name: 'Pool 1' }];
  CoursePool.bulkWrite.mockResolvedValue(undefined);

  const result = await controller.bulkCreateCoursePools(data);

  const expectedOperations = [
    {
      updateOne: {
        filter: { _id: '1' },
        update: { $set: { _id: '1', name: 'Pool 1' } },
        upsert: true,
      },
    },
  ];

  expect(CoursePool.bulkWrite).toHaveBeenCalledWith(expectedOperations, { ordered: false });
  expect(result).toBe(true);
});
});

  describe('updateCoursePool', () => {
    it('should update course pool and return mapped result', async () => {
  const mockDoc = { _id: '1', name: 'Pool 1', creditsRequired: 10, courses: ['A'], rules: ['R'] };

  jest.spyOn(controller, 'updateById').mockResolvedValue(mockDoc);

  const result = await controller.updateCoursePool('1', { name: 'Pool 1 Updated' });

  expect(result).toEqual({
    _id: '1',
    name: 'Pool 1',
    creditsRequired: 10,
    courses: ['A'],
    rules: ['R'],
  });
});
  });

  describe('getAllCoursePools', () => {
    it('should return resolved entity versions', async () => {
      const docs = [
        { _id: '1', name: 'Pool1', creditsRequired: 10, courses: ['A'], rules: ['R'], baseAcademicYear: '2025' },
      ];
      jest.spyOn(controller, 'findAll').mockResolvedValue(docs );
      resolveEntityVersions.mockReturnValue(docs);

      const result = await controller.getAllCoursePools('2025');

      expect(controller.findAll).toHaveBeenCalled();
      expect(resolveEntityVersions).toHaveBeenCalledWith(
        'CoursePool',
        docs.map((cp) => ({
          _id: cp._id,
          name: cp.name,
          creditsRequired: cp.creditsRequired,
          courses: cp.courses,
          rules: cp.rules,
          baseAcademicYear: cp.baseAcademicYear,
        })),
        '2025'
      );
      expect(result).toEqual(docs);
    });
  });

  describe('getCoursePool', () => {
    it('should return resolved course pool', async () => {
      const doc = { _id: '1', name: 'Pool1', creditsRequired: 10, courses: ['A'], rules: ['R'], baseAcademicYear: '2025' };
      jest.spyOn(controller, 'findById').mockResolvedValue(doc);
      resolveEntityVersion.mockResolvedValue({ entity: doc });

      const result = await controller.getCoursePool('1', '2025');

      expect(controller.findById).toHaveBeenCalledWith('1');
      expect(resolveEntityVersion).toHaveBeenCalledWith({
        entityType: 'CoursePool',
        entityId: '1',
        baseEntity: {
          _id: doc._id,
          name: doc.name,
          creditsRequired: doc.creditsRequired,
          courses: doc.courses,
          rules: doc.rules,
          baseAcademicYear: doc.baseAcademicYear,
        },
        academicYear: '2025',
      });
      expect(result).toEqual({
        _id: doc._id,
        name: doc.name,
        creditsRequired: doc.creditsRequired,
        courses: doc.courses,
        rules: doc.rules,
        baseAcademicYear: doc.baseAcademicYear,
      });
    });
  });

  describe('deleteCoursePool', () => {
    it('should call deleteById and return success message', async () => {
      jest.spyOn(controller, 'deleteById').mockResolvedValue('Deleted successfully');

      const result = await controller.deleteCoursePool('1');

      expect(controller.deleteById).toHaveBeenCalledWith('1');
      expect(result).toBe('Deleted successfully');
    });
  });

  // Additional BaseMongoController coverage
  describe('BaseMongoController methods', () => {
    it('should throw NotFoundError when document does not exist', async () => {
      CoursePool.findById.mockReturnValue({ lean: () => ({ exec: jest.fn().mockResolvedValue(null) }) });

      await expect(controller.findById('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should sanitize updates correctly', async () => {
      const unsafeUpdate = { name: 'NewName', $set: { x: 1 }, constructor: 'bad' };
      const sanitized = controller['sanitizeUpdate'](unsafeUpdate);
      expect(sanitized).toEqual({ name: 'NewName' });
    });
  });
});