// __tests__/degreeController.test.ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DegreeController } from '../controllers/degreeController';
import { Degree } from '../models/degree';
import { CoursePool } from '../models/coursepool';
import { Course } from '../models/course';
import {
  resolveEntityVersion,
  resolveEntityVersions,
} from '@services/catalogVersionService';

// Mock the entity version resolvers
jest.mock('@services/catalogVersionService', () => ({
  resolveEntityVersion: jest.fn(async ({ baseEntity, academicYear }) => ({
    entity: { ...baseEntity },
    academicYear: academicYear || baseEntity.baseAcademicYear || '2025-2026',
  })),
  resolveEntityVersions: jest.fn(async (_type, entities) => entities.map(e => ({ ...e }))),
}));

describe('DegreeController', () => {
  let mongoServer;
  let degreeController;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    degreeController = new DegreeController();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Degree.deleteMany({});
    await CoursePool.deleteMany({});
    await Course.deleteMany({});
  });

  describe('Constructor', () => {
    it('should initialize with Degree model', () => {
      expect(degreeController.model).toBe(Degree);
      expect(degreeController.modelName).toBe('Degree');
    });
  });

  describe('createDegree', () => {
    it('should create a new degree if not already exists', async () => {
      const degreeData = { _id: 'COMP', name: 'Computer Science', totalCredits: 120, coursePools: [] };
      const result = await degreeController.createDegree(degreeData);
      expect(result).toBe(true);

      const createdDegree = await Degree.findById('COMP').lean();
      expect(createdDegree).toMatchObject(degreeData);
    });

    it('should skip creation if degree already exists', async () => {
      const degreeData = { _id: 'COMP', name: 'Computer Science', totalCredits: 120, coursePools: [] };
      await Degree.create(degreeData);

      await expect(degreeController.createDegree(degreeData))
        .rejects.toThrow('Degree with this ID already exists');
    });

    it('should handle errors during degree creation', async () => {
      const originalCreate = degreeController.model.create;
      degreeController.model.create = jest.fn().mockRejectedValue(new Error('Database error during creation'));

      await expect(degreeController.createDegree({ _id: 'COMP', name: 'CS', totalCredits: 120, coursePools: [] }))
        .rejects.toThrow('Database error during creation');

      degreeController.model.create = originalCreate;
    });
  });

  describe('updateDegree', () => {
    it('should update an existing degree', async () => {
      const testDegree = await Degree.create({ _id: 'COMP7', name: 'Computer Science', totalCredits: 120, coursePools: [] });
      const degreeData = { name: 'Computer Science 1234', totalCredits: 123, coursePools: ['POOL1', 'POOL2'] };

      const originalUpdateById = degreeController.updateById;
      degreeController.updateById = jest.fn().mockResolvedValue({ _id: testDegree._id, ...degreeData });

      const result = await degreeController.updateDegree(testDegree._id, degreeData);
      expect(result).toMatchObject(degreeData);

      degreeController.updateById = originalUpdateById;
    });

    it('should handle errors during degree update', async () => {
      const originalUpdateById = degreeController.updateById;
      degreeController.updateById = jest.fn().mockRejectedValue(new Error('Database error during update'));

      const testDegree = await Degree.create({ _id: 'MATH', name: 'Mathematics', totalCredits: 30, coursePools: [] });
      const degreeData = { name: 'Mathematics 1234', totalCredits: 33, coursePools: ['POOL1', 'POOL2'] };

      await expect(degreeController.updateDegree(testDegree._id, degreeData))
        .rejects.toThrow('Database error during update');

      degreeController.updateById = originalUpdateById;
    });
  });

  describe('readDegree', () => {
    let testDegree;

    beforeEach(async () => {
      testDegree = await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [{ _id: 'COMP_CORE', name: 'Computer Science Core', creditsRequired: 60, courses: ['COMP101', 'COMP102'] }],
      });
    });

    it('should get degree by ID', async () => {
      const result = await degreeController.readDegree('COMP');
      expect(result).toMatchObject({ _id: 'COMP', name: 'Computer Science', totalCredits: 120 });
    });

    it('should throw error for non-existent degree', async () => {
      await expect(degreeController.readDegree('NONEXISTENT'))
        .rejects.toThrow('Degree not found');
    });

    it('should handle database errors', async () => {
      const originalFindById = degreeController.findById;
      degreeController.findById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(degreeController.readDegree('COMP'))
        .rejects.toThrow('Database connection failed');

      degreeController.findById = originalFindById;
    });
  });

  describe('readAllDegrees', () => {
    beforeEach(async () => {
      await Degree.create([
        { _id: 'COMP', degreeType: 'Standalone', name: 'Computer Science', totalCredits: 120 },
        { _id: 'SOEN', degreeType: 'Standalone', name: 'Software Engineering', totalCredits: 120 },
        { _id: 'ECP', degreeType: 'ECP', name: 'Engineering Common Program', totalCredits: 30 },
      ]);
    });

    it('should get all degrees excluding ECP', async () => {
      const result = await degreeController.readAllDegrees();
      expect(result).toHaveLength(2);
      expect(result.find(d => d._id === 'COMP')).toBeDefined();
      expect(result.find(d => d._id === 'SOEN')).toBeDefined();
      expect(result.find(d => d._id === 'ECP')).toBeUndefined();
    });

    it('should return degrees sorted by name', async () => {
      const result = await degreeController.readAllDegrees();
      expect(result[0].name).toBe('Computer Science');
      expect(result[1].name).toBe('Software Engineering');
    });

    it('should return empty array when no degrees exist', async () => {
      await Degree.deleteMany({});
      const result = await degreeController.readAllDegrees();
      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      const originalFindAll = degreeController.findAll;
      degreeController.findAll = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(degreeController.readAllDegrees())
        .rejects.toThrow('Database connection failed');

      degreeController.findAll = originalFindAll;
    });
  });

  describe('getCreditsForDegree', () => {
    beforeEach(async () => {
      await Degree.create({ _id: 'COMP', name: 'Computer Science', totalCredits: 120 });
    });

    it('should get credits for degree', async () => {
      const result = await degreeController.getCreditsForDegree('COMP');
      expect(result).toBe(120);
    });

    it('should throw error for non-existent degree', async () => {
      await expect(degreeController.getCreditsForDegree('NONEXISTENT'))
        .rejects.toThrow('Degree not found');
    });
  });

  describe('getCoursePoolsForDegree', () => {
    beforeEach(async () => {
      await Degree.create({ _id: 'COMP123', name: 'Computer Science123', totalCredits: 120, coursePools: ['COMP_CORE', 'COMP_ELECTIVES'], baseAcademicYear: '2025-2026' });

      await CoursePool.create([
        { _id: 'COMP_CORE', name: 'COMP_CORE', creditsRequired: 60, courses: ['course 1'], rules: [], baseAcademicYear: '2025-2026' },
        { _id: 'COMP_ELECTIVES', name: 'COMP_ELECTIVES', creditsRequired: 60, courses: ['course 2'], rules: [], baseAcademicYear: '2025-2026' },
      ]);
    });

    it('should get course pools for degree', async () => {
      const result = await degreeController.getCoursePoolsForDegree('COMP123');
      expect(result).toEqual([
        { _id: 'COMP_CORE', name: 'COMP_CORE', creditsRequired: 60, courses: ['course 1'], rules: [], baseAcademicYear: '2025-2026' },
        { _id: 'COMP_ELECTIVES', name: 'COMP_ELECTIVES', creditsRequired: 60, courses: ['course 2'], rules: [], baseAcademicYear: '2025-2026' },
      ]);
    });

    it('should throw error for non-existent degree', async () => {
      await expect(degreeController.getCoursePoolsForDegree('NONEXISTENT'))
        .rejects.toThrow('Degree not found');
    });
  });

  describe('getCoursesForDegree', () => {
    beforeEach(async () => {
      await CoursePool.create([
        { _id: 'CORE_POOL', name: 'Core Pool', creditsRequired: 60, courses: ['COMP232', 'COMP248'], rules: [] },
        { _id: 'ELEC_POOL', name: 'Electives', creditsRequired: 30, courses: ['COMP249'], rules: [] },
      ]);

      await Course.create([
        { _id: 'COMP232', title: 'Discrete Mathematics', credits: 3, description: 'Discrete math course' },
        { _id: 'COMP248', title: 'Object-Oriented Programming I', credits: 3, description: 'Intro to OOP' },
        { _id: 'COMP249', title: 'Object-Oriented Programming II', credits: 3, description: 'Advanced OOP' },
      ]);

      await Degree.create({ _id: 'COMP', name: 'Computer Science', totalCredits: 120, coursePools: ['CORE_POOL', 'ELEC_POOL'] });
    });

    it('should return all courses associated with a degree', async () => {
      const courses = await degreeController.getCoursesForDegree('COMP');
      expect(courses).toHaveLength(3);
      const ids = courses.map(c => c._id).sort();
      expect(ids).toEqual(['COMP232', 'COMP248', 'COMP249']);
    });

    it('should return an empty array if degree has no course pools', async () => {
      await Degree.create({ _id: 'EMPTY', name: 'Empty Degree', totalCredits: 0, coursePools: [] });
      const courses = await degreeController.getCoursesForDegree('EMPTY');
      expect(courses).toEqual([]);
    });

    it('should throw an error if degree does not exist', async () => {
      await expect(degreeController.getCoursesForDegree('NONEXISTENT')).rejects.toThrow('Degree not found');
    });
  });

  describe('deleteDegree', () => {
    beforeEach(async () => {
      await Degree.create({ _id: 'COMP', name: 'Computer Science', totalCredits: 120, coursePools: [] });
    });

    it('should delete an existing degree', async () => {
      const result = await degreeController.deleteDegree('COMP');
      expect(result).toContain("has been successfully deleted.");
      const deleted = await Degree.findById('COMP');
      expect(deleted).toBeNull();
    });

    it('should throw error if degree does not exist', async () => {
      await expect(degreeController.deleteDegree('NONEXISTENT')).rejects.toThrow('Degree not found');
    });
  });
});