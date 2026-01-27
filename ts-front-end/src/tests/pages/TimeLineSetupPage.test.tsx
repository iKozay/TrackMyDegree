import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// ✅ Correct import path you requested
import TimelineSetupPage from '../../pages/TimelineSetupPage';

// Mock child components (so we isolate TimelineSetupPage behavior)
vi.mock('../../components/InformationForm', () => ({
  default: () => <div data-testid="information-form" />,
}));

vi.mock('../../components/UploadBox', () => ({
  default: () => <div data-testid="upload-box" />,
}));

vi.mock('../../components/InstructionModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="instructions-modal">Modal Open</div> : null,
}));

describe('TimelineSetupPage Component', () => {
  const renderWithRouter = (ui: React.ReactNode) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

  test('renders layout correctly', () => {
    renderWithRouter(<TimelineSetupPage />);

    expect(screen.getByTestId('information-form')).toBeInTheDocument();
    expect(screen.getByTestId('upload-box')).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /how to download your transcript/i })
    ).toBeInTheDocument();
  });

  test('opens and closes the modal when clicking the toggle button', () => {
    renderWithRouter(<TimelineSetupPage />);

    const modalButton = screen.getByRole('button', {
      name: /how to download your transcript/i,
    });

    // Modal should initially be closed
    expect(screen.queryByTestId('instructions-modal')).toBeNull();

    // Open modal
    fireEvent.click(modalButton);
    expect(screen.getByTestId('instructions-modal')).toBeInTheDocument();

    // Close modal
    fireEvent.click(modalButton);
    expect(screen.queryByTestId('instructions-modal')).toBeNull();
  });
});
