import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import UserPage from '../../../legacy/pages/UserPage';

/* ---------------- Silence CSS imports ---------------- */
vi.mock('bootstrap/dist/css/bootstrap.min.css', () => ({}));
vi.mock('../../../legacy/css/UserPage.css', () => ({}));

/* ---------------- Mock framer-motion ---------------- */
vi.mock('framer-motion', () => {
  const MotionDivMock = ({ children }: any) => <div data-testid="motion-div">{children}</div>;
  return { motion: { div: MotionDivMock } };
});

/* ---------------- Mock DeleteModal ---------------- */
vi.mock('../../../legacy/components/DeleteModal', () => {
  const DeleteModalMock = ({ open, children }: any) => (open ? <div data-testid="delete-modal">{children}</div> : null);
  return { default: DeleteModalMock };
});

/* ---------------- Mock API ---------------- */
vi.mock('../../../api/http-api-client', () => ({
  api: {
    delete: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from '../../../api/http-api-client';

/* ---------------- Mock react-router-dom navigate ---------------- */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/* ---------------- Helpers ---------------- */
function renderWithRouter({ student, timelines = [] }: any = {}) {
  return render(
    <MemoryRouter>
      <UserPage student={student} timelines={timelines} />
    </MemoryRouter>,
  );
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;
let alertSpy: ReturnType<typeof vi.spyOn> | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleErrorSpy?.mockRestore();
  alertSpy?.mockRestore();
});

/* ---------------- Tests ---------------- */
describe('UserPage', () => {
  const baseUser = {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'student',
  };

  test('renders profile info from props', () => {
    renderWithRouter({ student: baseUser });

    expect(screen.getByText(/My Profile/i)).toBeInTheDocument();
    expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('student')).toBeInTheDocument();
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  test('shows empty-state link when there are no timelines', () => {
    renderWithRouter({ student: baseUser, timelines: [] });

    expect(screen.getByText(/You haven't saved any timelines yet/i)).toBeInTheDocument();
  });

  test('renders timelines list with names', () => {
    const timelines = [
      { id: 't1', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z' },
      { id: 't2', name: 'Plan B', last_modified: '2025-10-01T10:00:00Z' },
    ];
    renderWithRouter({ student: baseUser, timelines });

    expect(screen.getByText('Plan A')).toBeInTheDocument();
    expect(screen.getByText('Plan B')).toBeInTheDocument();

    // "Create New Timeline" link should exist when list is rendered
    expect(screen.getByText(/Create New Timeline/i)).toBeInTheDocument();
  });

  test('clicking a timeline navigates to the job ID', async () => {
    const timelines = [{ _id: 't1', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z' }];
    vi.mocked(api.get).mockResolvedValueOnce({ jobId: 'job123' });
    renderWithRouter({ student: baseUser, timelines });

    const name = screen.getByText('Plan A');
    fireEvent.click(name);

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/timeline/t1'));
    expect(mockNavigate).toHaveBeenCalledWith('/timeline/job123');
  });

  test('clicking delete opens modal and does not call API', async () => {
    const timelines = [{ _id: 't1', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z' }];
    renderWithRouter({ student: baseUser, timelines });

    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);

    await waitFor(() => expect(screen.getByTestId('delete-modal')).toBeInTheDocument());
    expect(api.delete).not.toHaveBeenCalled();
  });

  test('confirm delete removes the timeline and calls api.delete', async () => {
    const timelines = [
      { _id: 't1', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z' },
      { _id: 't2', name: 'Plan B', last_modified: '2025-10-01T10:00:00Z' },
    ];
    vi.mocked(api.delete).mockResolvedValueOnce(undefined as any);

    renderWithRouter({ student: baseUser, timelines });

    const deleteBtn = screen.getAllByTitle('Delete')[0];
    fireEvent.click(deleteBtn);

    const modal = await screen.findByTestId('delete-modal');
    const confirm = within(modal).getByRole('button', { name: /Yes, Delete/i });
    fireEvent.click(confirm);

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/timeline/t1'));
    await waitFor(() => expect(screen.queryByText('Plan A')).not.toBeInTheDocument());
    expect(screen.getByText('Plan B')).toBeInTheDocument();
  });

  test('cancel in delete modal does not delete', async () => {
    const timelines = [{ _id: 't1', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z' }];
    renderWithRouter({ student: baseUser, timelines });

    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);

    const modal = await screen.findByTestId('delete-modal');
    const cancel = within(modal).getByRole('button', { name: /Keep it/i });
    fireEvent.click(cancel);

    expect(api.delete).not.toHaveBeenCalled();
    // modal closed
    await waitFor(() => expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument());
  });

  test('renders with default values when user is not provided', () => {
    renderWithRouter({ student: null, timelines: [] });

    expect(screen.getAllByText('N/A').length).toBe(2); // Default name and email in table
    expect(screen.getByText('Student')).toBeInTheDocument(); // Default role
    expect(screen.getAllByText('Full Name').length).toBeGreaterThanOrEqual(1); // Appears as heading and label
  });
});
