const { seedDegreeData, seedAllDegreeData } = require('../controllers/seedingController');
const pythonUtilsApi = require('../utils/pythonUtilsApi');
const DegreeControllerModule = require('../controllers/degreeController');
const CoursePoolControllerModule = require('../controllers/coursepoolController');
const CourseControllerModule = require('../controllers/courseController');

jest.mock('../utils/pythonUtilsApi');
jest.mock('../controllers/degreeController');
jest.mock('../controllers/coursepoolController');
jest.mock('../controllers/courseController');
jest.mock('../constants', () => ({
    DEGREES_URL: {
        'Test Degree': 'https://example.com/test-degree',
        'DegreeA': 'https://example.com/degA',
        'DegreeB': 'https://example.com/degB'
    }
}));

describe("seedingController", () => {
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
            pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

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

            expect(pythonUtilsApi.parseDegree).toHaveBeenCalledWith('https://example.com/test-degree');
            expect(createDegreeMock).toHaveBeenCalledWith(fakeData.degree);
            expect(createCoursePoolMock).toHaveBeenCalledWith(fakeData.course_pool[0]);
            expect(createCourseMock).toHaveBeenCalledWith(fakeData.courses[0]);
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
                courses: [{ _id: 'C1', code: 'C1', title: 'Course 1' }]
            };
            pythonUtilsApi.parseDegree.mockResolvedValue(fakeData);

            const createDegreeMock = jest.fn().mockResolvedValue(undefined);
            const createCoursePoolMock = jest.fn().mockResolvedValue(true);
            const createCourseMock = jest.fn().mockResolvedValue(undefined);

            DegreeControllerModule.DegreeController.mockImplementation(() => ({
                createDegree: createDegreeMock
            }));
            CoursePoolControllerModule.CoursePoolController.mockImplementation(() => ({
                createCoursePool: createCoursePoolMock
            }));
            CourseControllerModule.CourseController.mockImplementation(() => ({
                createCourse: createCourseMock
            }));

            await seedAllDegreeData();

            // parseDegree should be invoked once per degree in degreesURL
            expect(pythonUtilsApi.parseDegree).toHaveBeenCalledTimes(3);
            expect(pythonUtilsApi.parseDegree).toHaveBeenCalledWith('https://example.com/test-degree');
            expect(pythonUtilsApi.parseDegree).toHaveBeenCalledWith('https://example.com/degA');
            expect(pythonUtilsApi.parseDegree).toHaveBeenCalledWith('https://example.com/degB');

            // Ensure degree and pool/course creation attempted
            expect(createDegreeMock).toHaveBeenCalledTimes(3);
            expect(createCoursePoolMock).toHaveBeenCalledTimes(3);
            expect(createCourseMock).toHaveBeenCalledTimes(3);
        });
    });
});