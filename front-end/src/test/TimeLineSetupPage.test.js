import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimelineSetupPage from '../pages/TimelineSetupPage';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { act } from 'react';

// Mock subcomponents (we only test parent behavior)
jest.mock('../components/InformationForm', () => () => <div data-testid="info-form" />);
jest.mock('../components/UploadBox', () => ({ processFile }) => (
  <div data-testid="upload-box" onClick={() => processFile(new File([], 'test.pdf'))}>
    UploadBox
  </div>
));
jest.mock(
  '../components/InstructionModal',
  () =>
    ({ isOpen }) =>
      isOpen ? <div data-testid="modal">Modal Open</div> : null,
);

// Mock router and axios
jest.mock('axios');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

// Mock Sentry
jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
}));

// --- Tests ---
describe('TimelineSetupPage', () => {
  const mockNavigate = jest.fn();
  const mockOnDataProcessed = jest.fn();
  const orignalAlert = window.alert;
  const orignalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    window.alert = jest.fn();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ degrees: [{ id: 1, name: 'BEng Computer Science' }] }),
      }),
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
  afterAll(() => {
    window.alert = orignalAlert;
    global.fetch = orignalFetch;
  });

  test('renders basic UI components', () => {
    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    expect(screen.getByTestId('info-form')).toBeInTheDocument();
    expect(screen.getByTestId('upload-box')).toBeInTheDocument();
    expect(screen.getByText(/Upload Acceptance Letter/i)).toBeInTheDocument();
  });

  test('toggles modal visibility', () => {
    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    const button = screen.getByRole('button', { name: /how to download/i });
    fireEvent.click(button);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  test('fetches degrees on mount', async () => {
    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  test('processFile uploads and processes transcript successfully', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          extractedCourses: [{ term: 'Fall 2024', courses: ['COMP248'] }],
          details: {
            degreeConcentration: 'Bachelor of Computer Science',
            coopProgram: true,
            extendedCreditProgram: false,
            minimumProgramLength: 90,
          },
        },
      },
    });
    await act(async () => {
      render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-box'));
    });
    await waitFor(() => {
      expect(mockOnDataProcessed).toHaveBeenCalledWith(
        expect.objectContaining({
          transcriptData: expect.any(Array),
          degreeId: 1,
          credits_Required: 90,
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/timeline_change', expect.any(Object));
    });
  });

  test('shows alert when degree does not match any available degree', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          extractedCourses: [{ term: 'Fall 2024', courses: ['COMP248'] }],
          details: {
            degreeConcentration: 'Mechanical Engineering',
            coopProgram: false,
            extendedCreditProgram: false,
            minimumProgramLength: 90,
          },
        },
      },
    });

    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    fireEvent.click(screen.getByTestId('upload-box'));

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
  });
});
