import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TimelineSetupPage from '../../pages/TimelineSetupPage';

// Mock child components
vi.mock('../../components/InformationForm', () => ({
  default: () => <div data-testid="information-form">InformationForm</div>,
}));

vi.mock('../../components/UploadBox', () => ({
  default: ({ toggleModal }: { toggleModal: () => void }) => (
    <div data-testid="upload-box">
      <button onClick={toggleModal}>Open Modal</button>
    </div>
  ),
}));

vi.mock('../../components/InstructionModal', () => ({
  default: ({ isOpen, toggleModal }: { isOpen: boolean; toggleModal: () => void }) => (
    <div data-testid="instructions-modal" data-open={isOpen}>
      {isOpen && <button onClick={toggleModal}>Close Modal</button>}
    </div>
  ),
}));

vi.mock('../../components/UserTimelinesSection', () => ({
  default: () => <div data-testid="user-timelines-section">UserTimelinesSection</div>,
}));

vi.mock('../../styles/TimelineSetupPage.css', () => ({}));

describe('TimelineSetupPage', () => {
  it('renders the hero section with correct heading and description', () => {
    render(<TimelineSetupPage />);

    expect(screen.getByText('Create Your Academic Timeline')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Plan your journey smarter. Build it manually or upload your acceptance letter / unofficial transcript.'
      )
    ).toBeInTheDocument();
  });

  it('renders the InformationForm component', () => {
    render(<TimelineSetupPage />);
    expect(screen.getByTestId('information-form')).toBeInTheDocument();
  });

  it('renders the UploadBox component', () => {
    render(<TimelineSetupPage />);
    expect(screen.getByTestId('upload-box')).toBeInTheDocument();
  });

  it('renders the UserTimelinesSection component', () => {
    render(<TimelineSetupPage />);
    expect(screen.getByTestId('user-timelines-section')).toBeInTheDocument();
  });

  it('renders the InstructionsModal component', () => {
    render(<TimelineSetupPage />);
    expect(screen.getByTestId('instructions-modal')).toBeInTheDocument();
  });

  it('renders the OR divider between the two cards', () => {
    render(<TimelineSetupPage />);
    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('modal is closed by default', () => {
    render(<TimelineSetupPage />);
    const modal = screen.getByTestId('instructions-modal');
    expect(modal).toHaveAttribute('data-open', 'false');
  });

  it('opens the modal when toggleModal is called from UploadBox', () => {
    render(<TimelineSetupPage />);

    const openButton = screen.getByText('Open Modal');
    fireEvent.click(openButton);

    const modal = screen.getByTestId('instructions-modal');
    expect(modal).toHaveAttribute('data-open', 'true');
  });

  it('closes the modal when toggleModal is called from InstructionsModal', () => {
    render(<TimelineSetupPage />);

    // Open modal first
    fireEvent.click(screen.getByText('Open Modal'));
    expect(screen.getByTestId('instructions-modal')).toHaveAttribute('data-open', 'true');

    // Close modal
    fireEvent.click(screen.getByText('Close Modal'));
    expect(screen.getByTestId('instructions-modal')).toHaveAttribute('data-open', 'false');
  });

  it('toggles modal state correctly on multiple clicks', () => {
    render(<TimelineSetupPage />);
    const modal = screen.getByTestId('instructions-modal');
    const openButton = screen.getByText('Open Modal');

    expect(modal).toHaveAttribute('data-open', 'false');

    fireEvent.click(openButton);
    expect(modal).toHaveAttribute('data-open', 'true');

    fireEvent.click(screen.getByText('Close Modal'));
    expect(modal).toHaveAttribute('data-open', 'false');
  });
});
