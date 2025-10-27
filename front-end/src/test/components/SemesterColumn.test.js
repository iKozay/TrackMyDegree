// SemesterColumn.minimal.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SemesterColumn } from '../../components/SemesterColumn';

// Mock children components
jest.mock('../../components/CourseItem', () => ({
  CourseItem: ({ course }) => <div>{course.code}</div>,
}));

jest.mock('../../components/SemesterFooter', () => ({
  SemesterFooter: () => <div>Footer</div>,
}));

jest.mock('../../components/Droppable', () => ({
  Droppable: ({ children }) => <div>{children}</div>,
}));

describe('SemesterColumn (minimal test)', () => {
  const mockCourses = [
    { code: 'COMP248', credits: 3 },
    { code: 'MATH203', credits: 3 },
  ];
  const mockAllCourses = [...mockCourses];
  const mockCourseInstanceMap = { 1: 'COMP248', 2: 'MATH203' };

  const noop = () => {};

  test('renders semester name and courses', () => {
    render(
      <SemesterColumn
        semesterName="Fall 2025"
        courses={['1', '2']}
        courseInstanceMap={mockCourseInstanceMap}
        allCourses={mockAllCourses}
        selectedCourse={null}
        activeId={null}
        handleCourseSelect={noop}
        handleReturn={noop}
        firstOccurrence={{ COMP248: 0, MATH203: 0 }}
        coursePools={[]}
        remainingCourses={[]}
        getMaxCreditsForSemesterName={() => 6}
        handleRemoveSemester={noop}
        arePrerequisitesMet={() => true}
        isCourseOfferedInSemester={() => true}
        index={0}
        shakingSemesterId={null}
      />,
    );

    // Check semester name
    expect(screen.getByText('Fall 2025')).toBeInTheDocument();

    // Check course codes (mocked)
    expect(screen.getByText('COMP248')).toBeInTheDocument();
    expect(screen.getByText('MATH203')).toBeInTheDocument();

    // Check footer
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
