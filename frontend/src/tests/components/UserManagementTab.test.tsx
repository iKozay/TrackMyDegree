import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import UserManagementTab from '../../components/admin/UserManagementTab';
import { api } from '../../api/http-api-client';

vi.mock('../../api/http-api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockUsers = [
  { _id: '1', email: 'alice@test.com', fullname: 'Alice Smith', type: 'student', createdAt: '2024-01-01' },
  { _id: '2', email: 'bob@test.com', fullname: 'Bob Jones', type: 'admin', createdAt: '2024-02-01' },
  { _id: '3', email: 'carol@test.com', fullname: 'Carol White', type: 'student', createdAt: '2024-03-01' },
];

// Component calls api.get<ApiResponse<UserDocument[]>> and reads result.data
const mockUsersResponse = { data: mockUsers };

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('UserManagementTab', () => {
  it('shows spinner while loading', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    render(<UserManagementTab />);
    expect(document.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('renders user names and emails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    render(<UserManagementTab />);
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    });
  });

  it('shows error when fetch fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Failed to load'));
    render(<UserManagementTab />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });
  });

  it('filters users by search input', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getByText('Alice Smith')).toBeInTheDocument(); });

    fireEvent.change(screen.getByPlaceholderText(/Search by name or email/i), {
      target: { value: 'alice' },
    });

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
  });

  it('filters users by role', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getByText('Alice Smith')).toBeInTheDocument(); });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'admin' } });

    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });

  it('shows user count', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    render(<UserManagementTab />);
    await waitFor(() => {
      expect(screen.getByText(/3 of 3/i)).toBeInTheDocument();
    });
  });

  it('renders Create User button', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getByText('+ Create User')).toBeInTheDocument(); });
  });

  it('opens create user modal on button click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getByText('+ Create User')).toBeInTheDocument(); });

    fireEvent.click(screen.getByText('+ Create User'));
    expect(screen.getByText('Create User')).toBeInTheDocument();
  });

  it('renders Invite Admin button', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getByText('Invite Admin')).toBeInTheDocument(); });
  });

  it('opens invite admin modal on button click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getByText('Invite Admin')).toBeInTheDocument(); });

    fireEvent.click(screen.getByText('Invite Admin'));
    expect(screen.getByText('Invite Admin User')).toBeInTheDocument();
  });

  it('calls DELETE endpoint when delete is confirmed', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockUsersResponse as any)
      .mockResolvedValueOnce(mockUsersResponse as any);
    vi.mocked(api.delete).mockResolvedValueOnce({} as any);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getAllByText('Delete')).toHaveLength(3); });

    fireEvent.click(screen.getAllByText('Delete')[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/users/1');
    });
  });

  it('does not call DELETE when delete is cancelled', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getAllByText('Delete')).toHaveLength(3); });

    fireEvent.click(screen.getAllByText('Delete')[0]);
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('opens edit modal when Edit is clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getAllByText('Edit')).toHaveLength(3); });

    fireEvent.click(screen.getAllByText('Edit')[0]);
    expect(screen.getByText('Edit User')).toBeInTheDocument();
  });

  it('submits create user form and reloads', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockUsersResponse as any)
      .mockResolvedValueOnce(mockUsersResponse as any);
    vi.mocked(api.post).mockResolvedValueOnce({} as any);

    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getByText('+ Create User')).toBeInTheDocument(); });

    fireEvent.click(screen.getByText('+ Create User'));

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'New User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users', expect.objectContaining({ email: 'new@test.com' }));
    });
  });

  it('submits edit user form with PUT and reloads', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockUsersResponse as any)
      .mockResolvedValueOnce(mockUsersResponse as any);
    vi.mocked(api.put).mockResolvedValueOnce({} as any);

    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getAllByText('Edit')).toHaveLength(3); });

    fireEvent.click(screen.getAllByText('Edit')[0]);
    await waitFor(() => { expect(screen.getByText('Edit User')).toBeInTheDocument(); });

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Alice Updated' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/users/1', expect.objectContaining({ fullname: 'Alice Updated' }));
    });
  });

  it('shows error in create modal when save fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Save error'));

    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getByText('+ Create User')).toBeInTheDocument(); });

    fireEvent.click(screen.getByText('+ Create User'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Save error')).toBeInTheDocument();
    });
  });

  it('shows alert when delete api call fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('Delete failed'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getAllByText('Delete')).toHaveLength(3); });
    fireEvent.click(screen.getAllByText('Delete')[0]);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Delete failed');
    });
  });

  it('shows singular "user" when only one user', async () => {
    const singleUser = { data: [mockUsers[0]] };
    vi.mocked(api.get).mockResolvedValueOnce(singleUser as any);
    render(<UserManagementTab />);
    await waitFor(() => {
      expect(screen.getByText(/1 of 1 user$/i)).toBeInTheDocument();
    });
  });

  it('shows error in invite modal when invite fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUsersResponse as any);
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Invite error'));

    render(<UserManagementTab />);
    await waitFor(() => { expect(screen.getByText('Invite Admin')).toBeInTheDocument(); });

    fireEvent.click(screen.getByText('Invite Admin'));
    await waitFor(() => { expect(screen.getByText('Invite Admin User')).toBeInTheDocument(); });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Admin Name' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
    fireEvent.click(screen.getByText('Send Invite'));

    await waitFor(() => {
      expect(screen.getByText('Invite error')).toBeInTheDocument();
    });
  });
});
