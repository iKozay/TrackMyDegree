import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import SeedingTab from '../../components/admin/SeedingTab';
import { api } from '../../api/http-api-client';

vi.mock('../../api/http-api-client', () => ({
  api: { get: vi.fn() },
}));

// Component initial load uses Promise.allSettled with 2 calls:
// 1. /admin/collections/degrees/documents  → ApiResponse<DegreeData[]> (access .data)
// 2. /admin/connection-status              → DbConnectionStatus (direct)

const mockDegrees = [
  { _id: 'd1', name: 'BEng Software Engineering', totalCredits: 120 },
  { _id: 'd2', name: 'BCompSc Computer Science', totalCredits: 90 },
];

function setupInitialMocks(connected = true) {
  vi.mocked(api.get)
    .mockResolvedValueOnce({ data: mockDegrees } as any)  // degrees (ApiResponse wrapped)
    .mockResolvedValueOnce({ connected } as any);          // db status
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('SeedingTab', () => {
  it('shows spinner while loading initial data', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    render(<SeedingTab />);
    expect(document.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('renders DB connection status when connected', async () => {
    setupInitialMocks(true);
    render(<SeedingTab />);
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });

  it('shows disconnected status when DB is down', async () => {
    setupInitialMocks(false);
    render(<SeedingTab />);
    await waitFor(() => {
      expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
    });
  });

  it('renders Seed All Degrees button', async () => {
    setupInitialMocks();
    render(<SeedingTab />);
    await waitFor(() => {
      // Use getByRole to target the button specifically (the card header also has this text in a <strong>)
      expect(screen.getByRole('button', { name: 'Seed All Degrees' })).toBeInTheDocument();
    });
  });

  it('renders the degree selector with options', async () => {
    setupInitialMocks();
    render(<SeedingTab />);
    await waitFor(() => {
      expect(screen.getByText('BEng Software Engineering')).toBeInTheDocument();
      expect(screen.getByText('BCompSc Computer Science')).toBeInTheDocument();
    });
  });

  it('calls seed-data endpoint when Seed All is clicked', async () => {
    setupInitialMocks();
    vi.mocked(api.get).mockResolvedValueOnce({ success: true, message: 'All seeded' } as any);

    render(<SeedingTab />);
    const seedBtn = await screen.findByRole('button', { name: 'Seed All Degrees' });
    fireEvent.click(seedBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/admin/seed-data');
    });
  });

  it('shows success result after seeding', async () => {
    setupInitialMocks();
    vi.mocked(api.get).mockResolvedValueOnce({ success: true, message: 'Seeding complete' } as any);

    render(<SeedingTab />);
    const seedBtn = await screen.findByRole('button', { name: 'Seed All Degrees' });
    fireEvent.click(seedBtn);

    await waitFor(() => {
      expect(screen.getByText(/Seeding complete/i)).toBeInTheDocument();
    });
  });

  it('shows error result when seeding fails', async () => {
    setupInitialMocks();
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Seed failed'));

    render(<SeedingTab />);
    const seedBtn = await screen.findByRole('button', { name: 'Seed All Degrees' });
    fireEvent.click(seedBtn);

    await waitFor(() => {
      expect(screen.getByText(/Seed failed/i)).toBeInTheDocument();
    });
  });

  it('calls seed-data/:degreeName when specific degree is seeded', async () => {
    setupInitialMocks();
    vi.mocked(api.get).mockResolvedValueOnce({ success: true, message: 'Done' } as any);

    render(<SeedingTab />);
    await waitFor(() => { expect(screen.getByText('BEng Software Engineering')).toBeInTheDocument(); });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'BEng Software Engineering' } });
    fireEvent.click(screen.getByText('Seed Selected Degree'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/admin/seed-data/BEng%20Software%20Engineering'));
    });
  });

  it('dismisses result alert on close', async () => {
    setupInitialMocks();
    vi.mocked(api.get).mockResolvedValueOnce({ success: true, message: 'All done' } as any);

    render(<SeedingTab />);
    const seedBtn = await screen.findByRole('button', { name: 'Seed All Degrees' });
    fireEvent.click(seedBtn);

    await waitFor(() => { expect(screen.getByText(/All done/i)).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => {
      expect(screen.queryByText(/All done/i)).not.toBeInTheDocument();
    });
  });
});
