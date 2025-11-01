import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DegreeSelector from '../../pages/CourseListPage/components/DegreeSelector';

describe('DegreeSelector Component', () => {
  const mockDegrees = [{ name: 'Computer Science' }, { name: 'Software Engineering' }];

  const mockHandlers = {
    onDegreeSelect: jest.fn(),
    onAllCoursesSelect: jest.fn(),
    onSearchChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // it('renders heading and dropdown', () => {
  //   render(<DegreeSelector degrees={mockDegrees} selectedDegree="Select Degree" searchTerm="" {...mockHandlers} />);

  //   expect(screen.getByText('Select Degree')).toBeInTheDocument();
  //   expect(screen.getByText('Select Degree')).toBeVisible();
  //   expect(screen.getByText('Select Degree')).toHaveAttribute('data-testid', 'degree-dropdown');
  // });

  it('displays all degrees in dropdown menu', () => {
    render(<DegreeSelector degrees={mockDegrees} selectedDegree="Select Degree" searchTerm="" {...mockHandlers} />);

    // Expand dropdown
    fireEvent.click(screen.getByTestId('degree-dropdown'));

    expect(screen.getByText('All Courses')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getByText('Software Engineering')).toBeInTheDocument();
  });

  it('calls onAllCoursesSelect when "All Courses" is clicked', () => {
    render(<DegreeSelector degrees={mockDegrees} selectedDegree="Select Degree" searchTerm="" {...mockHandlers} />);

    fireEvent.click(screen.getByTestId('degree-dropdown'));
    fireEvent.click(screen.getByText('All Courses'));

    expect(mockHandlers.onAllCoursesSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onDegreeSelect when a degree is clicked', () => {
    render(<DegreeSelector degrees={mockDegrees} selectedDegree="Select Degree" searchTerm="" {...mockHandlers} />);

    fireEvent.click(screen.getByTestId('degree-dropdown'));
    fireEvent.click(screen.getByText('Computer Science'));

    expect(mockHandlers.onDegreeSelect).toHaveBeenCalledWith(mockDegrees[0]);
  });

  it('shows "Loading..." when degrees list is empty', () => {
    render(<DegreeSelector degrees={[]} selectedDegree="Select Degree" searchTerm="" {...mockHandlers} />);

    fireEvent.click(screen.getByTestId('degree-dropdown'));
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders search bar only when a degree is selected', () => {
    const { rerender } = render(
      <DegreeSelector degrees={mockDegrees} selectedDegree="Select Degree" searchTerm="" {...mockHandlers} />,
    );

    // Search bar should NOT appear initially
    expect(screen.queryByPlaceholderText('Search courses, e.g., ENCS 282')).not.toBeInTheDocument();

    // Now select a degree
    rerender(
      <DegreeSelector degrees={mockDegrees} selectedDegree="Computer Science" searchTerm="" {...mockHandlers} />,
    );

    expect(screen.getByPlaceholderText('Search courses, e.g., ENCS 282')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search bar', () => {
    render(<DegreeSelector degrees={mockDegrees} selectedDegree="Computer Science" searchTerm="" {...mockHandlers} />);

    const searchInput = screen.getByPlaceholderText('Search courses, e.g., ENCS 282');
    fireEvent.change(searchInput, { target: { value: 'ENCS 282' } });

    expect(mockHandlers.onSearchChange).toHaveBeenCalledWith('ENCS 282');
  });
});
