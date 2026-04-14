import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AdminPage from '../../pages/AdminPage';
import { useAuth } from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth');

vi.mock('../../components/admin/MetricsTab', () => ({
  default: () => <div data-testid="metrics-tab">Metrics</div>,
}));
vi.mock('../../components/admin/DegreeManagementTab', () => ({
  default: () => <div data-testid="degree-tab">Degrees</div>,
}));
vi.mock('../../components/admin/UserManagementTab', () => ({
  default: () => <div data-testid="user-tab">Users</div>,
}));
vi.mock('../../components/admin/SeedingTab', () => ({
  default: () => <div data-testid="seeding-tab">Seeding</div>,
}));
vi.mock('../../components/admin/BackupManagementTab', () => ({
  default: () => <div data-testid="backup-management-tab">Backup Tab</div>,
}));

describe('AdminPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('shows login message when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as any);
    render(<AdminPage />);
    expect(screen.getByText(/Please log in to see your data\./i)).toBeInTheDocument();
  });

  it('renders admin dashboard heading when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    render(<AdminPage />);
    expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
  });

  it('shows all 5 tab titles', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    render(<AdminPage />);
    expect(screen.getByText('Metrics & Stats')).toBeInTheDocument();
    expect(screen.getByText('Degrees & Courses')).toBeInTheDocument();
    expect(screen.getByText('Manage Users')).toBeInTheDocument();
    expect(screen.getByText('Seed Database')).toBeInTheDocument();
    expect(screen.getByText('Backups')).toBeInTheDocument();
  });

  it('renders MetricsTab by default', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    render(<AdminPage />);
    expect(screen.getByTestId('metrics-tab')).toBeInTheDocument();
  });

  it('switches to Degrees & Courses tab on click', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    render(<AdminPage />);
    fireEvent.click(screen.getByText('Degrees & Courses'));
    expect(screen.getByTestId('degree-tab')).toBeInTheDocument();
  });

  it('switches to Manage Users tab on click', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    render(<AdminPage />);
    fireEvent.click(screen.getByText('Manage Users'));
    expect(screen.getByTestId('user-tab')).toBeInTheDocument();
  });

  it('switches to Seed Database tab on click', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    render(<AdminPage />);
    fireEvent.click(screen.getByText('Seed Database'));
    expect(screen.getByTestId('seeding-tab')).toBeInTheDocument();
  });

  it('switches to Backups tab on click', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    render(<AdminPage />);
    fireEvent.click(screen.getByText('Backups'));
    expect(screen.getByTestId('backup-management-tab')).toBeInTheDocument();
  });
});
