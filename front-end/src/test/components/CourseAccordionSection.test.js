import React from 'react';
import { render, screen } from '@testing-library/react';
import CourseAccordionSection from '../../components/CourseAccordionSection';

// Mock child components to avoid testing them here
jest.mock('../../components/DraggableCourse', () => ({
  DraggableCourse: ({ courseCode }) => <div data-testid="draggable">{courseCode}</div>,
}));
jest.mock('../../components/RemoveButton', () => ({
  RemoveButton: () => <div data-testid="remove-btn" />,
}));

test('renders visible courses matching search query', () => {
  const mockCourses = [{ _id: 'COMP248' }, { _id: 'COMP249' }, { _id: 'SOEN287' }];

  const mockProps = {
    eventKey: '1',
    title: 'Core Courses',
    courses: mockCourses,
    containerId: 'core',
    searchQuery: '248',
    selectedCourse: null,
    returning: false,
    isCourseAssigned: jest.fn(() => false),
    onSelect: jest.fn(),
    onRemoveCourse: jest.fn(),
  };

  render(<CourseAccordionSection {...mockProps} />);

  // Should only render matching course
  expect(screen.getByText('COMP248')).toBeInTheDocument();
  expect(screen.queryByText('COMP249')).not.toBeInTheDocument();
  expect(screen.queryByText('SOEN287')).not.toBeInTheDocument();
});

test('returns null when no courses match search query', () => {
  const mockCourses = [{ _id: 'COMP248' }];

  const mockProps = {
    eventKey: '1',
    title: 'Core Courses',
    courses: mockCourses,
    containerId: 'core',
    searchQuery: 'MATH',
    selectedCourse: null,
    returning: false,
    isCourseAssigned: jest.fn(() => false),
    onSelect: jest.fn(),
    onRemoveCourse: jest.fn(),
  };

  const { container } = render(<CourseAccordionSection {...mockProps} />);
  expect(container.firstChild).toBeNull();
});
