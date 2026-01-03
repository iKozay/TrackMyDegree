import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import InstructionsModal from '../../components/InstructionModal';

// Mock the images to avoid errors in tests
vi.mock('../../images/Print_image.png', () => ({
  default: 'Print_image.png',
}));

vi.mock('../../images/Pdf_image.png', () => ({
  default: 'Pdf_image.png',
}));

vi.mock('../../images/Transc_image.png', () => ({
  default: 'Transc_image.png',
}));

describe('InstructionModal', () => {
  it('renders nothing when isOpen is false', () => {
    const toggleModal = vi.fn();
    const { container } = render(<InstructionsModal isOpen={false} toggleModal={toggleModal} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders correctly when isOpen is true', () => {
    const toggleModal = vi.fn();
    render(<InstructionsModal isOpen={true} toggleModal={toggleModal} />);

    expect(screen.getByText(/How to Download Your Transcript/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1:/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2:/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 3:/i)).toBeInTheDocument();

    // Check that images are present with correct alt text
    expect(screen.getByAltText('Step 1')).toHaveAttribute('src', 'Transc_image.png');
    expect(screen.getByAltText('Step 2')).toHaveAttribute('src', 'Print_image.png');
    expect(screen.getByAltText('Step 3')).toHaveAttribute('src', 'Pdf_image.png');
  });

  it('calls toggleModal when close button is clicked', () => {
    const toggleModal = vi.fn();
    render(<InstructionsModal isOpen={true} toggleModal={toggleModal} />);

    const closeButton = screen.getByRole('button', { name: 'X' });
    fireEvent.click(closeButton);

    expect(toggleModal).toHaveBeenCalledTimes(1);
  });
});
