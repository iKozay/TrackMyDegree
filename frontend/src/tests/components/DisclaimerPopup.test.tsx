import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DisclaimerPopup } from '../../components/DisclaimerPopup';

describe('DisclaimerPopup', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(
        <DisclaimerPopup show={false} onClose={mockOnClose} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when show is true', () => {
      render(<DisclaimerPopup show={true} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Important Disclaimer')).toBeInTheDocument();
    });

    it('should render all required elements', () => {
      render(<DisclaimerPopup show={true} onClose={mockOnClose} />);
      
      // Check main elements
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('document')).toBeInTheDocument();
      expect(screen.getByText('Important Disclaimer')).toBeInTheDocument();
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
      expect(screen.getByText('I Understand')).toBeInTheDocument();
      
      // Check disclaimer content
      expect(screen.getByText(/TrackMyDegree🎓 can make mistakes/)).toBeInTheDocument();
      expect(screen.getByText(/not affiliated with Concordia University/)).toBeInTheDocument();
      expect(screen.getByText(/Do not rely solely on this tool/)).toBeInTheDocument();
      expect(screen.getByText(/Always consult with academic advisors/)).toBeInTheDocument();
    });

  describe('Interaction', () => {
    it('should call onClose when clicking the overlay', () => {
      render(<DisclaimerPopup show={true} onClose={mockOnClose} />);
      
      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking the close button', () => {
      render(<DisclaimerPopup show={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking the "I Understand" button', () => {
      render(<DisclaimerPopup show={true} onClose={mockOnClose} />);
      
      const understandButton = screen.getByText('I Understand');
      fireEvent.click(understandButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking the modal content', () => {
      render(<DisclaimerPopup show={true} onClose={mockOnClose} />);
      
      const modalContent = screen.getByRole('document');
      fireEvent.click(modalContent);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when pressing Escape on the overlay', () => {
      render(<DisclaimerPopup show={true} onClose={mockOnClose} />);
      
      const overlay = screen.getByRole('dialog');
      fireEvent.keyDown(overlay, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when pressing Escape on the modal content', () => {
      render(<DisclaimerPopup show={true} onClose={mockOnClose} />);
      
      const modalContent = screen.getByRole('document');
      fireEvent.keyDown(modalContent, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not call onClose when pressing other keys', () => {
      render(<DisclaimerPopup show={true} onClose={mockOnClose} />);
      
      const overlay = screen.getByRole('dialog');
      fireEvent.keyDown(overlay, { key: 'Enter' });
      fireEvent.keyDown(overlay, { key: 'Space' });
      fireEvent.keyDown(overlay, { key: 'Tab' });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
  });
});