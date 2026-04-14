import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import InstructionsModal from '../../components/InstructionModal';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../styles/components/InstructionModal.css', () => ({}));

vi.mock('../../images/Print_image.png', () => ({ default: 'print.png' }));
vi.mock('../../images/Pdf_image.png', () => ({ default: 'pdf.png' }));
vi.mock('../../images/Transc_image.png', () => ({ default: 'transc.png' }));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toggleModal = vi.fn();

const renderOpen = () =>
  render(<InstructionsModal isOpen={true} toggleModal={toggleModal} />);

//Tests 

describe('InstructionsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  //  Visibility 

  it('renders nothing when isOpen is false', () => {
    render(<InstructionsModal isOpen={false} toggleModal={toggleModal} />);
    expect(screen.queryByText('Download Your Transcript')).not.toBeInTheDocument();
  });

  it('renders the modal when isOpen is true', () => {
    renderOpen();
    expect(screen.getByText('Download Your Transcript')).toBeInTheDocument();
  });

  it('renders the Guide label', () => {
    renderOpen();
    expect(screen.getByText('Guide')).toBeInTheDocument();
  });

  //  Initial slide 

  it('shows the first step on initial render', () => {
    renderOpen();
    expect(screen.getByText('Go to Student Center')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
  });

  it('displays the correct image for the first step', () => {
    renderOpen();
    const img = screen.getByAltText('Go to Student Center');
    expect(img).toHaveAttribute('src', 'transc.png');
  });

  //  Navigation: Next 

  it('navigates to the second step when next (›) is clicked', () => {
    renderOpen();
    fireEvent.click(screen.getByText('›'));
    expect(screen.getByText('Click Print')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
  });

  it('navigates to the third step on two next clicks', () => {
    renderOpen();
    fireEvent.click(screen.getByText('›'));
    fireEvent.click(screen.getByText('›'));
    expect(screen.getByText('Save as PDF')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('wraps around to the first step after the last step (next)', () => {
    renderOpen();
    fireEvent.click(screen.getByText('›'));
    fireEvent.click(screen.getByText('›'));
    fireEvent.click(screen.getByText('›'));
    expect(screen.getByText('Go to Student Center')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
  });

  //  Navigation: Prev 

  it('wraps around to the last step when prev (‹) is clicked on the first step', () => {
    renderOpen();
    fireEvent.click(screen.getByText('‹'));
    expect(screen.getByText('Save as PDF')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('navigates back to the first step from the second step using prev', () => {
    renderOpen();
    fireEvent.click(screen.getByText('›'));
    fireEvent.click(screen.getByText('‹'));
    expect(screen.getByText('Go to Student Center')).toBeInTheDocument();
  });

  // Dot navigation 

  it('renders three dots', () => {
    renderOpen();
    const dots = document.querySelectorAll('.dot');
    expect(dots).toHaveLength(3);
  });

  it('marks the first dot as active initially', () => {
    renderOpen();
    const dots = document.querySelectorAll('.dot');
    expect(dots[0]).toHaveClass('active');
    expect(dots[1]).not.toHaveClass('active');
    expect(dots[2]).not.toHaveClass('active');
  });

  it('navigates to the correct slide when a dot is clicked', () => {
    renderOpen();
    const dots = document.querySelectorAll('.dot');

    fireEvent.click(dots[1]);
    expect(screen.getByText('Click Print')).toBeInTheDocument();
    expect(dots[1]).toHaveClass('active');

    fireEvent.click(dots[2]);
    expect(screen.getByText('Save as PDF')).toBeInTheDocument();
    expect(dots[2]).toHaveClass('active');

    fireEvent.click(dots[0]);
    expect(screen.getByText('Go to Student Center')).toBeInTheDocument();
    expect(dots[0]).toHaveClass('active');
  });

  // Close button 

  it('calls toggleModal when the close (×) button is clicked', () => {
    renderOpen();
    fireEvent.click(screen.getByText('×'));
    expect(toggleModal).toHaveBeenCalledTimes(1);
  });
});