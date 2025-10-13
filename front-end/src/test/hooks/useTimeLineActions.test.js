import { useTimelineActions } from '../../hooks/useTimeLineActions';
import { compareSemesters } from '../../utils/SemesterUtils';
import { notifyInfo, notifySuccess } from '../../components/Toast';

jest.mock('../../components/Toast', () => ({
    notifyInfo: jest.fn(),
    notifySuccess: jest.fn(),
}));


describe('useTimelineActions', () => {
    let state;
    let dispatch;
    let actions;

    beforeEach(() => {
        state = {
            majorCourses: [],
            majorCredits: 0,
            electiveCourses: [],
            electiveCredits: 0,
            semesters: [],
            semesterCourses: {},
            hasUnsavedChanges: false,
            isModalOpen: true,
        };
        dispatch = jest.fn();
        actions = useTimelineActions(state, dispatch);
        jest.clearAllMocks();
    });

    describe('addCourse', () => {
        it('adds a new course to the category', () => {
            const course = { code: 'COMP123', credits: 3 };
            actions.addCourse(course, 'major');
            expect(dispatch).toHaveBeenCalledWith({
                type: 'SET',
                payload: {
                    majorCourses: [course],
                    majorCredits: 3,
                },
            });
            expect(notifySuccess).toHaveBeenCalledWith('Course added to major!');
        });

        it('does not add a duplicate course', () => {
            state.majorCourses = [{ code: 'COMP123', credits: 3 }];
            actions = useTimelineActions(state, dispatch);
            const course = { code: 'COMP123', credits: 3 };
            actions.addCourse(course, 'major');
            expect(dispatch).not.toHaveBeenCalled();
            expect(notifyInfo).toHaveBeenCalledWith('Course already added to major!');
        });

        it('handles missing credits', () => {
            const course = { code: 'COMP456' };
            actions.addCourse(course, 'major');
            expect(dispatch).toHaveBeenCalledWith({
                type: 'SET',
                payload: {
                    majorCourses: [course],
                    majorCredits: 0,
                },
            });
        });
    });

    describe('removeCourse', () => {
        it('removes a course from the category', () => {
            state.majorCourses = [{ code: 'COMP123', credits: 3 }];
            state.majorCredits = 3;
            actions = useTimelineActions(state, dispatch);
            const course = { code: 'COMP123', credits: 3 };
            actions.removeCourse(course, 'major');
            expect(dispatch).toHaveBeenCalledWith({
                type: 'SET',
                payload: {
                    majorCourses: [],
                    majorCredits: 0,
                },
            });
            expect(notifySuccess).toHaveBeenCalledWith('Course removed from major!');
        });

        it('handles missing credits on removal', () => {
            state.majorCourses = [{ code: 'COMP456' }];
            state.majorCredits = 5;
            actions = useTimelineActions(state, dispatch);
            const course = { code: 'COMP456' };
            actions.removeCourse(course, 'major');
            expect(dispatch).toHaveBeenCalledWith({
                type: 'SET',
                payload: {
                    majorCourses: [],
                    majorCredits: 5,
                },
            });
        });
    });

    describe('addSemester', () => {
        it('adds a new semester', () => {
            actions.addSemester('2024W', 'Winter 2024');
            expect(dispatch).toHaveBeenCalledWith({
                type: 'SET',
                payload: {
                    semesters: [{ id: '2024W', name: 'Winter 2024' }].sort(compareSemesters),
                    semesterCourses: { '2024W': [] },
                    hasUnsavedChanges: true,
                    isModalOpen: false,
                },
            });
            expect(notifySuccess).toHaveBeenCalledWith('Semester Winter 2024 added.');
        });

        it('does not add a duplicate semester', () => {
            state.semesters = [{ id: '2024W', name: 'Winter 2024' }];
            actions = useTimelineActions(state, dispatch);
            actions.addSemester('2024W', 'Winter 2024');
            expect(dispatch).not.toHaveBeenCalled();
            expect(notifyInfo).toHaveBeenCalledWith('Semester Winter 2024 is already added.');
        });

        it('preserves existing semesterCourses', () => {
            state.semesterCourses = { '2024W': ['COMP123'] };
            actions = useTimelineActions(state, dispatch);
            actions.addSemester('2024F', 'Fall 2024');
            expect(dispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: expect.objectContaining({
                        semesterCourses: { '2024W': ['COMP123'], '2024F': [] },
                    }),
                })
            );
        });
    });

    describe('removeSemester', () => {
        it('removes a semester and its courses', () => {
            state.semesters = [{ id: '2024W', name: 'Winter 2024' }, { id: '2024F', name: 'Fall 2024' }];
            state.semesterCourses = { '2024W': ['COMP123'], '2024F': ['COMP456'] };
            actions = useTimelineActions(state, dispatch);
            actions.removeSemester('2024W');
            expect(dispatch).toHaveBeenCalledWith({
                type: 'SET',
                payload: {
                    semesters: [{ id: '2024F', name: 'Fall 2024' }],
                    semesterCourses: { '2024F': ['COMP456'] },
                    hasUnsavedChanges: true,
                },
            });
            expect(notifySuccess).toHaveBeenCalledWith('Semester removed.');
        });
    });
});