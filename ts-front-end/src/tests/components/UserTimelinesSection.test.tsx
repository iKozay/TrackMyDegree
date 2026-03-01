import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UserTimelinesSection, { type Timeline } from '../../components/UserTimelinesSection';
import { api } from '../../api/http-api-client';

//  Mocks

vi.mock('../../styles/components/UserTimelinesSection.css', () => ({}));

vi.mock('../../api/http-api-client', () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('../../legacy/components/DeleteModal', () => ({
  default: ({ open, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) =>
    open ? <div data-testid="delete-modal">{children}</div> : null,
}));

vi.mock('moment', () => ({
  default: () => ({ fromNow: () => '2 days ago' }),
}));

vi.mock('lucide-react', () => ({
  Trash2: () => <span data-testid="trash-icon" />,
  FileText: () => <span data-testid="file-text-icon" />,
  AlertTriangle: () => <span data-testid="alert-triangle-icon" />,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

//  Helpers 

import { useAuth } from '../../hooks/useAuth';

const mockTimelines: Timeline[] = [
  { _id: 't1', name: 'Timeline Alpha', degreeId: 'd1', isCoop: false, isExtendedCredit: false, last_modified: '2024-01-01T00:00:00Z' },
  { _id: 't2', name: 'Timeline Beta', degreeId: 'd2', isCoop: true, isExtendedCredit: true, last_modified: '2024-02-01T00:00:00Z' },
];

const setAuthenticatedUser = () => {
  (useAuth as Mock).mockReturnValue({ isAuthenticated: true, user: { id: 'user1' } });
};

const setUnauthenticated = () => {
  (useAuth as Mock).mockReturnValue({ isAuthenticated: false, user: null });
};

const renderComponent = () =>
  render(
    <MemoryRouter>
      <UserTimelinesSection />
    </MemoryRouter>
  );

//  Tests 

describe('UserTimelinesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  //  Unauthenticated 

  it('shows login prompt when user is not authenticated', () => {
    setUnauthenticated();
    renderComponent();
    expect(screen.getByText('Please log in to see your timelines.')).toBeInTheDocument();
  });

  it('does not call API when user is not authenticated', () => {
    setUnauthenticated();
    renderComponent();
    expect(api.get).not.toHaveBeenCalled();
  });

  //  Loading state 

  it('shows loading text while fetching timelines', () => {
    setAuthenticatedUser();
    (api.get as Mock).mockReturnValue(new Promise(() => {})); // never resolves
    renderComponent();
    expect(screen.getByText('Loading timelines...')).toBeInTheDocument();
  });

  //  Error state 

  it('shows error message when API call fails', async () => {
    setAuthenticatedUser();
    (api.get as Mock).mockRejectedValue(new Error('Network error'));
    renderComponent();
    expect(await screen.findByText('Cannot get timelines.')).toBeInTheDocument();
  });

  //  Empty state 

  it('shows empty state message when no timelines exist', async () => {
    setAuthenticatedUser();
    (api.get as Mock).mockResolvedValue({ timelines: [] });
    renderComponent();
    expect(await screen.findByText("You haven't saved any timelines yet.")).toBeInTheDocument();
  });

  //  Populated state 

  it('renders timeline cards when timelines are returned', async () => {
    setAuthenticatedUser();
    (api.get as Mock).mockResolvedValue({ timelines: mockTimelines });
    renderComponent();
    expect(await screen.findByText('Timeline Alpha')).toBeInTheDocument();
    expect(screen.getByText('Timeline Beta')).toBeInTheDocument();
  });

  it('renders last_modified date for each timeline', async () => {
    setAuthenticatedUser();
    (api.get as Mock).mockResolvedValue({ timelines: mockTimelines });
    renderComponent();
    await screen.findByText('Timeline Alpha');
    const dateTexts = screen.getAllByText('Modified 2 days ago');
    expect(dateTexts).toHaveLength(2);
  });

  it('renders Assessment and Delete buttons for each timeline', async () => {
    setAuthenticatedUser();
    (api.get as Mock).mockResolvedValue({ timelines: mockTimelines });
    renderComponent();
    await screen.findByText('Timeline Alpha');
    expect(screen.getAllByText('Assessment')).toHaveLength(2);
    expect(screen.getAllByTestId('trash-icon')).toHaveLength(2);
  });

  //  Timeline click (open) 

  it('navigates to timeline page when a timeline card is clicked', async () => {
    setAuthenticatedUser();
    (api.get as Mock)
      .mockResolvedValueOnce({ timelines: mockTimelines })
      .mockResolvedValueOnce({ jobId: 'job-abc' });
    renderComponent();
    await screen.findByText('Timeline Alpha');
    fireEvent.click(screen.getByText('Timeline Alpha'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/timeline/job-abc');
    });
  });

  it('alerts when timeline click returns no jobId', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    setAuthenticatedUser();
    (api.get as Mock)
      .mockResolvedValueOnce({ timelines: mockTimelines })
      .mockResolvedValueOnce({});
    renderComponent();
    await screen.findByText('Timeline Alpha');
    fireEvent.click(screen.getByText('Timeline Alpha'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Unexpected response from server.');
    });
  });

  it('alerts with error message when timeline click API throws', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    setAuthenticatedUser();
    (api.get as Mock)
      .mockResolvedValueOnce({ timelines: mockTimelines })
      .mockRejectedValueOnce(new Error('Failed to load'));
    renderComponent();
    await screen.findByText('Timeline Alpha');
    fireEvent.click(screen.getByText('Timeline Alpha'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to load');
    });
  });

  it('navigates to timeline via Enter key press', async () => {
    setAuthenticatedUser();
    (api.get as Mock)
      .mockResolvedValueOnce({ timelines: mockTimelines })
      .mockResolvedValueOnce({ jobId: 'job-enter' });
    renderComponent();
    await screen.findByText('Timeline Alpha');
    fireEvent.keyDown(screen.getByText('Timeline Alpha').closest('[role="button"]')!, { key: 'Enter' });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/timeline/job-enter');
    });
  });

  //  Assessment button 

  it('navigates to degree-audit page when Assessment button is clicked', async () => {
    setAuthenticatedUser();
    (api.get as Mock).mockResolvedValue({ timelines: mockTimelines });
    renderComponent();
    await screen.findByText('Timeline Alpha');
    const assessmentButtons = screen.getAllByText('Assessment');
    fireEvent.click(assessmentButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/degree-audit/t1');
  });

  //  Delete flow 

  it('opens delete modal when delete button is clicked', async () => {
    setAuthenticatedUser();
    (api.get as Mock).mockResolvedValue({ timelines: mockTimelines });
    renderComponent();
    await screen.findByText('Timeline Alpha');
    const deleteButtons = screen.getAllByTitle('Delete Timeline');
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
  });

  it('closes delete modal when Keep it is clicked', async () => {
    setAuthenticatedUser();
    (api.get as Mock).mockResolvedValue({ timelines: mockTimelines });
    renderComponent();
    await screen.findByText('Timeline Alpha');
    fireEvent.click(screen.getAllByTitle('Delete Timeline')[0]);
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Keep it'));
    expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
  });

  it('deletes timeline and removes it from the list', async () => {
    setAuthenticatedUser();
    (api.get as Mock).mockResolvedValue({ timelines: mockTimelines });
    (api.delete as Mock).mockResolvedValue({});
    renderComponent();
    await screen.findByText('Timeline Alpha');

    fireEvent.click(screen.getAllByTitle('Delete Timeline')[0]);
    fireEvent.click(screen.getByText('Yes, Delete'));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/timeline/t1');
      expect(screen.queryByText('Timeline Alpha')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Timeline Beta')).toBeInTheDocument();
  });

  it('alerts when delete API call fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    setAuthenticatedUser();
    (api.get as Mock).mockResolvedValue({ timelines: mockTimelines });
    (api.delete as Mock).mockRejectedValue(new Error('Delete failed'));
    renderComponent();
    await screen.findByText('Timeline Alpha');

    fireEvent.click(screen.getAllByTitle('Delete Timeline')[0]);
    fireEvent.click(screen.getByText('Yes, Delete'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error deleting timeline.');
    });
  });

  //  Section heading 

  it('always renders the My Timelines heading', () => {
    setUnauthenticated();
    renderComponent();
    expect(screen.getByText('My Timelines')).toBeInTheDocument();
  });
});