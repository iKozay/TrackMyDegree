const {
  seedDegreeData,
  seedAllDegreeData,
} = require('../controllers/seedingController');
const runScraperModule = require('../course-data/Scraping/Scrapers/runScraper');
const DegreeControllerModule = require('../controllers/degreeController');
const CoursePoolControllerModule = require('../controllers/coursepoolController');
const CourseControllerModule = require('../controllers/courseController');

jest.mock('../course-data/Scraping/Scrapers/runScraper');
jest.mock('../controllers/degreeController');
jest.mock('../controllers/coursepoolController');
jest.mock('../controllers/courseController');

describe('seedingController', () => {
  describe('seedDegreeData', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('runs scraper and seeds degree, course pools, and courses', async () => {
      const fakeData = {
        degree: { id: 'deg1', name: 'Test Degree' },
        course_pool: [{ name: 'Pool1', courses: ['C1'] }],
        courses: [{ code: 'C1', title: 'Course 1' }],
      };
      runScraperModule.runScraper.mockResolvedValue(fakeData);

      const createDegreeMock = jest.fn().mockResolvedValue(undefined);
      const createCoursePoolMock = jest.fn();
      const createCourseMock = jest.fn();

      DegreeControllerModule.DegreeController.mockImplementation(() => ({
        createDegree: createDegreeMock,
      }));
      CoursePoolControllerModule.CoursePoolController.mockImplementation(
        () => ({
          createCoursePool: createCoursePoolMock,
        }),
      );
      CourseControllerModule.CourseController.mockImplementation(() => ({
        createCourse: createCourseMock,
      }));

      await seedDegreeData('Test Degree');

      expect(runScraperModule.runScraper).toHaveBeenCalledWith('Test Degree');
      expect(createDegreeMock).toHaveBeenCalledWith(fakeData.degree);
      expect(createCoursePoolMock).toHaveBeenCalledWith(
        fakeData.course_pool[0],
      );
      expect(createCourseMock).toHaveBeenCalledWith(fakeData.courses[0]);
    });
  });

  describe('seedAllDegreeData', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('runs seedDegreeData for every degree in degreesURL', async () => {
      // prepare a fake degrees list with two entries
      runScraperModule.degreesURL = { DegA: 'urlA', DegB: 'urlB' };

      const fakeData = {
        degree: { _id: 'deg1', name: 'Test Degree' },
        course_pool: [{ _id: 'pool1', name: 'Pool1', courses: ['C1'] }],
        courses: [{ _id: 'C1', code: 'C1', title: 'Course 1' }],
      };
      runScraperModule.runScraper.mockResolvedValue(fakeData);

      const createDegreeMock = jest.fn().mockResolvedValue(undefined);
      const createCoursePoolMock = jest.fn().mockResolvedValue(true);
      const createCourseMock = jest.fn().mockResolvedValue(undefined);

      DegreeControllerModule.DegreeController.mockImplementation(() => ({
        createDegree: createDegreeMock,
      }));
      CoursePoolControllerModule.CoursePoolController.mockImplementation(
        () => ({
          createCoursePool: createCoursePoolMock,
        }),
      );
      CourseControllerModule.CourseController.mockImplementation(() => ({
        createCourse: createCourseMock,
      }));

      await seedAllDegreeData();

      // runScraper should be invoked once per degree name
      expect(runScraperModule.runScraper).toHaveBeenCalledTimes(2);
      expect(runScraperModule.runScraper).toHaveBeenCalledWith('DegA');
      expect(runScraperModule.runScraper).toHaveBeenCalledWith('DegB');

      // Ensure degree and pool/course creation attempted for at least one entry
      expect(createDegreeMock).toHaveBeenCalled();
      expect(createCoursePoolMock).toHaveBeenCalled();
      expect(createCourseMock).toHaveBeenCalled();
    });
  });
});
