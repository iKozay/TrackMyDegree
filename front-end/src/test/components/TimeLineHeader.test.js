// TimelineHeader.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineHeader } from '../../components/TimeLineHeader';

describe('TimelineHeader', () => {
  const mockAddSemester = jest.fn();

  test('renders timeline name', () => {
    render(<TimelineHeader timelineName="Fall 2025" addButtonText="Add Semester" onAddSemester={mockAddSemester} />);
    expect(screen.getByText('Fall 2025')).toBeInTheDocument();
  });

  test('renders default name if timelineName is null', () => {
    render(<TimelineHeader timelineName="null" addButtonText="Add Semester" onAddSemester={mockAddSemester} />);
    expect(screen.getByText('My Timeline')).toBeInTheDocument();
  });

  test('calls onAddSemester when button is clicked', () => {
    render(<TimelineHeader timelineName="Fall 2025" addButtonText="Add Semester" onAddSemester={mockAddSemester} />);
    const button = screen.getByText('Add Semester');
    fireEvent.click(button);
    expect(mockAddSemester).toHaveBeenCalledTimes(1);
  });
});
