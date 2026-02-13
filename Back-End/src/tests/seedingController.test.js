const {
  seedDegreeData,
  seedAllDegreeData,
} = require('../controllers/seedingController');
const pythonUtilsApi = require('../utils/pythonUtilsApi');
const DegreeControllerModule = require('../controllers/degreeController');
const CoursePoolControllerModule = require('../controllers/coursepoolController');
const CourseControllerModule = require('../controllers/courseController');

jest.mock('../utils/pythonUtilsApi');
jest.mock('../controllers/degreeController');
jest.mock('../controllers/coursepoolController');
jest.mock('../controllers/courseController');
jest.mock('../utils/constants', () => ({
  SEASONS: {
    WINTER: 'WINTER',
    SUMMER: 'SUMMER',
    FALL: 'FALL',
    FALL_WINTER: 'FALL/WINTER',
  },
}));

describe('seedingController', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('seedDegreeData', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns early for invalid degree name', async () => {
      pythonUtilsApi.getDegreeNames.mockResolvedValue(['BCompSc in Computer Science', 'BEng in Software Engineering']);
      
      const result = await seedDegreeData('InvalidDegree');

      expect(result).toBe('Degree name "InvalidDegree" is not valid. Please choose from: BCompSc in Computer Science, BEng in Software Engineering');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Degree name "InvalidDegree" is not valid. Available degrees: BCompSc in Computer Science, BEng in Software Engineering',
      );
      expect(pythonUtilsApi.parseDegree).not.toHaveBeenCalled();
    });

    it('runs scraper and seeds degree and course pools successfully', async () => {
      const fakeData = {
        degree: { _id: 'deg1', name: 'Test Degree' },
        coursePools: [{ name: 'Pool1', courses: ['C1'] }],
      };
      pythonUtilsApi.getDegreeNames.mockResolvedValue(['Test Degree']);
      pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

      const createDegreeMock = jest.fn().mockResolvedValue(true);
      const bulkCreateCoursePoolsMock = jest.fn().mockResolvedValue(true);

      DegreeControllerModule.DegreeController.mockImplementation(() => ({
        createDegree: createDegreeMock,
      }));
      CoursePoolControllerModule.CoursePoolController.mockImplementation(
        () => ({
          bulkCreateCoursePools: bulkCreateCoursePoolsMock,
        }),
      );

      const result = await seedDegreeData('Test Degree');

      expect(result).toBe('Seeding completed for degree: Test Degree');
      expect(pythonUtilsApi.parseDegree).toHaveBeenCalledWith('Test Degree');
      expect(createDegreeMock).toHaveBeenCalledWith(fakeData.degree);
      expect(bulkCreateCoursePoolsMock).toHaveBeenCalledWith(fakeData.coursePools);
      expect(consoleLogSpy).toHaveBeenCalledWith('Degree deg1 created successfully.');
    });

    it('updates degree when it already exists', async () => {
      const fakeData = {
        degree: { _id: 'deg2', name: 'Test Degree' },
        coursePools: [{ name: 'Pool1', courses: ['C1'] }],
      };
      pythonUtilsApi.getDegreeNames.mockResolvedValue(['Test Degree']);
      pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

      const createDegreeMock = jest.fn().mockResolvedValue(false);
      const updateDegreeMock = jest.fn().mockResolvedValue(fakeData.degree);
      const bulkCreateCoursePoolsMock = jest.fn().mockResolvedValue(true);

      DegreeControllerModule.DegreeController.mockImplementation(() => ({
        createDegree: createDegreeMock,
        updateDegree: updateDegreeMock,
      }));
      CoursePoolControllerModule.CoursePoolController.mockImplementation(
        () => ({
          bulkCreateCoursePools: bulkCreateCoursePoolsMock,
        }),
      );

      const result = await seedDegreeData('Test Degree');

      expect(result).toBe('Seeding completed for degree: Test Degree');
      expect(updateDegreeMock).toHaveBeenCalledWith('deg2', fakeData.degree);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Degree deg2 already exists. Updated existing degree.',
      );
    });

    it('handles error when creating/updating degree fails', async () => {
      const fakeData = {
        degree: { _id: 'deg3', name: 'Test Degree' },
        coursePools: [{ name: 'Pool1', courses: ['C1'] }],
      };
      pythonUtilsApi.getDegreeNames.mockResolvedValue(['Test Degree']);
      pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

      const error = new Error('Degree creation failed');
      const createDegreeMock = jest.fn().mockRejectedValue(error);

      DegreeControllerModule.DegreeController.mockImplementation(() => ({
        createDegree: createDegreeMock,
      }));

      const result = await seedDegreeData('Test Degree');

      expect(result).toContain('Failed to seed degree data for degree: Test Degree');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to seed degree data for degree: Test Degree',
        error,
      );
    });

    it('handles course pool creation errors', async () => {
      const fakeData = {
        degree: { _id: 'deg4', name: 'Test Degree' },
        coursePools: [{ name: 'Pool1', courses: ['C1'] }],
      };
      pythonUtilsApi.getDegreeNames.mockResolvedValue(['Test Degree']);
      pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

      const createDegreeMock = jest.fn().mockResolvedValue(true);
      const error = new Error('Course pool creation failed');
      const bulkCreateCoursePoolsMock = jest.fn().mockRejectedValue(error);

      DegreeControllerModule.DegreeController.mockImplementation(() => ({
        createDegree: createDegreeMock,
      }));
      CoursePoolControllerModule.CoursePoolController.mockImplementation(
        () => ({
          bulkCreateCoursePools: bulkCreateCoursePoolsMock,
        }),
      );

      const result = await seedDegreeData('Test Degree');

      expect(result).toContain('Failed to seed degree data for degree: Test Degree');
    });

  });

  describe('seedAllDegreeData', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('runs seedAllDegreeData for all degrees and courses', async () => {
      const mockDegreeData = [
        {
          degree: { _id: 'deg1', name: 'Computer Science' },
          coursePools: [{ _id: 'pool1', name: 'Pool1', courses: ['COMP 101'] }],
        },
        {
          degree: { _id: 'deg2', name: 'Software Engineering' },
          coursePools: [{ _id: 'pool2', name: 'Pool2', courses: ['SOEN 101'] }],
        },
      ];
      const mockCourses = [
        { _id: 'COMP 101', title: 'Intro to Programming' },
        { _id: 'SOEN 101', title: 'Intro to Software Engineering' },
      ];
      
      pythonUtilsApi.parseAllDegrees.mockResolvedValue(mockDegreeData);
      pythonUtilsApi.getAllCourses.mockResolvedValue(mockCourses);

      const createDegreeMock = jest.fn().mockResolvedValue(true);
      const bulkCreateCoursePoolsMock = jest.fn().mockResolvedValue(true);
      const bulkCreateCoursesMock = jest.fn().mockResolvedValue(true);

      DegreeControllerModule.DegreeController.mockImplementation(() => ({
        createDegree: createDegreeMock,
      }));
      CoursePoolControllerModule.CoursePoolController.mockImplementation(
        () => ({
          bulkCreateCoursePools: bulkCreateCoursePoolsMock,
        }),
      );
      CourseControllerModule.CourseController.mockImplementation(() => ({
        bulkCreateCourses: bulkCreateCoursesMock,
      }));

      const result = await seedAllDegreeData();

      expect(pythonUtilsApi.parseAllDegrees).toHaveBeenCalledTimes(1);
      expect(pythonUtilsApi.getAllCourses).toHaveBeenCalledTimes(1);
      expect(createDegreeMock).toHaveBeenCalledTimes(2);
      expect(bulkCreateCoursePoolsMock).toHaveBeenCalledTimes(2);
      expect(bulkCreateCoursesMock).toHaveBeenCalledWith(mockCourses);
      expect(result).toBe('Seeding completed for all degrees. Success: 2, Failed: 0. All courses seeded successfully.');
    });

    it('handles errors during degree seeding and continues with remaining degrees', async () => {
      const mockDegreeData = [
        {
          degree: { _id: 'deg1', name: 'Computer Science' },
          coursePools: [{ _id: 'pool1', name: 'Pool1', courses: ['COMP 101'] }],
        },
        {
          degree: { _id: 'deg2', name: 'Software Engineering' },
          coursePools: [{ _id: 'pool2', name: 'Pool2', courses: ['SOEN 101'] }],
        },
      ];
      const mockCourses = [
        { _id: 'COMP 101', title: 'Intro to Programming' },
        { _id: 'SOEN 101', title: 'Intro to Software Engineering' },
      ];
      
      pythonUtilsApi.parseAllDegrees.mockResolvedValue(mockDegreeData);
      pythonUtilsApi.getAllCourses.mockResolvedValue(mockCourses);

      const createDegreeMock = jest.fn()
        .mockResolvedValueOnce(true) // First degree succeeds
        .mockRejectedValueOnce(new Error('Database error')); // Second degree fails
      const bulkCreateCoursePoolsMock = jest.fn().mockResolvedValue(true);
      const bulkCreateCoursesMock = jest.fn().mockResolvedValue(true);

      DegreeControllerModule.DegreeController.mockImplementation(() => ({
        createDegree: createDegreeMock,
      }));
      CoursePoolControllerModule.CoursePoolController.mockImplementation(
        () => ({
          bulkCreateCoursePools: bulkCreateCoursePoolsMock,
        }),
      );
      CourseControllerModule.CourseController.mockImplementation(() => ({
        bulkCreateCourses: bulkCreateCoursesMock,
      }));

      const result = await seedAllDegreeData();

      expect(createDegreeMock).toHaveBeenCalledTimes(2);
      expect(bulkCreateCoursePoolsMock).toHaveBeenCalledTimes(1); // Only for successful degree
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to seed data for degree: deg2',
        expect.any(Error),
      );
      expect(result).toBe('Seeding completed for all degrees. Success: 1, Failed: 1. All courses seeded successfully.');
    });

    it('handles course seeding errors', async () => {
      const mockDegreeData = [
        {
          degree: { _id: 'deg1', name: 'Computer Science' },
          coursePools: [{ _id: 'pool1', name: 'Pool1', courses: ['COMP 101'] }],
        },
      ];
      const mockCourses = [
        { _id: 'COMP 101', title: 'Intro to Programming' },
      ];
      
      pythonUtilsApi.parseAllDegrees.mockResolvedValue(mockDegreeData);
      pythonUtilsApi.getAllCourses.mockResolvedValue(mockCourses);

      const createDegreeMock = jest.fn().mockResolvedValue(true);
      const bulkCreateCoursePoolsMock = jest.fn().mockResolvedValue(true);
      const bulkCreateCoursesMock = jest.fn().mockRejectedValue(new Error('Course creation failed'));

      DegreeControllerModule.DegreeController.mockImplementation(() => ({
        createDegree: createDegreeMock,
      }));
      CoursePoolControllerModule.CoursePoolController.mockImplementation(
        () => ({
          bulkCreateCoursePools: bulkCreateCoursePoolsMock,
        }),
      );
      CourseControllerModule.CourseController.mockImplementation(() => ({
        bulkCreateCourses: bulkCreateCoursesMock,
      }));

      const result = await seedAllDegreeData();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to seed courses',
        expect.any(Error),
      );
      expect(result).toBe('Seeding completed for all degrees. Success: 1, Failed: 0. Failed to seed courses.');
    });
  });
});
