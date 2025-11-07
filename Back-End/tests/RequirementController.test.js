const { seedDegreeData, getRequirements } = require('../controllers/mondoDBControllers/RequirementController');
const runScraperModule = require('../course-data/Scraping/Scrapers/runScraper');
const DegreeControllerModule = require('../controllers/mondoDBControllers/DegreeController');
const CoursePoolControllerModule = require('../controllers/mondoDBControllers/CoursepoolController');
const CourseControllerModule = require('../controllers/mondoDBControllers/CourseController');

jest.mock('../course-data/Scraping/Scrapers/runScraper');
jest.mock('../controllers/mondoDBControllers/DegreeController');
jest.mock('../controllers/mondoDBControllers/CoursepoolController');
jest.mock('../controllers/mondoDBControllers/CourseController');

describe('seedDegreeData', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('runs scraper and seeds degree, course pools, and courses', async () => {
        const fakeData = {
            degree: { id: 'deg1', name: 'Test Degree' },
            course_pool: [{ name: 'Pool1', courses: ['C1'] }],
            courses: [{ code: 'C1', title: 'Course 1' }]
        };
        runScraperModule.runScraper.mockResolvedValue(fakeData);

        const createDegreeMock = jest.fn().mockResolvedValue(undefined);
        const createCoursePoolMock = jest.fn();
        const createCourseMock = jest.fn();

        DegreeControllerModule.DegreeController.mockImplementation(() => ({
            createDegree: createDegreeMock
        }));
        CoursePoolControllerModule.CoursePoolController.mockImplementation(() => ({
            createCoursePool: createCoursePoolMock
        }));
        CourseControllerModule.CourseController.mockImplementation(() => ({
            createCourse: createCourseMock
        }));

        await seedDegreeData('Test Degree');

        expect(runScraperModule.runScraper).toHaveBeenCalledWith('Test Degree');
        expect(createDegreeMock).toHaveBeenCalledWith(fakeData.degree);
        expect(createCoursePoolMock).toHaveBeenCalledWith(fakeData.course_pool[0]);
        expect(createCourseMock).toHaveBeenCalledWith(fakeData.courses[0]);
    });
});

describe('getRequirements', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns requirements with degree, course pools, and courses', async () => {
        const fakeDegree = { id: 'deg1', coursePools: ['pool1'] };
        const fakeCoursePool = { name: 'Pool1', courses: ['C1'] };
        const fakeCourse = { code: 'C1', title: 'Course 1' };

        DegreeControllerModule.DegreeController.mockImplementation(() => ({
            readDegree: jest.fn().mockResolvedValue(fakeDegree)
        }));
        CoursePoolControllerModule.CoursePoolController.mockImplementation(() => ({
            getCoursePool: jest.fn().mockResolvedValue(fakeCoursePool)
        }));
        CourseControllerModule.CourseController.mockImplementation(() => ({
            getCourseByCode: jest.fn().mockResolvedValue(fakeCourse)
        }));

        const result = await getRequirements('deg1');

        expect(result.degree).toEqual(fakeDegree);
        expect(result.coursePools).toEqual([fakeCoursePool]);
        expect(result.courses).toEqual([fakeCourse]);
    });

    it('throws error if degree not found', async () => {
        DegreeControllerModule.DegreeController.mockImplementation(() => ({
            readDegree: jest.fn().mockResolvedValue(null)
        }));

        await expect(getRequirements('degX')).rejects.toThrow(
            'Degree with ID degX not found.'
        );
    });

    it('filters out undefined course pools', async () => {
        const fakeDegree = { id: 'deg1', coursePools: ['pool1', 'pool2'] };
        const fakeCoursePool = { name: 'Pool1', courses: ['C1'] };

        DegreeControllerModule.DegreeController.mockImplementation(() => ({
            readDegree: jest.fn().mockResolvedValue(fakeDegree)
        }));
        CoursePoolControllerModule.CoursePoolController.mockImplementation(() => ({
            getCoursePool: jest.fn()
                .mockImplementationOnce(() => Promise.resolve(fakeCoursePool))
                .mockImplementationOnce(() => Promise.resolve(undefined))
        }));
        CourseControllerModule.CourseController.mockImplementation(() => ({
            getCourseByCode: jest.fn().mockResolvedValue({ code: 'C1', title: 'Course 1' })
        }));

        const result = await getRequirements('deg1');

        expect(result.coursePools).toEqual([fakeCoursePool]);
    });
});
