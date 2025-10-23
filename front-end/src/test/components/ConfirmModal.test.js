import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from '../../components/ConfirmModal';

test('renders ConfirmModal and handles confirm and cancel actions', () => {
  const handleConfirm = jest.fn();
  const handleClose = jest.fn();

  render(
    <ConfirmModal
      open={true}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Delete Item"
      message="Are you sure you want to delete this?"
    />,
  );

  // Renders title and message
  expect(screen.getByText('Delete Item')).toBeInTheDocument();
  expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument();

  // Click confirm
  fireEvent.click(screen.getByText('Confirm'));
  expect(handleConfirm).toHaveBeenCalled();

  // Click cancel
  fireEvent.click(screen.getByText('Cancel'));
  expect(handleClose).toHaveBeenCalled();
});
