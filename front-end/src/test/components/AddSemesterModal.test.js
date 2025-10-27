// src/test/components/AddSemesterModal.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddSemesterModal } from '../../components/AddSemesterModal';

test('renders AddSemesterModal and handles interactions', () => {
  const handleAddSemester = jest.fn();
  const onClose = jest.fn();

  render(<AddSemesterModal onClose={onClose} handleAddSemester={handleAddSemester} />);

  // Check modal text
  expect(screen.getByText(/Add a semester/i)).toBeInTheDocument();

  // Click "Add new semester"
  fireEvent.click(screen.getByText(/Add new semester/i));
  expect(handleAddSemester).toHaveBeenCalledTimes(1);

  // Click close button
  fireEvent.click(screen.getByText('✕'));
  expect(onClose).toHaveBeenCalledWith(false);
});

test('returns null if onClose is not provided', () => {
  const { container } = render(<AddSemesterModal handleAddSemester={() => {}} />);
  expect(container.firstChild).toBeNull();
});
