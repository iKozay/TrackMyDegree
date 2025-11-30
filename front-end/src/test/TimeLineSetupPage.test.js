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
jest.mock(
  '../components/InstructionModal',
  () =>
    ({ isOpen }) =>
      isOpen ? <div data-testid="modal">Modal Open</div> : null,
);

// --- Mock router ---
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

// --- Mock Sentry (if used) ---
jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
}));

// Mock the API wrapper
jest.mock('../api/http-api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Import mocked api
import { api } from '../api/http-api-client';

describe('TimelineSetupPage', () => {
  const mockNavigate = jest.fn();
  const mockOnDataProcessed = jest.fn();
  const originalAlert = window.alert;
  let consoleErrorSpy;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    window.alert = jest.fn();

    // Default mock for fetching degree list - uses GET /degree
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/degree') {
        return Promise.resolve([
          { id: 1, name: 'BEng Computer Science', totalCredits: 120 },
        ]);
      }
      return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
    });
  });

  afterAll(() => {
    window.alert = originalAlert;
    consoleErrorSpy.mockRestore();
  });

  test('renders basic UI components', async () => {
    await act(async () => {
      render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    });
    expect(screen.getByTestId('info-form')).toBeInTheDocument();
    expect(screen.getByTestId('upload-box')).toBeInTheDocument();
    expect(screen.getByText(/Upload Acceptance Letter/i)).toBeInTheDocument();
  });

  test('toggles modal visibility', async () => {
    await act(async () => {
      render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    });
    const button = screen.getByRole('button', { name: /how to download/i });
    fireEvent.click(button);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  test('fetches degrees on mount', async () => {
    await act(async () => {
      render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/degree');
    });
  });

  test('processFile uploads and processes transcript successfully', async () => {
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/degree') {
        return Promise.resolve([
          { _id: 1, name: 'BEng Computer Science', totalCredits: 120 },
        ]);
      }
      return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
    });
    api.post.mockImplementation((endpoint, data) => {
      if (endpoint === '/upload/parse') {
        return Promise.resolve({
          success: true,
          data: {
            programInfo: {
              degree: 'Something, BEng Computer Science',
              isCoop: true,
              isExtendedCreditProgram: false,
              minimumProgramLength: 90,
            },
            semesters: [
              { term: 'Fall 2024', courses: [{ code: 'COMP248' }] },
            ],
            exemptedCourses: [],
            deficiencyCourses: [],
            transferedCourses: [],
          },
        });
      }
      return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
    });

    await act(async () => {
      render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    });

    // Wait for degrees to load before clicking upload
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/degree');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-box'));
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/upload/parse', expect.any(FormData));
      expect(window.alert).not.toHaveBeenCalled();
      expect(mockOnDataProcessed).toHaveBeenCalledWith(
        expect.objectContaining({
          transcriptData: expect.any(Array),
          degreeId: expect.any(Number),
          credits_Required: 90,
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/timeline_change', expect.any(Object));
    });
  });

  test('shows alert when degree does not match any available degree', async () => {
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/degree') {
        return Promise.resolve([
          { id: 1, name: 'BEng Computer Science', totalCredits: 120 },
        ]);
      }
      return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
    });
    api.post.mockImplementation((endpoint, data) => {
      if (endpoint === '/upload/parse') {
        return Promise.resolve({
          success: true,
          data: {
            programInfo: {
              degree: 'Mechanical Engineering',
              isCoop: false,
              isExtendedCreditProgram: false,
              minimumProgramLength: 90,
            },
            semesters: [
              { term: 'Fall 2024', courses: [{ code: 'COMP248' }] },
            ],
            exemptedCourses: [],
            deficiencyCourses: [],
            transferedCourses: [],
          },
        });
      }
      return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
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
    api.get.mockRejectedValueOnce(new Error('Server unavailable'));

    await act(async () => {
      render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error'));
    });
  });

  test('shows alert if file upload fails', async () => {
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/degree') {
        return Promise.resolve([
          { id: 1, name: 'BEng Computer Science', totalCredits: 120 },
        ]);
      }
      return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
    });
    api.post.mockImplementation((endpoint, data) => {
      if (endpoint === '/upload/parse') {
        return Promise.reject(new Error('File too large'));
      }
      return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
    });

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

  test('shows alert if no courses were found', async () => {
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/degree') {
        return Promise.resolve([
          { id: 1, name: 'BEng Computer Science', totalCredits: 120 },
        ]);
      }
      return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
    });
    api.post.mockImplementation((endpoint, data) => {
      if (endpoint === '/upload/parse') {
        return Promise.resolve({
          success: true,
          data: {
            programInfo: {
              degree: 'BEng Computer Science',
            },
            semesters: [],
            exemptedCourses: [],
            deficiencyCourses: [],
            transferedCourses: [],
          },
        });
      }
      return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
    });

    await act(async () => {
      render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-box'));
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  test('shows alert if upload response succeeds but degrees list is empty', async () => {
    // Mock degrees endpoint to return empty array
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/degree') {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
    });
    api.post.mockImplementation((endpoint, data) => {
      if (endpoint === '/upload/parse') {
        return Promise.resolve({
          data: {
            programInfo: {
              degree: 'BEng Computer Science',
              isCoop: true,
              isExtendedCreditProgram: false,
              minimumProgramLength: 90,
            },
            semesters: [
              { term: 'Fall 2024', courses: [{ code: 'COMP248' }] },
            ],
            exemptedCourses: [],
            deficiencyCourses: [],
            transferedCourses: [],
          },
        });
      }
      return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
    });

    await act(async () => {
      render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-box'));
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error fetching degrees from server. Please try again later.');
    });
  });
});
