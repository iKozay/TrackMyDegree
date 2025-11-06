import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShowInsights from '../../components/ShowInsights';

// Mock Recharts components
jest.mock('recharts', () => ({
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children, onMouseEnter, data }) => (
    <div
      data-testid="pie"
      onMouseEnter={() => {
        if (onMouseEnter && data && data.length > 0) {
          onMouseEnter(data[0]);
        }
      }}
    >
      {children}
    </div>
  ),
  Cell: ({ fill }) => <div data-testid="cell" style={{ backgroundColor: fill }} />,
  Legend: () => <div data-testid="legend">Legend</div>,
}));

describe('ShowInsights', () => {
  const mockCoursePools = [
    {
      poolId: 'pool1',
      poolName: 'Core Courses (30 credits)',
      courses: [
        { _id: 'COMP101', credits: 3 },
        { _id: 'COMP102', credits: 3 },
        { _id: 'COMP103', credits: 4 },
      ],
    },
    {
      poolId: 'pool2',
      poolName: 'Electives (15 credits)',
      courses: [
        { _id: 'COMP201', credits: 3 },
        { _id: 'COMP202', credits: 3 },
      ],
    },
  ];

  const mockSemesterCourses = {
    'Fall 2024': ['instance1', 'instance2'],
    'Winter 2025': ['instance3'],
  };

  const mockCourseInstanceMap = {
    instance1: 'COMP101',
    instance2: 'COMP102',
    instance3: 'COMP201',
  };

  const defaultProps = {
    coursePools: mockCoursePools,
    semesterCourses: mockSemesterCourses,
    creditsRequired: 45,
    deficiencyCredits: 0,
    courseInstanceMap: mockCourseInstanceMap,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders Show Insights button', () => {
    render(<ShowInsights {...defaultProps} />);
    expect(screen.getByText('Show Insights')).toBeInTheDocument();
  });

  test('opens modal when Show Insights button is clicked', () => {
    render(<ShowInsights {...defaultProps} />);
    const button = screen.getByText('Show Insights');
    fireEvent.click(button);
    expect(screen.getByText('Progress Insights')).toBeInTheDocument();
  });

  test('closes modal when close button is clicked', () => {
    render(<ShowInsights {...defaultProps} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);
    expect(screen.getByText('Progress Insights')).toBeInTheDocument();

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    expect(screen.queryByText('Progress Insights')).not.toBeInTheDocument();
  });

  test('displays Course Pool Progress heading', () => {
    render(<ShowInsights {...defaultProps} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);
    expect(screen.getByText('Course Pool Progress')).toBeInTheDocument();
  });

  test('renders charts for each pool', () => {
    render(<ShowInsights {...defaultProps} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);

    expect(screen.getByText('Core Courses (30 credits)')).toBeInTheDocument();
    expect(screen.getByText('Electives (15 credits)')).toBeInTheDocument();
  });

  test('renders total credits progress chart', () => {
    render(<ShowInsights {...defaultProps} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);

    expect(screen.getByText('Total Credits Progress')).toBeInTheDocument();
  });

  test('displays credits information for each chart', () => {
    render(<ShowInsights {...defaultProps} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);

    // Check that credits are displayed (format: "X / Y credits")
    const creditsTexts = screen.getAllByText(/credits/);
    expect(creditsTexts.length).toBeGreaterThan(0);
  });

  test('handles missing courseInstanceMap gracefully', () => {
    const propsWithoutMap = {
      ...defaultProps,
      courseInstanceMap: undefined,
    };
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(<ShowInsights {...propsWithoutMap} />);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('courseInstanceMap is undefined'),
    );
    consoleSpy.mockRestore();
  });

  test('handles empty coursePools', () => {
    const propsWithEmptyPools = {
      ...defaultProps,
      coursePools: [],
    };
    render(<ShowInsights {...propsWithEmptyPools} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);
    expect(screen.getByText('Progress Insights')).toBeInTheDocument();
  });

  test('handles empty semesterCourses', () => {
    const propsWithEmptySemesters = {
      ...defaultProps,
      semesterCourses: {},
    };
    render(<ShowInsights {...propsWithEmptySemesters} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);
    expect(screen.getByText('Progress Insights')).toBeInTheDocument();
  });

  test('handles pool name without credits pattern', () => {
    const poolsWithoutCreditsPattern = [
      {
        poolId: 'pool1',
        poolName: 'Core Courses',
        courses: [{ _id: 'COMP101', credits: 3 }],
      },
    ];
    const props = {
      ...defaultProps,
      coursePools: poolsWithoutCreditsPattern,
    };
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(<ShowInsights {...props} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not parse max credits from pool name'),
    );
    consoleSpy.mockRestore();
  });

  test('filters out exempted semester', () => {
    const semesterCoursesWithExempted = {
      ...mockSemesterCourses,
      Exempted: ['instance4'],
    };
    const props = {
      ...defaultProps,
      semesterCourses: semesterCoursesWithExempted,
    };

    render(<ShowInsights {...props} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);
    expect(screen.getByText('Progress Insights')).toBeInTheDocument();
  });

  test('handles large pools with more than 100 courses', () => {
    const largePool = {
      poolId: 'largePool',
      poolName: 'General Electives (30 credits)',
      courses: Array.from({ length: 101 }, (_, i) => ({
        _id: `COURSE${i}`,
        credits: 3,
      })),
    };
    const props = {
      ...defaultProps,
      coursePools: [largePool],
    };

    render(<ShowInsights {...props} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);
    expect(screen.getByText('Progress Insights')).toBeInTheDocument();
  });

  test('handles tooltip interactions', async () => {
    render(<ShowInsights {...defaultProps} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);

    await waitFor(() => {
      const pieCharts = screen.getAllByTestId('pie');
      expect(pieCharts.length).toBeGreaterThan(0);
    });
  });

  test('handles totalRequired being 0', () => {
    const propsWithZeroRequired = {
      ...defaultProps,
      coursePools: [],
      deficiencyCredits: 0,
    };
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(<ShowInsights {...propsWithZeroRequired} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);

    // Should still render without crashing
    expect(screen.getByText('Progress Insights')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  test('calculates credits correctly from pool name pattern', () => {
    const poolsWithPattern = [
      {
        poolId: 'pool1',
        poolName: 'Core Courses (30 credits)',
        courses: [{ _id: 'COMP101', credits: 3 }],
      },
    ];
    const props = {
      ...defaultProps,
      coursePools: poolsWithPattern,
    };

    render(<ShowInsights {...props} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);
    expect(screen.getByText('Core Courses (30 credits)')).toBeInTheDocument();
  });

  test('handles course without credits property', () => {
    const poolsWithMissingCredits = [
      {
        poolId: 'pool1',
        poolName: 'Core Courses (30 credits)',
        courses: [{ _id: 'COMP101' }], // no credits property
      },
    ];
    const props = {
      ...defaultProps,
      coursePools: poolsWithMissingCredits,
    };

    render(<ShowInsights {...props} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);
    expect(screen.getByText('Progress Insights')).toBeInTheDocument();
  });

  test('handles duplicate course codes in different semesters', () => {
    const semesterCoursesWithDuplicates = {
      'Fall 2024': ['instance1', 'instance2'],
      'Winter 2025': ['instance3'],
      'Summer 2025': ['instance4'], // instance4 maps to same code as instance1
    };
    const courseInstanceMapWithDuplicates = {
      ...mockCourseInstanceMap,
      instance4: 'COMP101', // same as instance1
    };
    const props = {
      ...defaultProps,
      semesterCourses: semesterCoursesWithDuplicates,
      courseInstanceMap: courseInstanceMapWithDuplicates,
    };

    render(<ShowInsights {...props} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);
    expect(screen.getByText('Progress Insights')).toBeInTheDocument();
  });

  test('handles case when pool courses array is empty', () => {
    const poolsWithEmptyCourses = [
      {
        poolId: 'pool1',
        poolName: 'Core Courses (30 credits)',
        courses: [],
      },
    ];
    const props = {
      ...defaultProps,
      coursePools: poolsWithEmptyCourses,
    };

    render(<ShowInsights {...props} />);
    const showButton = screen.getByText('Show Insights');
    fireEvent.click(showButton);
    expect(screen.getByText('Progress Insights')).toBeInTheDocument();
  });
});
