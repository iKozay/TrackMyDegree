import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseItem } from '../../components/CourseItem';

// Mock the SortableCourse and RemoveButton components
jest.mock('../../components/SortableCourse', () => ({
  SortableCourse: ({ courseCode, isSelected, removeButton, onSelect }) => (
    <div data-testid="sortable-course">
      <span>{courseCode}</span>
      <span data-testid="is-selected">{String(isSelected)}</span>
      <button data-testid="select-btn" onClick={() => onSelect(courseCode)}>
        Select
      </button>
      {removeButton}
    </div>
  ),
}));

jest.mock('../../components/RemoveButton', () => ({
  RemoveButton: ({ onRemove }) => (
    <button data-testid="remove-btn" onClick={onRemove}>
      Remove
    </button>
  ),
}));

describe('CourseItem', () => {
  const mockSelect = jest.fn();
  const mockReturn = jest.fn();
  const sampleCourse = { _id: 'COMP248' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with correct course code and props', () => {
    render(
      <CourseItem
        course={sampleCourse}
        instanceId="1"
        selectedCourse={sampleCourse}
        activeId="2"
        onSelect={mockSelect}
        handleReturn={mockReturn}
        containerId="container1"
        prerequisitesMet={true}
        isOffered={true}
      />,
    );

    expect(screen.getByText('COMP248')).toBeInTheDocument();
    expect(screen.getByTestId('is-selected').textContent).toBe('true');
    expect(screen.getByTestId('remove-btn')).toBeInTheDocument();
  });

  test('calls onSelect when select button is clicked', () => {
    render(
      <CourseItem
        course={sampleCourse}
        instanceId="1"
        selectedCourse={{ _id: 'OTHER' }}
        activeId="2"
        onSelect={mockSelect}
        handleReturn={mockReturn}
        containerId="container1"
        prerequisitesMet={true}
        isOffered={true}
      />,
    );

    fireEvent.click(screen.getByTestId('select-btn'));
    expect(mockSelect).toHaveBeenCalledWith('COMP248');
  });

  test('calls handleReturn when remove button is clicked', () => {
    render(
      <CourseItem
        course={sampleCourse}
        instanceId="1"
        selectedCourse={null}
        activeId="1"
        onSelect={mockSelect}
        handleReturn={mockReturn}
        containerId="container1"
        prerequisitesMet={false}
        isOffered={false}
      />,
    );

    fireEvent.click(screen.getByTestId('remove-btn'));
    expect(mockReturn).toHaveBeenCalledWith('1');
  });
});
