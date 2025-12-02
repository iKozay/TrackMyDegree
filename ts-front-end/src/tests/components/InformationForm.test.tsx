/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InformationForm from '../../components/InformationForm';
import { api } from '../../api/http-api-client';
import { MemoryRouter } from 'react-router-dom';
import { act } from '@testing-library/react';
import type { Mock } from 'vitest';

// Mock the API module
vi.mock('../../api/http-api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock useNavigate from react-router-dom
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('InformationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and fetches degrees', async () => {
    const mockDegrees = [
      { _id: '1', name: 'CS', totalCredits: 120 },
      { _id: '2', name: 'EE', totalCredits: 120 },
    ];
    (api.get as Mock).mockResolvedValue( mockDegrees );

    render(
      <MemoryRouter>
        <InformationForm />
      </MemoryRouter>
    );

    // Wait for the degrees to appear in the select
    await waitFor(() => {
      expect(screen.getByText('CS')).toBeInTheDocument();
      expect(screen.getByText('EE')).toBeInTheDocument();
    });
  });

  it('alerts if no degree is selected on Next', async () => {
    render(
      <MemoryRouter>
        <InformationForm />
      </MemoryRouter>
    );

    const nextButton = screen.getByText('Next');

    // Mock alert
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    fireEvent.click(nextButton);
    expect(alertMock).toHaveBeenCalledWith('Please select a degree before continuing.');

    alertMock.mockRestore();
  });

  it('submits the form and navigates when valid', async () => {
    const mockDegrees = [{ _id: '1', name: 'CS', totalCredits: 120 }];
    (api.get as Mock).mockResolvedValue(mockDegrees);
    (api.post as Mock).mockResolvedValue({jobId: '123',});


    render(
      <MemoryRouter>
        <InformationForm />
      </MemoryRouter>
    );

    // Wait for degree select to populate
    await waitFor(() => screen.getByText('CS'));

    fireEvent.change(screen.getByLabelText('Degree Concentration:'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Starting Term:'), { target: { value: 'Fall' } });
    fireEvent.change(screen.getByLabelText('Starting Year:'), { target: { value: '2023' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/upload/form', expect.objectContaining({
        degree: '1',
        firstTerm: 'Fall 2023',
      }));
      expect(mockedNavigate).toHaveBeenCalledWith('/timeline/123');
});

  });
});
