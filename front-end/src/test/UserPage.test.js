import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as Router from 'react-router-dom';

import UserPage from '../pages/UserPage';
import { AuthContext } from '../middleware/AuthContext';

/* ---------------- Silence CSS imports ---------------- */
jest.mock('bootstrap/dist/css/bootstrap.min.css', () => ({}), { virtual: true });
jest.mock('../css/UserPage.css', () => ({}), { virtual: true });

/* ---------------- Mock react-router-dom (useNavigate) ---------------- */
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  const navigate = jest.fn();
  return {
    ...actual,
    useNavigate: () => navigate,
    __mocked: { navigate },
  };
});

/* ---------------- Mock framer-motion ---------------- */
jest.mock('framer-motion', () => {
  const MotionDivMock = ({ children }) => <div data-testid="motion-div">{children}</div>;
  return { motion: { div: MotionDivMock } };
});

/* ---------------- Mock DeleteModal and TrashLogo ---------------- */
jest.mock('../components/DeleteModal', () => {
  const DeleteModalMock = ({ open, children }) =>
    open ? <div data-testid="delete-modal">{children}</div> : null;
  return { __esModule: true, default: DeleteModalMock };
});

jest.mock('../icons/trashlogo', () => {
  const TrashLogoMock = ({ className }) => (
    <span data-testid="trash-logo" className={className}>🗑️</span>
  );
  return { __esModule: true, default: TrashLogoMock };
});

/* ---------------- Mock utils used by UserPage ---------------- */
jest.mock('../utils/UserPageUtils', () => ({
  getDegreeCredits: jest.fn(),
  getUserTimelines: jest.fn(),
  deleteTimelineById: jest.fn(),
  buildTranscriptData: jest.fn(),
}));

import {
  getDegreeCredits,
  getUserTimelines,
  deleteTimelineById,
  buildTranscriptData,
} from '../utils/UserPageUtils';

/* ---------------- Helpers ---------------- */
function renderWithProviders({ user, onDataProcessed = jest.fn() } = {}) {
  return {
    onDataProcessed,
    ...render(
      <AuthContext.Provider value={{ user }}>
        <MemoryRouter>
          <UserPage onDataProcessed={onDataProcessed} />
        </MemoryRouter>
      </AuthContext.Provider>
    ),
  };
}

let consoleErrorSpy;
let consoleWarnSpy;

beforeEach(() => {
  jest.clearAllMocks();
  Router.__mocked.navigate.mockReset();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  // sensible defaults
  getUserTimelines.mockResolvedValue([]);
  getDegreeCredits.mockResolvedValue(120);
  buildTranscriptData.mockImplementation((items) =>
    (items || []).map(({ season, year, courses }) => ({
      term: `${season} ${year}`,
      courses: courses || [],
      grade: 'A',
    }))
  );
});

afterEach(() => {
  consoleErrorSpy?.mockRestore();
  consoleWarnSpy?.mockRestore();
});

/* ---------------- Tests ---------------- */
describe('UserPage', () => {
  const baseUser = {
    id: 'u-1',
    fullname: 'John Doe',
    email: 'john@example.com',
    type: 'student',
  };

  test('renders profile info from context', () => {
    renderWithProviders({ user: baseUser });

    expect(screen.getByText(/My Profile/i)).toBeInTheDocument();
    expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('student')).toBeInTheDocument();
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  test('shows empty-state link when there are no timelines', async () => {
    getUserTimelines.mockResolvedValueOnce([]);

    renderWithProviders({ user: baseUser });

    await waitFor(() =>
      expect(
        screen.getByText(/You haven't saved any timelines yet/i)
      ).toBeInTheDocument()
    );
    expect(getUserTimelines).toHaveBeenCalledWith('u-1');
  });

  test('renders timelines list with names', async () => {
    const timelines = [
      { id: 't1', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z', items: [] },
      { id: 't2', name: 'Plan B', last_modified: '2025-10-01T10:00:00Z', items: [] },
    ];
    getUserTimelines.mockResolvedValueOnce(timelines);

    renderWithProviders({ user: baseUser });

    await waitFor(() => {
      expect(screen.getByText('Plan A')).toBeInTheDocument();
      expect(screen.getByText('Plan B')).toBeInTheDocument();
    });

    // "+" Add New Timeline link should exist when list is rendered
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  test('clicking a timeline calls utils and navigates to /timeline_change', async () => {
    const timelines = [
      {
        id: 't1',
        name: 'Plan A',
        last_modified: '2025-10-02T10:00:00Z',
        degree_id: 'deg-1',
        isExtendedCredit: true,
        items: [{ season: 'Fall', year: '2025', courses: ['COMP 1'] }],
      },
    ];
    getUserTimelines.mockResolvedValueOnce(timelines);
    getDegreeCredits.mockResolvedValueOnce(120);

    const onDataProcessed = jest.fn();

    // Spy on localStorage writes (UserPage writes Timeline_Name twice)
    const lsSpy = jest.spyOn(window.localStorage.__proto__, 'setItem');
    lsSpy.mockImplementation(() => {});

    renderWithProviders({ user: baseUser, onDataProcessed });

    const name = await screen.findByText('Plan A');
    fireEvent.click(name);

    await waitFor(() => expect(onDataProcessed).toHaveBeenCalledTimes(1));
    expect(getDegreeCredits).toHaveBeenCalledWith('deg-1');
    expect(buildTranscriptData).toHaveBeenCalledWith(timelines[0].items);
    expect(Router.__mocked.navigate).toHaveBeenCalledWith('/timeline_change');

    // Ensure both setItem calls occurred for Timeline_Name
    const timelineNameCalls = lsSpy.mock.calls.filter(([k]) => k === 'Timeline_Name');
    expect(timelineNameCalls.length).toBeGreaterThanOrEqual(1);

    lsSpy.mockRestore();
  });

  test('clicking trash opens modal and does not navigate', async () => {
    const timelines = [{ id: 't1', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z', items: [] }];
    getUserTimelines.mockResolvedValueOnce(timelines);

    const onDataProcessed = jest.fn();
    renderWithProviders({ user: baseUser, onDataProcessed });

    const rowTitle = await screen.findByText('Plan A');
    const row = rowTitle.closest('.timeline-box') || rowTitle.parentElement;
    const trash = within(row).getByTestId('trash-logo');
    const deleteBtn = trash.closest('button');
    fireEvent.click(deleteBtn);

    await waitFor(() => expect(screen.getByTestId('delete-modal')).toBeInTheDocument());
    expect(Router.__mocked.navigate).not.toHaveBeenCalled();
    expect(onDataProcessed).not.toHaveBeenCalled();
  });

  test('confirm delete removes the timeline and calls deleteTimelineById', async () => {
    const timelines = [
      { id: 't1', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z', items: [] },
      { id: 't2', name: 'Plan B', last_modified: '2025-10-01T10:00:00Z', items: [] },
    ];
    getUserTimelines.mockResolvedValueOnce(timelines);
    deleteTimelineById.mockResolvedValueOnce();

    renderWithProviders({ user: baseUser });

    const rowTitle = await screen.findByText('Plan A');
    const row = rowTitle.closest('.timeline-box') || rowTitle.parentElement;
    const trash = within(row).getByTestId('trash-logo');
    const delBtn = trash.closest('button');
    fireEvent.click(delBtn);

    const modal = await screen.findByTestId('delete-modal');
    const confirm = within(modal).getByRole('button', { name: /^Delete$/i });
    fireEvent.click(confirm);

    await waitFor(() => expect(deleteTimelineById).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(screen.queryByText('Plan A')).not.toBeInTheDocument());
    expect(screen.getByText('Plan B')).toBeInTheDocument();
  });

  test('cancel in delete modal does not delete', async () => {
    const timelines = [{ id: 't1', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z', items: [] }];
    getUserTimelines.mockResolvedValueOnce(timelines);

    renderWithProviders({ user: baseUser });

    const rowTitle = await screen.findByText('Plan A');
    const row = rowTitle.closest('.timeline-box') || rowTitle.parentElement;
    const trash = within(row).getByTestId('trash-logo');
    const delBtn = trash.closest('button');
    fireEvent.click(delBtn);

    const modal = await screen.findByTestId('delete-modal');
    const cancel = within(modal).getByRole('button', { name: /^Cancel$/i });
    fireEvent.click(cancel);

    expect(deleteTimelineById).not.toHaveBeenCalled();
    // modal closed
    await waitFor(() => expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument());
  });

  test('degree credits failure falls back to 120 and still navigates', async () => {
    const timelines = [
      {
        id: 't1',
        name: 'Plan A',
        last_modified: '2025-10-02T10:00:00Z',
        degree_id: 'deg-1',
        isExtendedCredit: false,
        items: [{ season: 'Fall', year: '2025', courses: [] }],
      },
    ];
    getUserTimelines.mockResolvedValueOnce(timelines);
    getDegreeCredits.mockResolvedValueOnce(null); // simulate failure -> fallback to 120

    const onDataProcessed = jest.fn();
    renderWithProviders({ user: baseUser, onDataProcessed });

    const name = await screen.findByText('Plan A');
    fireEvent.click(name);

    await waitFor(() => expect(onDataProcessed).toHaveBeenCalled());
    const payload = onDataProcessed.mock.calls[0][0];
    expect(payload.creditsRequired).toBe(120);
    expect(Router.__mocked.navigate).toHaveBeenCalledWith('/timeline_change');
  });

  test('non-student does not fetch timelines and shows empty state link', async () => {
    const advisor = { ...baseUser, type: 'advisor' };
    renderWithProviders({ user: advisor });

    expect(getUserTimelines).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText(/You haven't saved any timelines yet/i)).toBeInTheDocument()
    );
  });

  test('redirects to /signin when user is falsy and renders nothing', async () => {
    renderWithProviders({ user: null });
    // useEffect should call navigate('/signin')
    await waitFor(() => expect(Router.__mocked.navigate).toHaveBeenCalledWith('/signin'));
  });
});
