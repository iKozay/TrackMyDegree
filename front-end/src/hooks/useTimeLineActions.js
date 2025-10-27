import { notifyInfo, notifySuccess } from '../components/Toast';
import { compareSemesters } from '../utils/SemesterUtils';

export const useTimelineActions = (state, dispatch) => {
  // ---------------- Courses ----------------
  const addCourse = (course, category) => {
    const listKey = `${category}Courses`;
    const creditsKey = `${category}Credits`;

    const alreadyAdded = state[listKey].some((c) => c.code === course.code);
    if (alreadyAdded) {
      notifyInfo(`Course already added to ${category}!`);
      return;
    }

    notifySuccess(`Course added to ${category}!`);

    dispatch({
      type: 'SET',
      payload: {
        [listKey]: [...state[listKey], course],
        [creditsKey]: state[creditsKey] + (course.credits || 0),
      },
    });
  };

  const removeCourse = (course, category) => {
    const listKey = `${category}Courses`;
    const creditsKey = `${category}Credits`;

    notifySuccess(`Course removed from ${category}!`);

    dispatch({
      type: 'SET',
      payload: {
        [listKey]: state[listKey].filter((c) => c.code !== course.code),
        [creditsKey]: state[creditsKey] - (course.credits || 0),
      },
    });
  };

  // ---------------- Semesters ----------------
  const addSemester = (id, name) => {
    if (state.semesters.some((s) => s.id === id)) {
      notifyInfo(`Semester ${name} is already added.`);
      return;
    }
    notifySuccess(`Semester ${name} added.`);

    dispatch({
      type: 'SET',
      payload: {
        semesters: [...state.semesters, { id, name }].sort(compareSemesters),
        semesterCourses: state.semesterCourses[id] ? state.semesterCourses : { ...state.semesterCourses, [id]: [] },
        hasUnsavedChanges: true,
        isModalOpen: false,
      },
    });
  };

  const removeSemester = (id) => {
    notifySuccess(`Semester removed.`);
    dispatch({
      type: 'SET',
      payload: {
        semesters: state.semesters.filter((s) => s.id !== id),
        semesterCourses: Object.fromEntries(Object.entries(state.semesterCourses).filter(([key]) => key !== id)),
        hasUnsavedChanges: true,
      },
    });
  };

  return {
    addCourse,
    removeCourse,
    addSemester,
    removeSemester,
  };
};
