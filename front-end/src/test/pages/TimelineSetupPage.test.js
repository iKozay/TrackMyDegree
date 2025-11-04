import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimelineSetupPage from '../../pages/TimelineSetupPage';
import { api } from '../../api/http-api-client';
import { parsePdfFile, extractAcceptanceDetails } from '../../utils/AcceptanceUtils';
import UploadBox from '../../components/UploadBox';

jest.mock('../../api/http-api-client', () => ({
  api: {
    post: jest.fn(),
  },
}));

jest.mock('../../utils/AcceptanceUtils', () => ({
  parsePdfFile: jest.fn(),
  extractAcceptanceDetails: jest.fn(),
}));

jest.mock('../../components/UploadBox', () => {
  return function MockUploadBox({ processFile }) {
    return (
      <div>
        <button onClick={() => processFile(new File(['test'], 'test.pdf', { type: 'application/pdf' }))}>
          Upload File
        </button>
      </div>
    );
  };
});

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));


describe('TimelineSetupPage', () => {
  const mockOnDataProcessed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  it('renders without crashing', () => {
    api.post.mockResolvedValueOnce({ degrees: [] });

    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);
    // Use getAllByText since "OR" might appear multiple times
    const orElements = screen.getAllByText(/OR/i);
    expect(orElements.length).toBeGreaterThan(0);
  });

  it('fetches degrees on mount', async () => {
    const mockDegrees = [
      { id: '1', name: 'Computer Science', totalCredits: 120 },
      { id: '2', name: 'Software Engineering', totalCredits: 120 },
    ];

    api.post.mockResolvedValueOnce({ degrees: mockDegrees });

    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/degree/getAllDegrees');
    });
  });

  it('handles degree fetch error', async () => {
    api.post.mockRejectedValueOnce(new Error('Network error'));

    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it('calls onDataProcessed on initial render', async () => {
    api.post.mockResolvedValueOnce({ degrees: [] });

    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);

    await waitFor(() => {
      expect(mockOnDataProcessed).toHaveBeenCalled();
    });
  });

  it('processes PDF file successfully', async () => {
    const mockPdfData = { text: 'Sample PDF content' };
    const mockExtractedData = {
      results: [
        { season: 'Fall', year: '2024', courses: ['COMP 248'] },
      ],
      details: {
        degreeConcentration: 'Computer Science',
        minimumProgramLength: 120,
        extendedCreditProgram: false,
        coopProgram: true,
        deficienciesCourses: [],
      },
    };

    const mockDegrees = [
      { id: '1', name: 'Computer Science', totalCredits: 120 },
    ];

    api.post.mockResolvedValueOnce({ degrees: mockDegrees });

    parsePdfFile.mockResolvedValueOnce(mockPdfData);
    extractAcceptanceDetails.mockReturnValueOnce(mockExtractedData);

    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('Upload Acceptance Letter')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(parsePdfFile).toHaveBeenCalled();
      expect(extractAcceptanceDetails).toHaveBeenCalledWith(mockPdfData);
    });

    await waitFor(() => {
      expect(mockOnDataProcessed).toHaveBeenCalledWith({
        transcriptData: mockExtractedData.results,
        degreeId: '1',
        isExtendedCredit: false,
      });
      expect(mockNavigate).toHaveBeenCalledWith('/timeline_change', {
        state: {
          coOp: true,
          credits_Required: 120,
          extendedCredit: false,
          creditDeficiency: false,
        },
      });
    });
  });

  it('handles PDF processing with no transcript data', async () => {
    const mockPdfData = { text: 'Sample PDF content' };
    const mockExtractedData = {
      results: [],
      details: {
        degreeConcentration: 'Computer Science',
        minimumProgramLength: 120,
        extendedCreditProgram: false,
        coopProgram: false,
        deficienciesCourses: [],
      },
    };

    const mockDegrees = [
      { id: '1', name: 'Computer Science', totalCredits: 120 },
    ];

    api.post.mockResolvedValueOnce({ degrees: mockDegrees });

    parsePdfFile.mockResolvedValueOnce(mockPdfData);
    extractAcceptanceDetails.mockReturnValueOnce(mockExtractedData);

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('Upload Acceptance Letter')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(parsePdfFile).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'No transcript data extracted. Please ensure the PDF is a valid transcript.',
      );
    });

    alertSpy.mockRestore();
  });

  it('navigates to upload transcript page when button is clicked', async () => {
    api.post.mockResolvedValueOnce({ degrees: [] });

    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('Upload Transcript')).toBeInTheDocument();
    });

    const uploadTranscriptButton = screen.getByText('Upload Transcript');
    fireEvent.click(uploadTranscriptButton);

    expect(mockNavigate).toHaveBeenCalledWith('/uploadTranscript');
  });

  it('handles degree matching when degree concentration is not found', async () => {
    const mockPdfData = { text: 'Sample PDF content' };
    const mockExtractedData = {
      results: [
        { season: 'Fall', year: '2024', courses: ['COMP 248'] },
      ],
      details: {
        degreeConcentration: 'Unknown Degree',
        minimumProgramLength: null,
        extendedCreditProgram: false,
        coopProgram: false,
        deficienciesCourses: [],
      },
    };

    const mockDegrees = [
      { id: '1', name: 'Computer Science', totalCredits: 120 },
    ];

    api.post.mockResolvedValueOnce({ degrees: mockDegrees });

    parsePdfFile.mockResolvedValueOnce(mockPdfData);
    extractAcceptanceDetails.mockReturnValueOnce(mockExtractedData);

    render(<TimelineSetupPage onDataProcessed={mockOnDataProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('Upload Acceptance Letter')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockOnDataProcessed).toHaveBeenCalledWith({
        transcriptData: mockExtractedData.results,
        degreeId: 'Unknown',
        isExtendedCredit: false,
      });
    });
  });
});

