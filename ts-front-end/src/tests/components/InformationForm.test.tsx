import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import InformationForm from '../../components/InformationForm';
import { api } from '../../api/http-api-client';

//  Mocks 

vi.mock('../../styles/components/InformationForm.css', () => ({}));

vi.mock('../../api/http-api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

//  Helpers 

const mockDegrees = [
  { _id: '1', name: 'Software Engineering', totalCredits: 120 },
  { _id: '2', name: 'Aerospace Engineering', totalCredits: 130 },
  { _id: '3', name: 'Chemical Engineering', totalCredits: 125 },
  { _id: '4', name: 'Computer Science', totalCredits: 120 },
];

const renderComponent = () =>
  render(
    <MemoryRouter>
      <InformationForm />
    </MemoryRouter>
  );

const selectDegree = (name: string) => {
  const degree = mockDegrees.find((d) => d.name === name)!;
  fireEvent.change(screen.getByLabelText('Degree Concentration'), {
    target: { value: degree._id },
  });
};

const selectTermAndYear = (term: string, year: string) => {
  fireEvent.change(screen.getByLabelText('Starting Term'), { target: { value: term } });
  fireEvent.change(screen.getByLabelText('Starting Year'), { target: { value: year } });
};

//  Tests 

describe('InformationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as Mock).mockResolvedValue(mockDegrees);
  });

  //  Rendering 

  it('renders the Manual Setup heading', async () => {
    renderComponent();
    expect(screen.getByText('Manual Setup')).toBeInTheDocument();
  });

  it('renders degree, term, and year selects', async () => {
    renderComponent();
    expect(screen.getByLabelText('Degree Concentration')).toBeInTheDocument();
    expect(screen.getByLabelText('Starting Term')).toBeInTheDocument();
    expect(screen.getByLabelText('Starting Year')).toBeInTheDocument();
  });

  it('renders Cancel and Next buttons', () => {
    renderComponent();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  //  Degree fetching 

  it('fetches and renders degrees on mount', async () => {
    renderComponent();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/degree');
    });
    expect(await screen.findByText('Software Engineering')).toBeInTheDocument();
    expect(await screen.findByText('Aerospace Engineering')).toBeInTheDocument();
  });

  it('shows alert when degree fetch fails', async () => {
    (api.get as Mock).mockRejectedValue(new Error('Network error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Error fetching degrees from server. Please try again later.'
      );
    });
  });

  //  Validation 

  it('alerts when Next is clicked without selecting a degree', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();
    await screen.findByText('Software Engineering');
    fireEvent.click(screen.getByText('Next'));
    expect(alertSpy).toHaveBeenCalledWith('Please select a degree before continuing.');
  });

  it('alerts when Next is clicked without selecting term and year', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();
    await screen.findByText('Software Engineering');
    selectDegree('Software Engineering');
    fireEvent.click(screen.getByText('Next'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Please select both a term and a year for your starting semester.'
    );
  });

  //  Cancel button 

  it('resets all fields when Cancel is clicked', async () => {
    renderComponent();
    await screen.findByText('Software Engineering');

    const degreeSelect = screen.getByLabelText('Degree Concentration') as HTMLSelectElement;
    const termSelect = screen.getByLabelText('Starting Term') as HTMLSelectElement;
    const yearSelect = screen.getByLabelText('Starting Year') as HTMLSelectElement;

    selectDegree('Software Engineering');
    selectTermAndYear('Fall', '2023');

    expect(degreeSelect.value).toBe('1');
    expect(termSelect.value).toBe('Fall');
    expect(yearSelect.value).toBe('2023');

    fireEvent.click(screen.getByText('Cancel'));

    expect(degreeSelect.value).toBe('');
    expect(termSelect.value).toBe('');
    expect(yearSelect.value).toBe('');
  });

  //  Checkboxes 

  it('toggles Extended Credit Program checkbox', async () => {
    renderComponent();
    await screen.findByText('Software Engineering');

    const checkbox = screen.getByLabelText('Extended Credit Program?') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('toggles Co-op Program checkbox', async () => {
    renderComponent();
    await screen.findByText('Software Engineering');

    const checkbox = screen.getByLabelText('Co-op Program?') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  //  Predefined sequence visibility 

  it('shows predefined co-op sequence checkbox when co-op is checked and term is Fall', async () => {
    renderComponent();
    await screen.findByText('Software Engineering');

    selectDegree('Software Engineering');
    selectTermAndYear('Fall', '2023');
    fireEvent.click(screen.getByLabelText('Co-op Program?'));

    expect(await screen.findByLabelText('Load predefined co-op sequence?')).toBeInTheDocument();
  });

  it('does not show predefined sequence checkbox when term is Summer', async () => {
    renderComponent();
    await screen.findByText('Software Engineering');

    selectDegree('Software Engineering');
    selectTermAndYear('Summer', '2023');
    fireEvent.click(screen.getByLabelText('Co-op Program?'));

    expect(screen.queryByLabelText('Load predefined co-op sequence?')).not.toBeInTheDocument();
  });

  //  Aerospace option 

  it('shows Aerospace option dropdown when aerospace degree is selected with co-op + predefined sequence', async () => {
    renderComponent();
    await screen.findByText('Aerospace Engineering');

    selectDegree('Aerospace Engineering');
    selectTermAndYear('Fall', '2023');
    fireEvent.click(screen.getByLabelText('Co-op Program?'));

    const predefinedCheckbox = await screen.findByLabelText('Load predefined co-op sequence?');
    fireEvent.click(predefinedCheckbox);

    expect(await screen.findByLabelText('Select Aerospace Option:')).toBeInTheDocument();
  });

  it('alerts when Next is clicked with aerospace co-op but no option selected', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();
    await screen.findByText('Aerospace Engineering');

    selectDegree('Aerospace Engineering');
    selectTermAndYear('Fall', '2023');
    fireEvent.click(screen.getByLabelText('Co-op Program?'));

    const predefinedCheckbox = await screen.findByLabelText('Load predefined co-op sequence?');
    fireEvent.click(predefinedCheckbox);

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Please select an Aerospace option.');
    });
  });

  //  Successful form submission 

  it('navigates to timeline page on successful standard form submission', async () => {
    (api.post as Mock).mockResolvedValue({ jobId: 'abc123' });
    renderComponent();
    await screen.findByText('Software Engineering');

    selectDegree('Software Engineering');
    selectTermAndYear('Fall', '2023');

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/upload/form', expect.objectContaining({
        degree: '1',
        firstTerm: 'Fall 2023',
        isCoop: false,
        isExtendedCreditProgram: false,
      }));
      expect(mockNavigate).toHaveBeenCalledWith('/timeline/abc123');
    });
  });

  it('alerts when API returns no jobId', async () => {
    (api.post as Mock).mockResolvedValue({});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();
    await screen.findByText('Software Engineering');

    selectDegree('Software Engineering');
    selectTermAndYear('Fall', '2023');
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Unexpected response from server.');
    });
  });

  it('alerts when API post throws an error', async () => {
    (api.post as Mock).mockRejectedValue(new Error('Server down'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();
    await screen.findByText('Software Engineering');

    selectDegree('Software Engineering');
    selectTermAndYear('Fall', '2023');
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Server down');
    });
  });

  //  Chemical Engineering term handling 

  it('shows predefined sequence checkbox for Chemical Engineering in Winter term', async () => {
    renderComponent();
    await screen.findByText('Chemical Engineering');

    selectDegree('Chemical Engineering');
    selectTermAndYear('Winter', '2023');
    fireEvent.click(screen.getByLabelText('Co-op Program?'));

    expect(await screen.findByLabelText('Load predefined co-op sequence?')).toBeInTheDocument();
  });
});