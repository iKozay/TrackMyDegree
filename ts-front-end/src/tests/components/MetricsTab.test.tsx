import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import MetricsTab from '../../components/admin/MetricsTab';
import { api } from '../../api/http-api-client';

vi.mock('../../api/http-api-client', () => ({
  api: { get: vi.fn() },
}));

const mockUsers = [
  { _id: '1', email: 'a@test.com', fullname: 'Alice', type: 'student' },
  { _id: '2', email: 'b@test.com', fullname: 'Bob', type: 'student' },
  { _id: '3', email: 'c@test.com', fullname: 'Charlie', type: 'admin' },
];

const mockDbStatus = { connected: true };
const mockCollectionData = { total: 42 };

function setupApiMocks() {
  vi.mocked(api.get)
    .mockResolvedValueOnce(mockUsers as any)           // /users
    .mockResolvedValueOnce(mockCollectionData as any)  // degrees
    .mockResolvedValueOnce(mockCollectionData as any)  // courses
    .mockResolvedValueOnce({ total: 10 } as any)       // timelines
    .mockResolvedValueOnce(mockDbStatus as any);       // connection-status
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('MetricsTab', () => {
  it('shows a spinner while loading', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    render(<MetricsTab />);
    expect(document.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('renders stat cards after successful fetch', async () => {
    setupApiMocks();
    render(<MetricsTab />);
    await waitFor(() => {
      expect(screen.getByText('Number of Students')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Timelines')).toBeInTheDocument();
    expect(screen.getByText('Degrees')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });

  it('displays student count from user list', async () => {
    setupApiMocks();
    render(<MetricsTab />);
    await waitFor(() => {
      // 2 students in mock data
      expect(screen.getByText('Number of Students').closest('.card')).toHaveTextContent('2');
    });
  });

  it('shows DB connected status', async () => {
    setupApiMocks();
    render(<MetricsTab />);
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });

  it('shows DB disconnected alert when not connected', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce({ total: 0 } as any)
      .mockResolvedValueOnce({ total: 0 } as any)
      .mockResolvedValueOnce({ total: 0 } as any)
      .mockResolvedValueOnce({ connected: false } as any);
    render(<MetricsTab />);
    await waitFor(() => {
      expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
    });
  });

  it('shows error alert when fetch fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    render(<MetricsTab />);
    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('renders a Refresh button', async () => {
    setupApiMocks();
    render(<MetricsTab />);
    await waitFor(() => { expect(screen.getByText('Refresh')).toBeInTheDocument(); });
  });

  it('re-fetches data when Refresh is clicked', async () => {
    setupApiMocks();
    // second call sequence for refresh
    vi.mocked(api.get)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce({ total: 5 } as any)
      .mockResolvedValueOnce({ total: 5 } as any)
      .mockResolvedValueOnce({ total: 5 } as any)
      .mockResolvedValueOnce(mockDbStatus as any);

    render(<MetricsTab />);
    await waitFor(() => { expect(screen.getByText('Refresh')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('Refresh'));
    // api.get called again (second batch of 5 calls)
    await waitFor(() => { expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThanOrEqual(6); });
  });

  it('shows last refreshed timestamp after load', async () => {
    setupApiMocks();
    render(<MetricsTab />);
    await waitFor(() => {
      expect(screen.getByText(/Last refreshed/i)).toBeInTheDocument();
    });
  });
});
