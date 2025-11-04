import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimelineSetupPage from '../pages/TimelineSetupPage';
import { useNavigate } from 'react-router-dom';

// --- Mock child components ---
jest.mock('../components/InformationForm', () => () => <div data-testid="info-form" />);
jest.mock('../components/UploadBox', () => ({ processFile }) => (
  <div data-testid="upload-box" onClick={() => processFile(new File([], 'test.pdf'))}>
    UploadBox
  </div>
));
jest.mock('../components/InstructionModal', () => ({ isOpen }) =>
  isOpen ? <div data-testid="modal">Modal Open</div> : null
);

// --- Mock router ---
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

// --- Mock Sentry (if used) ---
jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
}));

// Mock the API wrapper at the correct path
jest.mock('../api/http-api-client', () => ({
  api: {
    post: jest.fn(),
    upload: jest.fn(),
  },
}));

// Import the mocked api after jest.mock
import { api } from '../api/http-api-client';
import { data } from 'autoprefixer';

describe('TimelineSetupPage', () => {
  const mockNavigate = jest.fn();
  const mockOnDataProcessed = jest.fn();
  const originalAlert = window.alert;

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    window.alert = jest.fn();

    // Default mock for fetching degree list
    api.post.mockImplementation((endpoint) => {
  if (endpoint === '/degree/getAllDegrees') {
    return Promise.resolve({
      degrees: [
        { id: 1, name: 'BEng Computer Science', totalCredits: 120 }
      ],
    });
  }
  return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
});

  });

  afterAll(() => {
    window.alert = originalAlert;
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
    await act(async () => {
      render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/degree/getAllDegrees');
    });
  });

  test('processFile uploads and processes transcript successfully', async () => {
    api.upload.mockResolvedValue({
      success: true,
      data: {
        extractedCourses: [{ term: 'Fall 2024', courses: ['COMP248'] }],
        details: {
          degreeConcentration: 'BEng Computer Science',
          coopProgram: true,
          extendedCreditProgram: false,
          minimumProgramLength: 90,
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
      expect(api.upload).toHaveBeenCalledWith('/upload/parse', expect.any(FormData));
      expect(window.alert).not.toHaveBeenCalled();
      expect(mockOnDataProcessed).toHaveBeenCalledWith(
        expect.objectContaining({
          transcriptData: expect.any(Array),
          degreeId: 1,
          credits_Required: 90,
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/timeline_change', expect.any(Object));
    });
  });

  test('shows alert when degree does not match any available degree', async () => {
    api.upload.mockResolvedValue({
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
    });

     await act(async () => {
      render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-box'));
    });
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
  });

  test('shows alert if fetching degrees fails', async () => {
  api.post.mockRejectedValueOnce(new Error('Server unavailable'));

  await act(async () => {
    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
  });

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error'));
  });
});
test('shows alert if file upload fails', async () => {
  api.upload.mockRejectedValueOnce(new Error('File too large'));

  await act(async () => {
    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
  });

  await act(async () => {
    fireEvent.click(screen.getByTestId('upload-box'));
  });

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith('File too large');
  });
});
test('shows alert if no courses where found', async () => {
  api.upload.mockResolvedValueOnce({ success: true, data: { details: { degreeConcentration: 'BEng Computer Science',} }});

  await act(async () => {
    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
  });

  await act(async () => {
    fireEvent.click(screen.getByTestId('upload-box'));
  });

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalled(); // You might alert here in component
  });
});
test('shows alert if upload response succeeds but degrees list is empty', async () => {
  // Mock degrees endpoint to return empty array
  api.post.mockResolvedValueOnce({ degrees: [] });

  // Mock upload endpoint with valid transcript data
  api.upload.mockResolvedValueOnce({
    data: {
      extractedCourses: [{ term: 'Fall 2024', courses: ['COMP248'] }],
      details: {
        degreeConcentration: 'BEng Computer Science',
        coopProgram: true,
        extendedCreditProgram: false,
        minimumProgramLength: 90,
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
    expect(window.alert).toHaveBeenCalledWith(
      'Error fetching degrees from server. Please try again later.'
    );
  });
});


});
