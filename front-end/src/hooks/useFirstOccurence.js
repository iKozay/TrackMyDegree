import { useMemo } from 'react';

export const useFirstOccurrence = (semesters, semesterCourses, courseInstanceMap) => {
  // Compute once unless the dependencies change
  const firstOccurrence = useMemo(() => {
    const result = {};
    semesters.forEach((sem, index) => {
      if (sem.id.toLowerCase() === 'exempted') return;
      const courseInstances = semesterCourses[sem.id] || [];
      courseInstances.forEach((instanceId) => {
        const genericCode = courseInstanceMap[instanceId] || instanceId;
        if (result[genericCode] === undefined) {
          result[genericCode] = index;
        }
      });
    });
    return result;
  }, [semesters, semesterCourses, courseInstanceMap]);

  return firstOccurrence;
};
