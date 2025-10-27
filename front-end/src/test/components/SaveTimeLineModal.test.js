// SaveTimelineModal.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SaveTimelineModal } from '../../components/SaveTimeLineModal';

describe('SaveTimelineModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm and window.alert
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  test('does not render when open is false', () => {
    const { container } = render(<SaveTimelineModal open={false} onClose={mockOnClose} onSave={mockOnSave} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders modal when open is true', () => {
    render(<SaveTimelineModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.getByText('Save Timeline')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. My Winter Plan')).toBeInTheDocument();
  });

  test('updates input value', () => {
    render(<SaveTimelineModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText('e.g. My Winter Plan');
    fireEvent.change(input, { target: { value: 'My Plan' } });
    expect(input.value).toBe('My Plan');
  });

  test('calls onSave when valid name entered and Save clicked', () => {
    render(<SaveTimelineModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText('e.g. My Winter Plan');
    fireEvent.change(input, { target: { value: 'My Plan' } });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    expect(mockOnSave).toHaveBeenCalledWith('My Plan');
  });

  test('alerts if input is empty on Save', () => {
    render(<SaveTimelineModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    expect(window.alert).toHaveBeenCalledWith('Please enter a name before saving.');
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  test('calls onClose when close button clicked with empty input', () => {
    render(<SaveTimelineModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('confirms before closing with non-empty input', () => {
    window.confirm.mockReturnValueOnce(true); // user confirms
    render(<SaveTimelineModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText('e.g. My Winter Plan');
    fireEvent.change(input, { target: { value: 'My Plan' } });

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    expect(window.confirm).toHaveBeenCalledWith('You have entered a name. Close without saving?');
    expect(mockOnClose).toHaveBeenCalled();
  });
});
