// ShareModal.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareModal } from '../../components/ShareModal';

describe('ShareModal', () => {
  const mockOnClose = jest.fn();
  const mockCopyToClipboard = jest.fn();
  const mockCompressTimeline = jest.fn(() => 'compressed-timeline');

  const mockProps = {
    open: true,
    onClose: mockOnClose,
    semesterCourses: [{ code: 'COMP248' }],
    degree_Id: '123',
    credsReq: 6,
    extendedCredit: 0,
    copyToClipboard: mockCopyToClipboard,
    compressTimeline: mockCompressTimeline,
  };

  test('renders modal and URL correctly', () => {
    render(<ShareModal {...mockProps} />);
    expect(screen.getByText(/Share this timeline/i)).toBeInTheDocument();

    const urlText = screen.getByText(/compressed-timeline/);
    expect(urlText).toBeInTheDocument();
    expect(mockCompressTimeline).toHaveBeenCalledWith(
      mockProps.semesterCourses,
      mockProps.degree_Id,
      mockProps.credsReq,
      mockProps.extendedCredit,
    );
  });

  test('calls onClose when clicking close button', () => {
    render(<ShareModal {...mockProps} />);
    fireEvent.click(screen.getByText('✕'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('calls copyToClipboard when clicking the copy button', () => {
    render(<ShareModal {...mockProps} />);
    const button = screen.getByTitle('Copy to clipboard');
    fireEvent.click(button);
    expect(mockCopyToClipboard).toHaveBeenCalled();
  });

  test('does not render when open is false', () => {
    render(<ShareModal {...mockProps} open={false} />);
    expect(screen.queryByText(/Share this timeline/i)).not.toBeInTheDocument();
  });
});
