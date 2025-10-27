import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseDescription } from '../../components/CourseDescription';

// Mock CourseScheduleModal to isolate the component
jest.mock('../../components/CourseScheduleModal', () => ({
  CourseScheduleModal: () => <div data-testid="mock-modal" />,
}));

const sampleCourse = {
  title: 'COMP 248 - Object-Oriented Programming I',
  credits: 3.5,
  offeredIn: ['Fall', 'Winter'],
  description: 'Introduction to programming using Java.',
  requisites: [
    { type: 'pre', code2: 'MATH 203' },
    { type: 'co', code2: 'COMP 249', group_id: 1 },
    { type: 'co', code2: 'SOEN 228', group_id: 1 },
  ],
};

test('renders course description when selectedCourse is provided', () => {
  render(
    <CourseDescription
      selectedCourse={sampleCourse}
      showCourseDescription={true}
      toggleCourseDescription={jest.fn()}
    />,
  );

  expect(screen.getByText(sampleCourse.title)).toBeInTheDocument();
  expect(screen.getByText('Credits:')).toBeInTheDocument();
  expect(screen.getByText('Offered In:')).toBeInTheDocument();
  expect(screen.getByText('Fall, Winter')).toBeInTheDocument();
  expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
  expect(screen.getByText('Introduction to programming using Java.')).toBeInTheDocument();

  // Check requisites
  expect(screen.getByText('Prerequisites:')).toBeInTheDocument();
  expect(screen.getByText('Corequisites:')).toBeInTheDocument();
  expect(screen.getByText('MATH 203')).toBeInTheDocument();
  expect(screen.getByText('COMP 249 or SOEN 228')).toBeInTheDocument();
});

test('renders fallback text when no selectedCourse is provided', () => {
  render(<CourseDescription selectedCourse={null} showCourseDescription={true} toggleCourseDescription={jest.fn()} />);

  expect(screen.getByText('Drag or click on a course to see its description here.')).toBeInTheDocument();
});

test('toggles description visibility when button clicked', () => {
  const mockToggle = jest.fn();

  render(
    <CourseDescription
      selectedCourse={sampleCourse}
      showCourseDescription={false}
      toggleCourseDescription={mockToggle}
    />,
  );

  const toggleBtn = screen.getByRole('button');
  fireEvent.click(toggleBtn);
  expect(mockToggle).toHaveBeenCalledTimes(1);
});
