const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { Course } = require('../dist/models/Course');
const requisiteController =
  require('../dist/controllers/requisiteController/requisiteController_mongoose').default;
describe('RequisiteController Mongoose', () => {
  let mongoServer;

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
    await Course.deleteMany({});
  });

  describe('createRequisite', () => {
    it('should trigger Sentry logging on database error', async () => {
      // Mock Course.findById to throw an error to trigger Sentry logging
      const originalFindById = Course.findById;
      Course.findById = jest
        .fn()
        .mockRejectedValue(new Error('Mock database error'));

      await expect(
        requisiteController.createRequisite('SOEN490', 'SOEN390', 'pre'),
      ).rejects.toThrow('Mock database error');

      Course.findById = originalFindById;
    });

    it('should trigger Sentry logging on update error', async () => {
      await Course.create([
        {
          _id: 'SOEN490',
          title: 'Capstone',
          credits: 4,
          description: 'Final project',
          prerequisites: [],
          corequisites: [],
        },
        {
          _id: 'SOEN390',
          title: 'Software Engineering',
          credits: 3,
          description: 'SE course',
          prerequisites: [],
          corequisites: [],
        },
      ]);

      const originalUpdate = Course.findByIdAndUpdate;
      Course.findByIdAndUpdate = jest
        .fn()
        .mockRejectedValue(new Error('Update error'));

      await expect(
        requisiteController.createRequisite('SOEN490', 'SOEN390', 'pre'),
      ).rejects.toThrow('Update error');

      Course.findByIdAndUpdate = originalUpdate;
    });
    it('should create a prerequisite successfully', async () => {
      await Course.create([
        {
          _id: 'SOEN490',
          title: 'Capstone',
          credits: 4,
          description: 'Final project',
          prerequisites: [],
          corequisites: [],
        },
        {
          _id: 'SOEN390',
          title: 'Software Engineering',
          credits: 3,
          description: 'SE course',
          prerequisites: [],
          corequisites: [],
        },
      ]);

      const result = await requisiteController.createRequisite(
        'SOEN490',
        'SOEN390',
        'pre',
      );

      expect(result).toBeDefined();
      expect(result.code1).toBe('SOEN490');
      expect(result.code2).toBe('SOEN390');
      expect(result.type).toBe('pre');

      const course = await Course.findById('SOEN490');
      expect(course.prerequisites).toContain('SOEN390');
    });

    it('should create a corequisite successfully', async () => {
      await Course.create([
        {
          _id: 'SOEN490',
          title: 'Capstone',
          credits: 4,
          description: 'Final project',
          prerequisites: [],
          corequisites: [],
        },
        {
          _id: 'SOEN390',
          title: 'Software Engineering',
          credits: 3,
          description: 'SE course',
          prerequisites: [],
          corequisites: [],
        },
      ]);

      const result = await requisiteController.createRequisite(
        'SOEN490',
        'SOEN390',
        'co',
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('co');

      const course = await Course.findById('SOEN490');
      expect(course.corequisites).toContain('SOEN390');
    });

    it('should throw error if course1 does not exist', async () => {
      await Course.create({
        _id: 'SOEN390',
        title: 'Software Engineering',
        credits: 3,
        description: 'SE course',
        prerequisites: [],
        corequisites: [],
      });

      await expect(
        requisiteController.createRequisite('NONEXISTENT', 'SOEN390', 'pre'),
      ).rejects.toThrow(
        "One or both courses ('NONEXISTENT', 'SOEN390') do not exist.",
      );
    });

    it('should throw error if course2 does not exist', async () => {
      await Course.create({
        _id: 'SOEN490',
        title: 'Capstone',
        credits: 4,
        description: 'Final project',
        prerequisites: [],
        corequisites: [],
      });

      await expect(
        requisiteController.createRequisite('SOEN490', 'NONEXISTENT', 'pre'),
      ).rejects.toThrow(
        "One or both courses ('SOEN490', 'NONEXISTENT') do not exist.",
      );
    });

    it('should throw error if requisite already exists', async () => {
      await Course.create([
        {
          _id: 'SOEN490',
          title: 'Capstone',
          credits: 4,
          description: 'Final project',
          prerequisites: ['SOEN390'],
          corequisites: [],
        },
        {
          _id: 'SOEN390',
          title: 'Software Engineering',
          credits: 3,
          description: 'SE course',
          prerequisites: [],
          corequisites: [],
        },
      ]);

      await expect(
        requisiteController.createRequisite('SOEN490', 'SOEN390', 'pre'),
      ).rejects.toThrow(
        'Requisite with this combination of courses already exists.',
      );
    });
  });

  describe('readRequisite', () => {
    it('should trigger Sentry logging in readRequisite', async () => {
      const originalFindById = Course.findById;
      Course.findById = jest.fn().mockRejectedValue(new Error('Read error'));

      await expect(
        requisiteController.readRequisite('SOEN490'),
      ).rejects.toThrow('Read error');

      Course.findById = originalFindById;
    });
    beforeEach(async () => {
      await Course.create([
        {
          _id: 'SOEN490',
          title: 'Capstone',
          credits: 4,
          description: 'Final project',
          prerequisites: ['SOEN390', 'SOEN287'],
          corequisites: ['SOEN491'],
        },
        {
          _id: 'SOEN390',
          title: 'Software Engineering',
          credits: 3,
          description: 'SE course',
          prerequisites: [],
          corequisites: [],
        },
        {
          _id: 'SOEN287',
          title: 'Web Programming',
          credits: 3,
          description: 'Web course',
          prerequisites: [],
          corequisites: [],
        },
        {
          _id: 'SOEN491',
          title: 'Capstone 2',
          credits: 4,
          description: 'Final project 2',
          prerequisites: [],
          corequisites: [],
        },
      ]);
    });

    it('should return all requisites for a course', async () => {
      const result = await requisiteController.readRequisite('SOEN490');

      expect(result).toHaveLength(3);
      expect(
        result.some((r) => r.code2 === 'SOEN390' && r.type === 'pre'),
      ).toBe(true);
      expect(
        result.some((r) => r.code2 === 'SOEN287' && r.type === 'pre'),
      ).toBe(true);
      expect(result.some((r) => r.code2 === 'SOEN491' && r.type === 'co')).toBe(
        true,
      );
    });

    it('should return specific requisite when code2 and type provided', async () => {
      const result = await requisiteController.readRequisite(
        'SOEN490',
        'SOEN390',
        'pre',
      );

      expect(result).toHaveLength(1);
      expect(result[0].code1).toBe('SOEN490');
      expect(result[0].code2).toBe('SOEN390');
      expect(result[0].type).toBe('pre');
    });

    it('should return empty array when specific requisite does not exist', async () => {
      const result = await requisiteController.readRequisite(
        'SOEN490',
        'NONEXISTENT',
        'pre',
      );

      expect(result).toHaveLength(0);
    });

    it('should throw error if course does not exist', async () => {
      await expect(
        requisiteController.readRequisite('NONEXISTENT'),
      ).rejects.toThrow("Course 'NONEXISTENT' does not exist.");
    });
  });

  describe('updateRequisite', () => {
    it('should trigger Sentry logging in updateRequisite', async () => {
      const originalFindById = Course.findById;
      Course.findById = jest.fn().mockRejectedValue(new Error('Update error'));

      await expect(
        requisiteController.updateRequisite('SOEN490', 'SOEN390', 'pre'),
      ).rejects.toThrow('Update error');

      Course.findById = originalFindById;
    });
    it('should update requisite successfully', async () => {
      await Course.create([
        {
          _id: 'SOEN490',
          title: 'Capstone',
          credits: 4,
          description: 'Final project',
          prerequisites: [],
          corequisites: [],
        },
        {
          _id: 'SOEN390',
          title: 'Software Engineering',
          credits: 3,
          description: 'SE course',
          prerequisites: [],
          corequisites: [],
        },
      ]);

      const result = await requisiteController.updateRequisite(
        'SOEN490',
        'SOEN390',
        'pre',
      );

      expect(result).toBeDefined();
      expect(result.code1).toBe('SOEN490');
      expect(result.code2).toBe('SOEN390');
      expect(result.type).toBe('pre');

      const course = await Course.findById('SOEN490');
      expect(course.prerequisites).toContain('SOEN390');
    });

    it('should throw error if course1 does not exist', async () => {
      await Course.create({
        _id: 'SOEN390',
        title: 'Software Engineering',
        credits: 3,
        description: 'SE course',
        prerequisites: [],
        corequisites: [],
      });

      await expect(
        requisiteController.updateRequisite('NONEXISTENT', 'SOEN390', 'pre'),
      ).rejects.toThrow(
        "One or both courses ('NONEXISTENT', 'SOEN390') do not exist.",
      );
    });

    it('should throw error if requisite already exists', async () => {
      await Course.create([
        {
          _id: 'SOEN490',
          title: 'Capstone',
          credits: 4,
          description: 'Final project',
          prerequisites: ['SOEN390'],
          corequisites: [],
        },
        {
          _id: 'SOEN390',
          title: 'Software Engineering',
          credits: 3,
          description: 'SE course',
          prerequisites: [],
          corequisites: [],
        },
      ]);

      await expect(
        requisiteController.updateRequisite('SOEN490', 'SOEN390', 'pre'),
      ).rejects.toThrow(
        'Requisite with this combination of courses already exists.',
      );
    });
  });

  describe('deleteRequisite', () => {
    it('should trigger Sentry logging in deleteRequisite', async () => {
      const originalFindById = Course.findById;
      Course.findById = jest.fn().mockRejectedValue(new Error('Delete error'));

      await expect(
        requisiteController.deleteRequisite('SOEN490', 'SOEN390', 'pre'),
      ).rejects.toThrow('Delete error');

      Course.findById = originalFindById;
    });
    beforeEach(async () => {
      await Course.create([
        {
          _id: 'SOEN490',
          title: 'Capstone',
          credits: 4,
          description: 'Final project',
          prerequisites: ['SOEN390'],
          corequisites: ['SOEN491'],
        },
        {
          _id: 'SOEN390',
          title: 'Software Engineering',
          credits: 3,
          description: 'SE course',
          prerequisites: [],
          corequisites: [],
        },
        {
          _id: 'SOEN491',
          title: 'Capstone 2',
          credits: 4,
          description: 'Final project 2',
          prerequisites: [],
          corequisites: [],
        },
      ]);
    });

    it('should delete prerequisite successfully', async () => {
      const result = await requisiteController.deleteRequisite(
        'SOEN490',
        'SOEN390',
        'pre',
      );

      expect(result).toBe(
        'Requisite with the course combination provided has been successfully deleted.',
      );

      const course = await Course.findById('SOEN490');
      expect(course.prerequisites).not.toContain('SOEN390');
    });

    it('should delete corequisite successfully', async () => {
      const result = await requisiteController.deleteRequisite(
        'SOEN490',
        'SOEN491',
        'co',
      );

      expect(result).toBe(
        'Requisite with the course combination provided has been successfully deleted.',
      );

      const course = await Course.findById('SOEN490');
      expect(course.corequisites).not.toContain('SOEN491');
    });

    it('should throw error if course does not exist', async () => {
      await expect(
        requisiteController.deleteRequisite('NONEXISTENT', 'SOEN390', 'pre'),
      ).rejects.toThrow('Course does not exist.');
    });

    it('should throw error if requisite does not exist', async () => {
      await expect(
        requisiteController.deleteRequisite('SOEN490', 'NONEXISTENT', 'pre'),
      ).rejects.toThrow('Requisite with this id does not exist.');
    });
  });
});
