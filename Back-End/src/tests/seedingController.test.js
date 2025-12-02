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
  DEGREES_URL: {
    'Test Degree': 'https://example.com/test-degree',
    DegreeA: 'https://example.com/degA',
    DegreeB: 'https://example.com/degB',
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
      await seedDegreeData('InvalidDegree');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Degree name "InvalidDegree" not found in degreesURL map.',
      );
      expect(pythonUtilsApi.parseDegree).not.toHaveBeenCalled();
    });

    it('runs scraper and seeds degree, course pools, and courses successfully', async () => {
      const fakeData = {
        degree: { _id: 'deg1', name: 'Test Degree' },
        course_pool: [{ name: 'Pool1', courses: ['C1'] }],
        courses: [{ code: 'C1', title: 'Course 1' }],
      };
      pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

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

      await seedDegreeData('Test Degree');

      expect(pythonUtilsApi.parseDegree).toHaveBeenCalledWith(
        'https://example.com/test-degree',
      );
      expect(createDegreeMock).toHaveBeenCalledWith(fakeData.degree);
      expect(bulkCreateCoursePoolsMock).toHaveBeenCalledWith(
        fakeData.course_pool,
      );
      expect(bulkCreateCoursesMock).toHaveBeenCalledWith(fakeData.courses);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Degree deg1 created successfully.',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Course pools created for degree: Test Degree',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Courses created for degree: Test Degree',
      );
    });

    it('updates degree when it already exists', async () => {
      const fakeData = {
        degree: { _id: 'deg2', name: 'Test Degree' },
        course_pool: [{ name: 'Pool1', courses: ['C1'] }],
        courses: [{ code: 'C1', title: 'Course 1' }],
      };
      pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

      const createDegreeMock = jest.fn().mockResolvedValue(false);
      const updateDegreeMock = jest.fn().mockResolvedValue(fakeData.degree);
      const bulkCreateCoursePoolsMock = jest.fn().mockResolvedValue(true);
      const bulkCreateCoursesMock = jest.fn().mockResolvedValue(true);

      DegreeControllerModule.DegreeController.mockImplementation(() => ({
        createDegree: createDegreeMock,
        updateDegree: updateDegreeMock,
      }));
      CoursePoolControllerModule.CoursePoolController.mockImplementation(
        () => ({
          bulkCreateCoursePools: bulkCreateCoursePoolsMock,
        }),
      );
      CourseControllerModule.CourseController.mockImplementation(() => ({
        bulkCreateCourses: bulkCreateCoursesMock,
      }));

      await seedDegreeData('Test Degree');

      expect(updateDegreeMock).toHaveBeenCalledWith('deg2', fakeData.degree);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Degree deg2 already exists. Updated existing degree.',
      );
    });

    it('handles error when creating/updating degree fails', async () => {
      const fakeData = {
        degree: { _id: 'deg3', name: 'Test Degree' },
        course_pool: [{ name: 'Pool1', courses: ['C1'] }],
        courses: [{ code: 'C1', title: 'Course 1' }],
      };
      pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

      const error = new Error('Degree creation failed');
      const createDegreeMock = jest.fn().mockRejectedValue(error);
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

      await seedDegreeData('Test Degree');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error creating/updating degree: deg3',
        error,
      );
    });

    it('warns when some course pools are not created', async () => {
      const fakeData = {
        degree: { _id: 'deg4', name: 'Test Degree' },
        course_pool: [{ name: 'Pool1', courses: ['C1'] }],
        courses: [{ code: 'C1', title: 'Course 1' }],
      };
      pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

      const createDegreeMock = jest.fn().mockResolvedValue(true);
      const bulkCreateCoursePoolsMock = jest.fn().mockResolvedValue(false);
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

      await seedDegreeData('Test Degree');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Some course pools may not have been created for degree: Test Degree',
      );
    });

    it('warns when some courses are not created', async () => {
      const fakeData = {
        degree: { _id: 'deg5', name: 'Test Degree' },
        course_pool: [{ name: 'Pool1', courses: ['C1'] }],
        courses: [{ code: 'C1', title: 'Course 1' }],
      };
      pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

      const createDegreeMock = jest.fn().mockResolvedValue(true);
      const bulkCreateCoursePoolsMock = jest.fn().mockResolvedValue(true);
      const bulkCreateCoursesMock = jest.fn().mockResolvedValue(false);

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

      await seedDegreeData('Test Degree');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Some courses may not have been created for degree: Test Degree',
      );
    });

    it('handles error when creating course pools or courses fails', async () => {
      const fakeData = {
        degree: { _id: 'deg6', name: 'Test Degree' },
        course_pool: [{ name: 'Pool1', courses: ['C1'] }],
        courses: [{ code: 'C1', title: 'Course 1' }],
      };
      pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

      const error = new Error('Bulk creation failed');
      const createDegreeMock = jest.fn().mockResolvedValue(true);
      const bulkCreateCoursePoolsMock = jest.fn().mockRejectedValue(error);

      DegreeControllerModule.DegreeController.mockImplementation(() => ({
        createDegree: createDegreeMock,
      }));
      CoursePoolControllerModule.CoursePoolController.mockImplementation(
        () => ({
          bulkCreateCoursePools: bulkCreateCoursePoolsMock,
        }),
      );
      CourseControllerModule.CourseController.mockImplementation(() => ({
        bulkCreateCourses: jest.fn(),
      }));

      await seedDegreeData('Test Degree');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error creating course pools or courses for degree: Test Degree',
        error,
      );
    });
  });

  describe('seedAllDegreeData', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('runs seedAllDegreeData for all degrees in degreesURL', async () => {
      const fakeData = {
        degree: { _id: 'deg1', name: 'Test Degree' },
        course_pool: [{ _id: 'pool1', name: 'Pool1', courses: ['C1'] }],
        courses: [{ _id: 'C1', code: 'C1', title: 'Course 1' }],
      };
      pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

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

      await seedAllDegreeData();

      // parseDegree should be invoked once per degree in degreesURL
      expect(pythonUtilsApi.parseDegree).toHaveBeenCalledTimes(3);
      expect(pythonUtilsApi.parseDegree).toHaveBeenCalledWith(
        'https://example.com/test-degree',
      );
      expect(pythonUtilsApi.parseDegree).toHaveBeenCalledWith(
        'https://example.com/degA',
      );
      expect(pythonUtilsApi.parseDegree).toHaveBeenCalledWith(
        'https://example.com/degB',
      );

      // Ensure degree and pool/course creation attempted
      expect(createDegreeMock).toHaveBeenCalledTimes(3);
      expect(bulkCreateCoursePoolsMock).toHaveBeenCalledTimes(3);
      expect(bulkCreateCoursesMock).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Seeding completed for all degrees.',
      );
    });

    it('handles errors during seedAllDegreeData and continues with other degrees', async () => {
      const fakeData = {
        degree: { _id: 'deg1', name: 'Test Degree' },
        course_pool: [{ _id: 'pool1', name: 'Pool1', courses: ['C1'] }],
        courses: [{ _id: 'C1', code: 'C1', title: 'Course 1' }],
      };

      let callCount = 0;
      pythonUtilsApi.parseDegree.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Parse failed for DegreeA'));
        }
        return Promise.resolve(fakeData);
      });

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

      await seedAllDegreeData();

      // parseDegree should be invoked once per degree
      expect(pythonUtilsApi.parseDegree).toHaveBeenCalledTimes(3);

      // Only 2 degrees should succeed
      expect(createDegreeMock).toHaveBeenCalledTimes(2);

      // Error should be logged for the failed degree
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Seeding failed for degree'),
        expect.any(Error),
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Seeding completed for all degrees.',
      );
    });
  });
});
