// SemesterColumn.js
import React from 'react';
import { Droppable } from './Droppable';
import { CourseItem } from './CourseItem';
import { SemesterFooter } from './SemesterFooter';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export const SemesterColumn = ({
  semesterName,
  courses,
  courseInstanceMap,
  allCourses,
  selectedCourse,
  activeId,
  handleCourseSelect,
  handleReturn,
  firstOccurrence,
  coursePools,
  remainingCourses,
  getMaxCreditsForSemesterName,
  handleRemoveSemester,
  arePrerequisitesMet,
  isCourseOfferedInSemester,
  index,
  shakingSemesterId,
}) => {
  console.log('Rendering SemesterColumn:', index, courses);
  const isExempted = semesterName.trim().toLowerCase().startsWith('exempted');
  const sumCredits = courses
    .map((instanceId) => {
      const genericCode = courseInstanceMap[instanceId] || instanceId;
      if (index !== firstOccurrence[genericCode]) return 0;
      const courseInPool = coursePools.flatMap((pool) => pool.courses).find((c) => c.code === genericCode);
      const courseInRemaining = remainingCourses.find((c) => c.code === genericCode);
      const course = courseInPool || courseInRemaining;
      return course ? course.credits : 0;
    })
    .reduce((sum, c) => sum + c, 0);

  const maxAllowed = getMaxCreditsForSemesterName(semesterName);
  const isOver = sumCredits > maxAllowed;

  return (
    <div
      className={`semester ${isExempted ? 'hidden-accordion' : ''} ${shakingSemesterId === semesterName ? 'exceeding-credit-limit' : ''}`}
    >
      <Droppable id={semesterName} color="pink">
        <h3>{semesterName}</h3>
        <SortableContext items={courses} strategy={verticalListSortingStrategy}>
          {courses.map((instanceId) => {
            const genericCode = courseInstanceMap[instanceId] || instanceId;
            const course = allCourses.find((c) => c.code === genericCode);
            if (!course) return null;
            const prerequisitesMet = arePrerequisitesMet(course.code, index);
            const offeredCheck = isCourseOfferedInSemester(course, semesterName);
            return (
              <CourseItem
                key={instanceId}
                course={course}
                instanceId={instanceId}
                selectedCourse={selectedCourse}
                activeId={activeId}
                onSelect={handleCourseSelect}
                handleReturn={handleReturn}
                containerId={semesterName}
                prerequisitesMet={prerequisitesMet}
                isOffered={offeredCheck}
              />
            );
          })}
        </SortableContext>
        <SemesterFooter
          sumCredits={sumCredits}
          maxAllowed={maxAllowed}
          isOver={isOver}
          onRemoveSemester={handleRemoveSemester}
          semesterName={semesterName}
        />
      </Droppable>
    </div>
  );
};
