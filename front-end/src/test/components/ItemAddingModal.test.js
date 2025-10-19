// ItemAddingModal.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemAddingModal } from '../../components/ItemAddingModal';

describe('ItemAddingModal', () => {
  const mockCourses = [{ code: 'COMP248' }, { code: 'MATH203' }, { code: 'ENGR201' }];
  const mockOnClose = jest.fn();
  const mockOnAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders modal with title and courses', () => {
    render(<ItemAddingModal title="Add Course" allCourses={mockCourses} onClose={mockOnClose} onAdd={mockOnAdd} />);

    expect(screen.getByText('Add Course')).toBeInTheDocument();
    expect(screen.getByText('COMP248')).toBeInTheDocument();
    expect(screen.getByText('MATH203')).toBeInTheDocument();
    expect(screen.getByText('ENGR201')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(<ItemAddingModal title="Add Course" allCourses={mockCourses} onClose={mockOnClose} onAdd={mockOnAdd} />);

    fireEvent.click(screen.getByText('✕'));
    expect(mockOnClose).toHaveBeenCalledWith(false);
  });

  test('filters courses based on search input', () => {
    render(<ItemAddingModal title="Add Course" allCourses={mockCourses} onClose={mockOnClose} onAdd={mockOnAdd} />);

    fireEvent.change(screen.getByPlaceholderText('Search courses...'), { target: { value: 'math' } });
    expect(screen.queryByText('COMP248')).toBeNull();
    expect(screen.getByText('MATH203')).toBeInTheDocument();
  });

  test('calls onAdd when add button is clicked', () => {
    render(<ItemAddingModal title="Add Course" allCourses={mockCourses} onClose={mockOnClose} onAdd={mockOnAdd} />);

    fireEvent.click(screen.getAllByText('+')[0]);
    expect(mockOnAdd).toHaveBeenCalledWith(mockCourses[0]);
  });
});
