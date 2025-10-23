// RemoveButton.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RemoveButton } from '../../components/RemoveButton';

describe('RemoveButton', () => {
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders button with default (unselected) state', () => {
    render(<RemoveButton isSelected={false} onRemove={mockOnRemove} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    // Check for unselected class
    expect(button).not.toHaveClass('selected');

    // Check for svg with white fill
    const rect = button.querySelector('rect');
    expect(rect).toHaveAttribute('fill', 'white');
  });

  test('renders button with selected state', () => {
    render(<RemoveButton isSelected={true} onRemove={mockOnRemove} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('selected');

    const rect = button.querySelector('rect');
    expect(rect).toHaveAttribute('fill', '#912338');
  });

  test('calls onRemove when clicked', () => {
    render(<RemoveButton isSelected={false} onRemove={mockOnRemove} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockOnRemove).toHaveBeenCalledTimes(1);
  });
});
