import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CourseSectionButton from '../../components/SectionModal';
import { api } from '../../api/http-api-client';

jest.mock('../../api/http-api-client', () => ({
  api: {
    get: jest.fn(),
  },
}));

describe('CourseSectionButton (SectionModal)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  it('renders without crashing', () => {
    render(<CourseSectionButton title="COMP 248" hidden={false} />);
    const button = screen.getByRole('button', { name: /Show Course Schedule/i });
    expect(button).toBeInTheDocument();
  });

  it('should fetch and display sections successfully', async () => {
    const mockSections = [
      {
        classNumber: '12345',
        termCode: '2242',
        session: '1',
        section: 'AA',
        componentDescription: 'LEC',
        classStatus: 'Open',
        instructionModeDescription: 'In Person',
        classStartDate: '01/09/2024',
        classEndDate: '12/20/2024',
        currentEnrollment: 10,
        enrollmentCapacity: 30,
        waitlistCapacity: 5,
        currentWaitlistTotal: 2,
      },
    ];

    api.get.mockResolvedValueOnce(mockSections);

    render(<CourseSectionButton title="COMP 248" hidden={true} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Course Schedule')).toBeInTheDocument();
      expect(screen.getByText('Fall 2024')).toBeInTheDocument();
    });
  });

  it('should handle fetch error', async () => {
    api.get.mockRejectedValueOnce(new Error('Network error'));

    render(<CourseSectionButton title="COMP 248" hidden={true} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/i)).toBeInTheDocument();
    });
  });

  it('should handle AbortError without showing error', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    api.get.mockRejectedValueOnce(abortError);

    render(<CourseSectionButton title="COMP 248" hidden={true} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.queryByText(/Error:/i)).not.toBeInTheDocument();
    });
  });

  it('should close modal when close button is clicked', async () => {
    const mockSections = [
      {
        classNumber: '12345',
        termCode: '2242',
        session: '1',
        section: 'AA',
        componentDescription: 'LEC',
        classStatus: 'Open',
        instructionModeDescription: 'In Person',
        classStartDate: '01/09/2024',
        classEndDate: '12/20/2024',
        currentEnrollment: 10,
        enrollmentCapacity: 30,
        waitlistCapacity: 0,
        currentWaitlistTotal: 0,
      },
    ];

    api.get.mockResolvedValueOnce(mockSections);

    render(<CourseSectionButton title="COMP 248" hidden={true} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Course Schedule')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Course Schedule')).not.toBeInTheDocument();
    });
  });

  it('should display no sections message when filtered result is empty', async () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 3);
    const day = String(oldDate.getDate()).padStart(2, '0');
    const month = String(oldDate.getMonth() + 1).padStart(2, '0');
    const year = oldDate.getFullYear();
    const oldDateString = `${day}/${month}/${year}`;

    const mockSections = [
      {
        classNumber: '12345',
        termCode: '2242',
        session: '1',
        section: 'AA',
        componentDescription: 'LEC',
        classStatus: 'Open',
        instructionModeDescription: 'In Person',
        classStartDate: oldDateString,
        classEndDate: '12/20/2024',
        currentEnrollment: 10,
        enrollmentCapacity: 30,
        waitlistCapacity: 0,
        currentWaitlistTotal: 0,
      },
    ];

    api.get.mockResolvedValueOnce(mockSections);

    render(<CourseSectionButton title="COMP 248" hidden={true} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('No upcoming sections found')).toBeInTheDocument();
    });
  });

  it('should format enrollment with waitlist', async () => {
    const mockSections = [
      {
        classNumber: '12345',
        termCode: '2242',
        session: '1',
        section: 'AA',
        componentDescription: 'LEC',
        classStatus: 'Open',
        instructionModeDescription: 'In Person',
        classStartDate: '01/09/2024',
        classEndDate: '12/20/2024',
        currentEnrollment: 10,
        enrollmentCapacity: 30,
        waitlistCapacity: 5,
        currentWaitlistTotal: 2,
      },
    ];

    api.get.mockResolvedValueOnce(mockSections);

    render(<CourseSectionButton title="COMP 248" hidden={true} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/10\/30 \(Waitlist: 2\/5\)/i)).toBeInTheDocument();
    });
  });

  it('should handle invalid course title format', async () => {
    api.get.mockRejectedValueOnce(new Error('Invalid course title format'));

    render(<CourseSectionButton title="Invalid Title" hidden={true} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Error: Invalid course title format/i)).toBeInTheDocument();
    });
  });
});

