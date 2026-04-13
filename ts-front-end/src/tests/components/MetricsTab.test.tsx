import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import MetricsTab from '../../components/admin/MetricsTab';
import { api } from '../../api/http-api-client';

vi.mock('../../api/http-api-client', () => ({
  api: { get: vi.fn() },
}));

// Component makes 7 simultaneous calls via Promise.allSettled:
// 1. /admin/collections/users/documents-count         → ApiResponse<{ count }>
// 2. /admin/collections/users/documents-count?...student → ApiResponse<{ count }>
// 3. /admin/collections/users/documents-count?...admin   → ApiResponse<{ count }>
// 4. /admin/collections/degrees/documents-count       → ApiResponse<{ count }>
// 5. /admin/collections/courses/documents-count       → ApiResponse<{ count }>
// 6. /admin/collections/timelines/documents-count     → ApiResponse<{ count }>
// 7. /admin/connection-status                         → DbConnectionStatus (direct)

function setupApiMocks(overrides?: { connected?: boolean; students?: number }) {
  vi.mocked(api.get)
    .mockResolvedValueOnce({ data: { count: 3 } } as any)                              // total users
    .mockResolvedValueOnce({ data: { count: overrides?.students ?? 2 } } as any)      // students
    .mockResolvedValueOnce({ data: { count: 1 } } as any)                              // admins
    .mockResolvedValueOnce({ data: { count: 42 } } as any)                             // degrees
    .mockResolvedValueOnce({ data: { count: 42 } } as any)                             // courses
    .mockResolvedValueOnce({ data: { count: 10 } } as any)                             // timelines
    .mockResolvedValueOnce({ connected: overrides?.connected ?? true } as any);        // db status
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

  it('displays student count', async () => {
    setupApiMocks({ students: 2 });
    render(<MetricsTab />);
    await waitFor(() => {
      expect(screen.getByText('Number of Students').closest('.card')).toHaveTextContent('2');
    });
  });

  it('shows DB connected status', async () => {
    setupApiMocks({ connected: true });
    render(<MetricsTab />);
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });

  it('shows DB disconnected alert when not connected', async () => {
    setupApiMocks({ connected: false });
    render(<MetricsTab />);
    await waitFor(() => {
      expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
    });
  });

  it('shows error alert when all fetches fail', async () => {
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
    // second batch for refresh
    setupApiMocks({ students: 5 });

    render(<MetricsTab />);
    await waitFor(() => { expect(screen.getByText('Refresh')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('Refresh'));
    // 7 initial + 7 refresh = 14 calls total
    await waitFor(() => { expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThanOrEqual(8); });
  });

  it('shows last refreshed timestamp after load', async () => {
    setupApiMocks();
    render(<MetricsTab />);
    await waitFor(() => {
      expect(screen.getByText(/Last refreshed/i)).toBeInTheDocument();
    });
  });
});
