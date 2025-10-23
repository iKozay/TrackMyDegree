// DeleteModal.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteModal from '../../components/DeleteModal';
import { X } from 'react-feather';

describe('DeleteModal', () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders children when open is true', () => {
    render(
      <DeleteModal open={true} onClose={onCloseMock}>
        <div data-testid="modal-content">Hello Modal</div>
      </DeleteModal>,
    );

    expect(screen.getByTestId('modal-content')).toBeInTheDocument();
    expect(screen.getByText('Hello Modal')).toBeInTheDocument();
  });

  test('does not render content when open is false (overlay still exists but invisible)', () => {
    render(
      <DeleteModal open={false} onClose={onCloseMock}>
        <div data-testid="modal-content">Hello Modal</div>
      </DeleteModal>,
    );

    const content = screen.getByTestId('modal-content');
    expect(content).toBeInTheDocument();
    // modal should have tw-invisible class
    expect(content.parentElement.parentElement).toHaveClass('tw-invisible');
  });

  test('calls onClose when overlay is clicked', () => {
    render(
      <DeleteModal open={true} onClose={onCloseMock}>
        <div>Modal</div>
      </DeleteModal>,
    );

    const overlay = screen.getByText('Modal').parentElement.parentElement;
    fireEvent.click(overlay);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close button is clicked', () => {
    render(
      <DeleteModal open={true} onClose={onCloseMock}>
        <div>Modal</div>
      </DeleteModal>,
    );

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  test('click inside modal content does not trigger onClose', () => {
    render(
      <DeleteModal open={true} onClose={onCloseMock}>
        <div data-testid="modal-inner">Inner Content</div>
      </DeleteModal>,
    );

    const innerContent = screen.getByTestId('modal-inner');
    fireEvent.click(innerContent);
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
