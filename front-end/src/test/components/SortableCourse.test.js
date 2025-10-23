// SortableCourse.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SortableCourse } from '../../components/SortableCourse';

// Mock useSortable from @dnd-kit/sortable
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: '',
    isDragging: false,
  }),
}));

describe('SortableCourse', () => {
  const mockOnSelect = jest.fn();

  const defaultProps = {
    internalId: '1',
    courseCode: 'COMP248',
    disabled: false,
    isSelected: false,
    isDraggingFromSemester: false,
    onSelect: mockOnSelect,
    containerId: 'semester1',
    prerequisitesMet: true,
    isOffered: true,
    removeButton: null,
  };

  test('renders course code', () => {
    render(<SortableCourse {...defaultProps} />);
    expect(screen.getByText('COMP248')).toBeInTheDocument();
  });

  test('calls onSelect when clicked', () => {
    render(<SortableCourse {...defaultProps} />);
    fireEvent.click(screen.getByText('COMP248'));
    expect(mockOnSelect).toHaveBeenCalledWith('COMP248');
  });

  test('shows warning if prerequisites not met', () => {
    render(<SortableCourse {...defaultProps} prerequisitesMet={false} />);
    expect(screen.getByText(/Prerequisites not met/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Warning/)).toBeInTheDocument();
  });

  test('shows warning if course not offered', () => {
    render(<SortableCourse {...defaultProps} isOffered={false} />);
    expect(screen.getByText(/Not offered in this term/i)).toBeInTheDocument();
  });

  test('shows combined warning if both false', () => {
    render(<SortableCourse {...defaultProps} prerequisitesMet={false} isOffered={false} />);
    expect(screen.getByText(/Prerequisites not met, Not offered in this term/i)).toBeInTheDocument();
  });
});
