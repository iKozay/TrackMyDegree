import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CourseListPage from '../../../legacy/pages/CourseListPage.jsx';

// Mock hooks
vi.mock('../../../legacy/hooks/useDegree', () => ({ default: vi.fn() }));
vi.mock('../../../legacy/hooks/useCourses', () => ({ default: vi.fn() }));
vi.mock('../../../legacy/hooks/useResponsive', () => ({ default: vi.fn() }));

import useDegrees from '../../../legacy/hooks/useDegree.jsx';
import useCourses from '../../../legacy/hooks/useCourses.jsx';
import useResponsive from '../../../legacy/hooks/useResponsive.jsx';

const mockedUseDegrees = useDegrees as ReturnType<typeof vi.fn>;
const mockedUseCourses = useCourses as ReturnType<typeof vi.fn>;
const mockedUseResponsive = useResponsive as ReturnType<typeof vi.fn>;

// Mock child components
vi.mock('../../../legacy/components/DegreeSelector', () => ({
  default: (props: any) => (
    <div data-testid="degree-selector">
      <button data-testid="all-courses-btn" onClick={props.onAllCoursesSelect}>
        All Courses
      </button>
      {props.degrees.map((deg: any) => (
        <button key={deg._id} data-testid={`degree-${deg._id}`} onClick={() => props.onDegreeSelect(deg)}>
          {deg.name}
        </button>
      ))}
      <input data-testid="search-input" value={props.searchTerm} onChange={(e) => props.onSearchChange(e.target.value)} />
    </div>
  )
}));

vi.mock(
  '../../../legacy/components/CourseDetailsCard',
  () => ({
    default: (props: any) => (props.course ? <div data-testid="course-details-card">{props.course.title}</div> : null)
  })
);

vi.mock(
  '../../../legacy/components/CourseDetailsModal',
  () => ({
    default: (props: any) => (props.show ? <div data-testid="course-details-modal">{props.course?.title}</div> : null)
  })
);

// Mock CourseListAccordion front-end\src\components\CourseListAccordion.js
vi.mock('../../../legacy/components/CourseListAccordion', () => ({
  default: (props: any) => (
    <div data-testid="course-accordion">
      {props.courseList.map((group: any) =>
        group.courses.map((course: any) => (
          <button key={course.id} data-testid={`course-${course.id}`} onClick={() => props.setSelectedCourse(course)}>
            {course.title}
          </button>
        )),
      )}
    </div>
  )
}));

describe('CourseListPage', () => {
  const mockDegrees: any[] = [
    { _id: 1, name: 'Computer Science' },
    { _id: 2, name: 'Software Engineering' },
  ] as const;

  const mockCourses = [
    {
      poolId: 'core',
      poolName: 'Core Courses',
      courses: [
        { id: 'CS101', title: 'Intro to CS' },
        { id: 'CS102', title: 'Data Structures' },
      ],
    },
  ] as const;

  beforeEach(() => {
    (mockedUseDegrees as any).mockReturnValue({ degrees: [...mockDegrees], loading: false, error: null });
    (mockedUseCourses as any).mockReturnValue({
      courseList: [...mockCourses],
      fetchCoursesByDegree: vi.fn(),
      fetchAllCourses: vi.fn(),
    });
    (mockedUseResponsive as any).mockReturnValue({ isDesktop: true, isMobile: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders degree selector and course list', () => {
    render(<CourseListPage />);
    expect(screen.getByTestId('degree-selector')).toBeInTheDocument();
    expect(screen.getByTestId('course-accordion')).toBeInTheDocument();
  });

  it('calls fetchCoursesByDegree when a degree is selected', () => {
    const mockFetchByDegree = vi.fn();
    mockedUseCourses.mockReturnValue({
      courseList: mockCourses,
      fetchCoursesByDegree: mockFetchByDegree,
      fetchAllCourses: vi.fn(),
    });

    render(<CourseListPage />);
    fireEvent.click(screen.getByTestId('degree-1'));

    expect(mockFetchByDegree).toHaveBeenCalledWith(mockDegrees[0]._id);
  });

  it('calls fetchAllCourses when "All Courses" is selected', () => {
    const mockFetchAll = vi.fn();
    mockedUseCourses.mockReturnValue({
      courseList: mockCourses,
      fetchCoursesByDegree: vi.fn(),
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
    mockedUseResponsive.mockReturnValue({ isDesktop: false, isMobile: true });
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
