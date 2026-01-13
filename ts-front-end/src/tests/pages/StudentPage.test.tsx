import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import StudentPage from '../../pages/StudentPage';

/* ---------------- Mock hooks and API ---------------- */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../api/http-api-client', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('../../legacy/pages/UserPage.jsx', () => ({
  default: ({ student, timelines }: any) => (
    <div data-testid="legacy-student-page">
      <div data-testid="student-data">{JSON.stringify(student)}</div>
      <div data-testid="timelines-data">{JSON.stringify(timelines)}</div>
    </div>
  ),
}));

import { api } from '../../api/http-api-client';

const renderPage = () => {
  return render(
    <MemoryRouter>
      <StudentPage />
    </MemoryRouter>,
  );
};

/* ---------------- Tests ---------------- */
describe('StudentPage', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('shows login message when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    renderPage();

    expect(screen.getByText('Please log in to see your data.')).toBeInTheDocument();
    expect(screen.queryByTestId('legacy-student-page')).not.toBeInTheDocument();
  });

  test('fetches and displays timelines when authenticated', async () => {
    const mockUser = { id: 'user-123', name: 'John Doe', email: 'john@example.com' };
    const mockTimelines = [
      { id: 't1', name: 'Timeline 1', last_modified: '2025-01-10T10:00:00Z' },
      { id: 't2', name: 'Timeline 2', last_modified: '2025-01-20T10:00:00Z' },
      { id: 't3', name: 'Timeline 3', last_modified: '2025-01-15T10:00:00Z' },
    ];

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
    });

    vi.mocked(api.get).mockResolvedValueOnce(mockTimelines);

    renderPage();

    await waitFor(() => {
      const timelinesData = screen.getByTestId('timelines-data');
      const timelines = JSON.parse(timelinesData.textContent || '[]');
      
      expect(api.get).toHaveBeenCalledWith('/timeline/user/user-123');
      // Should be sorted: t2 (Jan 20), t3 (Jan 15), t1 (Jan 10)
      expect(timelines[0].id).toBe('t2');
      expect(timelines[1].id).toBe('t3');
      expect(timelines[2].id).toBe('t1');
    });

    expect(screen.getByTestId('legacy-student-page')).toBeInTheDocument();
    expect(screen.getByTestId('student-data')).toHaveTextContent(JSON.stringify(mockUser));
  });

  test('handles redirect after login', async () => {
    const mockUser = { id: 'user-123', name: 'John Doe' };
    localStorage.setItem('redirectAfterLogin', '/timeline/edit/123');

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
    });

    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/timeline/edit/123', { replace: true });
    });

    expect(localStorage.getItem('redirectAfterLogin')).toBeNull();
  });

  test('handles API error gracefully', async () => {
    const mockUser = { id: 'user-123', name: 'John Doe' };

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
    });

    vi.mocked(api.get).mockRejectedValueOnce(new Error('API Error'));

    renderPage();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    // Should still render the page, just with empty timelines
    expect(screen.getByTestId('legacy-student-page')).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
