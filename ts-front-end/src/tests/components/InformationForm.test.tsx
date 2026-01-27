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
    (api.get as Mock).mockResolvedValue(mockDegrees);

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
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => { });

    fireEvent.click(nextButton);
    expect(alertMock).toHaveBeenCalledWith('Please select a degree before continuing.');

    alertMock.mockRestore();
  });

  it('submits the form and navigates when valid', async () => {
    const mockDegrees = [{ _id: '1', name: 'CS', totalCredits: 120 }];
    (api.get as Mock).mockResolvedValue(mockDegrees);
    (api.post as Mock).mockResolvedValue({ jobId: '123', });


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

  it('toggles checkboxes correctly', async () => {
    (api.get as Mock).mockResolvedValue([{ _id: '1', name: 'CS', totalCredits: 120 }]);

    render(
      <MemoryRouter>
        <InformationForm />
      </MemoryRouter>
    );

    const coopCheckbox = screen.getByLabelText(/Co-op Program?/i);
    const ecpCheckbox = screen.getByLabelText(/Extended Credit Program?/i);

    fireEvent.click(coopCheckbox);
    expect(coopCheckbox).toBeChecked();

    fireEvent.click(ecpCheckbox);
    expect(ecpCheckbox).toBeChecked();

    fireEvent.click(coopCheckbox);
    expect(coopCheckbox).not.toBeChecked();
  });

  it('shows predefined sequence option for Co-op students in valid degrees/terms', async () => {
    const mockDegrees = [{ _id: '100', name: 'Bachelor of Engineering Computer Engineering', totalCredits: 120 }];
    (api.get as Mock).mockResolvedValue(mockDegrees);

    render(
      <MemoryRouter>
        <InformationForm />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('Bachelor of Engineering Computer Engineering'));

    // Select Degree
    fireEvent.change(screen.getByLabelText('Degree Concentration:'), { target: { value: '100' } });

    // Select Fall Term
    fireEvent.change(screen.getByLabelText('Starting Term:'), { target: { value: 'Fall' } });

    // Click Co-op
    const coopCheckbox = screen.getByLabelText(/Co-op Program?/i);
    fireEvent.click(coopCheckbox);

    // Predefined sequence checkbox should appear
    await waitFor(() => {
      expect(screen.getByText(/Load predefined co-op sequence?/i)).toBeInTheDocument();
    });
  });

  it('handles Aerospace option selection for predefined sequence', async () => {
    const mockDegrees = [{ _id: 'ae1', name: 'Bachelor of Engineering Aerospace Engineering', totalCredits: 120 }];
    (api.get as Mock).mockResolvedValue(mockDegrees);
    (api.post as Mock).mockResolvedValue({ jobId: 'job_aero' });

    // Mock fetch for sequence file
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([{ term: 'Term 1', type: 'Academic' }]),
    } as Response);


    render(
      <MemoryRouter>
        <InformationForm />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('Bachelor of Engineering Aerospace Engineering'));

    // Fill form
    fireEvent.change(screen.getByLabelText('Degree Concentration:'), { target: { value: 'ae1' } });
    fireEvent.change(screen.getByLabelText('Starting Term:'), { target: { value: 'Fall' } });
    fireEvent.change(screen.getByLabelText('Starting Year:'), { target: { value: '2023' } });

    // Select Co-op
    fireEvent.click(screen.getByLabelText(/Co-op Program?/i));

    // Select Predefined Sequence
    await waitFor(() => screen.getByLabelText(/Load predefined co-op sequence?/i));
    fireEvent.click(screen.getByLabelText(/Load predefined co-op sequence?/i));

    // Select Aerospace Option
    await waitFor(() => screen.getByLabelText(/Select Aerospace Option:/i));
    fireEvent.change(screen.getByLabelText(/Select Aerospace Option:/i), { target: { value: 'option_a' } });

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/coop-sequences/aerospace_option_a.json');
      expect(api.post).toHaveBeenCalledWith('/upload/form', expect.objectContaining({
        predefinedSequence: expect.any(Array)
      }));
    });
  });

  it('submits correctly without predefined sequence when unchecked', async () => {
    const mockDegrees = [{ _id: '100', name: 'Bachelor of Engineering Computer Engineering', totalCredits: 120 }];
    (api.get as Mock).mockResolvedValue(mockDegrees);
    (api.post as Mock).mockResolvedValue({ jobId: 'job_no_seq' });

    render(
      <MemoryRouter>
        <InformationForm />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('Bachelor of Engineering Computer Engineering'));

    fireEvent.change(screen.getByLabelText('Degree Concentration:'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Starting Term:'), { target: { value: 'Fall' } });
    fireEvent.change(screen.getByLabelText('Starting Year:'), { target: { value: '2023' } });

    // Select Co-op but NOT predefined sequence
    fireEvent.click(screen.getByLabelText(/Co-op Program?/i));

    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/upload/form', expect.not.objectContaining({
        predefinedSequence: expect.anything()
      }));

      it('resets form variables on Cancel', async () => {
        (api.get as Mock).mockResolvedValue([{ _id: '1', name: 'CS', totalCredits: 120 }]);

        render(
          <MemoryRouter>
            <InformationForm />
          </MemoryRouter>
        );

        const coopCheckbox = screen.getByLabelText(/Co-op Program?/i);
        fireEvent.click(coopCheckbox);
        expect(coopCheckbox).toBeChecked();

        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        expect(coopCheckbox).not.toBeChecked();
      });

      it('alerts if term or year is missing', async () => {
        (api.get as Mock).mockResolvedValue([{ _id: '1', name: 'CS', totalCredits: 120 }]);
        render(<MemoryRouter><InformationForm /></MemoryRouter>);

        await waitFor(() => screen.getByText('CS'));
        fireEvent.change(screen.getByLabelText('Degree Concentration:'), { target: { value: '1' } });

        const nextButton = screen.getByText('Next');
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => { });

        fireEvent.click(nextButton);
        expect(alertMock).toHaveBeenCalledWith('Please select both a term and a year for your starting semester.');
        alertMock.mockRestore();
      });

      it('handles Chemical Engineering Winter entry sequence', async () => {
        const mockDegrees = [{ _id: 'chem1', name: 'Bachelor of Engineering Chemical Engineering', totalCredits: 120 }];
        (api.get as Mock).mockResolvedValue(mockDegrees);
        (api.post as Mock).mockResolvedValue({ jobId: 'job_chem' });
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ([]),
        } as Response);


        render(<MemoryRouter><InformationForm /></MemoryRouter>);
        await waitFor(() => screen.getByText('Bachelor of Engineering Chemical Engineering'));

        fireEvent.change(screen.getByLabelText('Degree Concentration:'), { target: { value: 'chem1' } });
        fireEvent.change(screen.getByLabelText('Starting Term:'), { target: { value: 'Winter' } }); // Winter entry
        fireEvent.change(screen.getByLabelText('Starting Year:'), { target: { value: '2023' } });

        fireEvent.click(screen.getByLabelText(/Co-op Program?/i));
        await waitFor(() => screen.getByLabelText(/Load predefined co-op sequence?/i));
        fireEvent.click(screen.getByLabelText(/Load predefined co-op sequence?/i));

        await act(async () => { fireEvent.click(screen.getByText('Next')); });

        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith('/coop-sequences/chemical_winter_entry.json');
        });
      });

      it('handles API error during submission', async () => {
        (api.get as Mock).mockResolvedValue([{ _id: '1', name: 'CS', totalCredits: 120 }]);
        (api.post as Mock).mockRejectedValue(new Error('API Error'));

        render(<MemoryRouter><InformationForm /></MemoryRouter>);
        await waitFor(() => screen.getByText('CS'));

        fireEvent.change(screen.getByLabelText('Degree Concentration:'), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText('Starting Term:'), { target: { value: 'Fall' } });
        fireEvent.change(screen.getByLabelText('Starting Year:'), { target: { value: '2023' } });

        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => { });
        await act(async () => { fireEvent.click(screen.getByText('Next')); });

        expect(alertMock).toHaveBeenCalledWith('API Error');
        alertMock.mockRestore();
      });

      it('handles fetch error for predefined sequence', async () => {
        const mockDegrees = [{ _id: 'soft1', name: 'Bachelor of Engineering Software Engineering', totalCredits: 120 }];
        (api.get as Mock).mockResolvedValue(mockDegrees);
        global.fetch = vi.fn().mockResolvedValue({ ok: false, statusText: 'Not Found' } as Response);

        render(<MemoryRouter><InformationForm /></MemoryRouter>);
        await waitFor(() => screen.getByText('Bachelor of Engineering Software Engineering'));

        fireEvent.change(screen.getByLabelText('Degree Concentration:'), { target: { value: 'soft1' } });
        fireEvent.change(screen.getByLabelText('Starting Term:'), { target: { value: 'Fall' } });
        fireEvent.change(screen.getByLabelText('Starting Year:'), { target: { value: '2023' } });

        fireEvent.click(screen.getByLabelText(/Co-op Program?/i));
        await waitFor(() => screen.getByLabelText(/Load predefined co-op sequence?/i));
        fireEvent.click(screen.getByLabelText(/Load predefined co-op sequence?/i));

        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => { });
        const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => { });

        await act(async () => { fireEvent.click(screen.getByText('Next')); });

        expect(alertMock).toHaveBeenCalledWith('Failed to load predefined sequence. Falling back to standard generation.');
        alertMock.mockRestore();
        consoleErrorMock.mockRestore();
      });
    });
  });

});
