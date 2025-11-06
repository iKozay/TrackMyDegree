import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CourseListPage from '../pages/CourseListPage';

// Mock hooks
jest.mock('../pages/CourseListPage/hooks/useDegree', () => jest.fn());
jest.mock('../pages/CourseListPage/hooks/useCourses', () => jest.fn());
jest.mock('../pages/CourseListPage/hooks/useResponsive', () => jest.fn());

import useDegrees from '../pages/CourseListPage/hooks/useDegree';
import useCourses from '../pages/CourseListPage/hooks/useCourses';
import useResponsive from '../pages/CourseListPage/hooks/useResponsive';

// Mock child components
jest.mock('../pages/CourseListPage/components/DegreeSelector', () => (props) => (
  <div data-testid="degree-selector">
    <button data-testid="all-courses-btn" onClick={props.onAllCoursesSelect}>
      All Courses
    </button>
    {props.degrees.map((deg) => (
      <button key={deg.id} data-testid={`degree-${deg.id}`} onClick={() => props.onDegreeSelect(deg)}>
        {deg.name}
      </button>
    ))}
    <input data-testid="search-input" value={props.searchTerm} onChange={(e) => props.onSearchChange(e.target.value)} />
  </div>
));

jest.mock(
  '../pages/CourseListPage/components/CourseDetailsCard',
  () => (props) => (props.course ? <div data-testid="course-details-card">{props.course.title}</div> : null),
);

jest.mock(
  '../pages/CourseListPage/components/CourseDetailsModal',
  () => (props) => (props.show ? <div data-testid="course-details-modal">{props.course?.title}</div> : null),
);

// Mock CourseListAccordion front-end\src\components\CourseListAccordion.js
jest.mock('../components/CourseListAccordion', () => (props) => (
  <div data-testid="course-accordion">
    {props.courseList.map((group) =>
      group.courses.map((course) => (
        <button key={course.id} data-testid={`course-${course.id}`} onClick={() => props.setSelectedCourse(course)}>
          {course.title}
        </button>
      )),
    )}
  </div>
));

describe('CourseListPage', () => {
  const mockDegrees = [
    { id: 1, name: 'Computer Science' },
    { id: 2, name: 'Software Engineering' },
  ];

  const mockCourses = [
    {
      poolId: 'core',
      poolName: 'Core Courses',
      courses: [
        { id: 'CS101', title: 'Intro to CS' },
        { id: 'CS102', title: 'Data Structures' },
      ],
    },
  ];

  beforeEach(() => {
    useDegrees.mockReturnValue({ degrees: mockDegrees, loading: false, error: null });
    useCourses.mockReturnValue({
      courseList: mockCourses,
      fetchCoursesByDegree: jest.fn(),
      fetchAllCourses: jest.fn(),
    });
    useResponsive.mockReturnValue({ isDesktop: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders degree selector and course list', () => {
    render(<CourseListPage />);
    expect(screen.getByTestId('degree-selector')).toBeInTheDocument();
    expect(screen.getByTestId('course-accordion')).toBeInTheDocument();
  });

  it('calls fetchCoursesByDegree when a degree is selected', () => {
    const mockFetchByDegree = jest.fn();
    useCourses.mockReturnValue({
      courseList: mockCourses,
      fetchCoursesByDegree: mockFetchByDegree,
      fetchAllCourses: jest.fn(),
    });

    render(<CourseListPage />);
    fireEvent.click(screen.getByTestId('degree-1'));

    expect(mockFetchByDegree).toHaveBeenCalledWith(1);
  });

  it('calls fetchAllCourses when "All Courses" is selected', () => {
    const mockFetchAll = jest.fn();
    useCourses.mockReturnValue({
      courseList: mockCourses,
      fetchCoursesByDegree: jest.fn(),
      fetchAllCourses: mockFetchAll,
    });

    render(<CourseListPage />);
    fireEvent.click(screen.getByTestId('all-courses-btn'));

    expect(mockFetchAll).toHaveBeenCalled();
  });

  it('shows CourseDetailsCard when a course is selected in desktop view', async () => {
    render(<CourseListPage />);
    fireEvent.click(screen.getByTestId('course-CS101'));

    await waitFor(() => expect(screen.getByTestId('course-details-card')).toHaveTextContent('Intro to CS'));
  });

  it('shows CourseDetailsModal when in mobile view', async () => {
    useResponsive.mockReturnValue({ isDesktop: false });
    render(<CourseListPage />);

    fireEvent.click(screen.getByTestId('course-CS101'));

    await waitFor(() => expect(screen.getByTestId('course-details-modal')).toHaveTextContent('Intro to CS'));
  });

  it('filters courses via search input', async () => {
    render(<CourseListPage />);
    const searchInput = screen.getByTestId('search-input');

    fireEvent.change(searchInput, { target: { value: 'Intro' } });

    await waitFor(() => expect(screen.getByTestId('course-accordion')).toBeInTheDocument());
  });
});
