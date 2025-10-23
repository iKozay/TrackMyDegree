// SemesterFooter.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SemesterFooter } from '../../components/SemesterFooter';

// Mock TrashButton to avoid extra dependencies
jest.mock('../../components/TrashButton', () => ({
  TrashButton: ({ onTrash, id }) => <button onClick={() => onTrash(id)}>Trash</button>,
}));

describe('SemesterFooter', () => {
  test('renders total credits correctly when under limit', () => {
    render(
      <SemesterFooter
        sumCredits={5}
        maxAllowed={6}
        isOver={false}
        onRemoveSemester={() => {}}
        semesterName="Fall 2025"
      />,
    );

    expect(screen.getByText(/Total Credit: 5/)).toBeInTheDocument();
    expect(screen.queryByText(/Over the credit limit/)).not.toBeInTheDocument();
  });

  test('renders over-limit warning when credits exceed maxAllowed', () => {
    render(
      <SemesterFooter
        sumCredits={7}
        maxAllowed={6}
        isOver={true}
        onRemoveSemester={() => {}}
        semesterName="Fall 2025"
      />,
    );

    expect(screen.getByText(/Total Credit: 7/)).toBeInTheDocument();
    expect(screen.getByText(/Over the credit limit 6/)).toBeInTheDocument();
  });

  test('calls onRemoveSemester when TrashButton is clicked', () => {
    const mockRemove = jest.fn();
    render(
      <SemesterFooter
        sumCredits={5}
        maxAllowed={6}
        isOver={false}
        onRemoveSemester={mockRemove}
        semesterName="Fall 2025"
      />,
    );

    fireEvent.click(screen.getByText('Trash'));
    expect(mockRemove).toHaveBeenCalledWith('Fall 2025');
  });
});
