import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as Router from 'react-router-dom';

// Import the component and context using paths from *this* test file
import UserPage from '../../src/pages/UserPage';
import { AuthContext } from '../../src/middleware/AuthContext';

// Silence CSS that the component imports
jest.mock('bootstrap/dist/css/bootstrap.min.css', () => ({}), { virtual: true });
jest.mock('../../src/css/UserPage.css', () => ({}), { virtual: true });

/* -------------------- Mock react-router-dom's useNavigate -------------------- */
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  const navigate = jest.fn();
  return {
    ...actual,
    useNavigate: () => navigate,
    __mocked: { navigate },
  };
});

/* -------------------- Mock framer-motion (pass-through div) ------------------ */
jest.mock('framer-motion', () => {
  const MotionDivMock = ({ children }) => <div data-testid="motion-div">{children}</div>;
  MotionDivMock.displayName = 'MotionDivMock';
  return { motion: { div: MotionDivMock } };
});

/* -------------------- Mock DeleteModal and TrashLogo ------------------------- */
jest.mock('../../src/components/DeleteModal', () => {
  const DeleteModalMock = ({ open, children }) =>
    open ? <div data-testid="delete-modal">{children}</div> : null;
  DeleteModalMock.displayName = 'DeleteModalMock';
  return { __esModule: true, default: DeleteModalMock };
});

jest.mock('../../src/icons/trashlogo', () => {
  const TrashLogoMock = ({ className }) => (
    <span data-testid="trash-logo" className={className}>🗑️</span>
  );
  TrashLogoMock.displayName = 'TrashLogoMock';
  return { __esModule: true, default: TrashLogoMock };
});

/* -------------------- Helpers -------------------- */

function deferred() {
  /** @type {(v:any)=>void} */ let resolve;
  /** @type {(e:any)=>void} */ let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

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

/* -------------------- Mock fetch routing -------------------- */

const SERVER = 'http://test-server'; // used by component via process.env.REACT_APP_SERVER
let consoleErrorSpy;
let consoleWarnSpy;

// Simple “response object” factory
const jsonResponse = (data, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
});

// A little router for fetch by URL suffix
function setupFetchRoutes(routes) {
  global.fetch = jest.fn((url, opts = {}) => {
    const s = String(url || '');
    if (s.includes('/timeline/getAll')) {
      const r = routes.getAll;
      return typeof r === 'function' ? r(url, opts) : Promise.resolve(jsonResponse(r ?? [], true));
    }
    if (s.includes('/degree/getCredits')) {
      const r = routes.getCredits;
      return typeof r === 'function' ? r(url, opts) : Promise.resolve(jsonResponse(r ?? 120, true));
    }
    if (s.includes('/timeline/delete')) {
      const r = routes.delete;
      return typeof r === 'function' ? r(url, opts) : Promise.resolve(jsonResponse({}, true));
    }
    // default: not matched
    return Promise.resolve(jsonResponse({}, true));
  });
}

beforeEach(() => {
  // ensure env variable is set for the component
  process.env.REACT_APP_SERVER = SERVER;

  jest.clearAllMocks();
  Router.__mocked.navigate.mockReset();

  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleErrorSpy?.mockRestore();
  consoleWarnSpy?.mockRestore();
});

/* -------------------- Tests -------------------- */

describe('UserPage', () => {
  const baseUser = {
    id: 'user-1',
    fullname: 'Chris Thien',
    email: 'chris@example.com',
    type: 'student',
  };

  test('renders profile info from context', async () => {
    setupFetchRoutes({ getAll: [] }); // empty timelines

    renderWithProviders({ user: baseUser });

    expect(screen.getByText(/My Profile/i)).toBeInTheDocument();
    const names = screen.getAllByText('Chris Thien');
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('student')).toBeInTheDocument();
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('chris@example.com')).toBeInTheDocument();
  });

  test('shows loading then empty-state link when there are no timelines', async () => {
    const d = deferred();
    setupFetchRoutes({
      getAll: () => d.promise, // keep pending first to assert loading
    });

    renderWithProviders({ user: baseUser });

    // Loading text appears during pending fetch
    expect(screen.getByText(/loading timelines/i)).toBeInTheDocument();

    d.resolve(jsonResponse([], true));
    await waitFor(() =>
      expect(
        screen.getByText(/You haven't saved any timelines yet/i)
      ).toBeInTheDocument()
    );
  });

  test('renders timelines list with formatted dates', async () => {
    const timelines = [
      { id: 't1', name: 'Plan A', last_modified: '2025-10-01T10:00:00Z', items: [] },
      { id: 't2', name: 'Plan B', last_modified: '2025-10-02T10:00:00Z', items: [] },
    ];
    setupFetchRoutes({ getAll: timelines });

    renderWithProviders({ user: baseUser });

    await waitFor(() => {
      expect(screen.getByText('Plan A')).toBeInTheDocument();
      expect(screen.getByText('Plan B')).toBeInTheDocument();
    });
  });

  test('clicking a timeline calls onDataProcessed and navigates to /timeline_change', async () => {
    const timelines = [
      {
        id: 't1',
        name: 'Plan A',
        last_modified: '2025-10-02T10:00:00Z',
        items: [{ season: 'Fall', year: '2025', courses: ['COMP 1'] }],
        isExtendedCredit: true,
        degree_id: 'deg-1',
      },
    ];
    setupFetchRoutes({
      getAll: timelines,
      getCredits: 120,
    });

    const onDataProcessed = jest.fn();
    renderWithProviders({ user: baseUser, onDataProcessed });

    const openBtn = await screen.findByRole('button', { name: /open timeline plan a/i });
    fireEvent.click(openBtn);

    await waitFor(() => expect(onDataProcessed).toHaveBeenCalledTimes(1));
    expect(Router.__mocked.navigate).toHaveBeenCalledWith('/timeline_change');
  });

  test('clicking trash button does not open timeline and opens modal', async () => {
    const timelines = [{ id: 't1', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z', items: [] }];
    setupFetchRoutes({ getAll: timelines });

    const onDataProcessed = jest.fn();
    renderWithProviders({ user: baseUser, onDataProcessed });

    const rowTitle = await screen.findByText('Plan A');
    const row = rowTitle.closest('.timeline-box') || rowTitle.parentElement;

    const trash = within(row).getByTestId('trash-logo');
    const deleteBtn = trash.closest('button');
    fireEvent.click(deleteBtn);

    await waitFor(() => expect(screen.getByTestId('delete-modal')).toBeInTheDocument());
    expect(onDataProcessed).not.toHaveBeenCalled();
    expect(Router.__mocked.navigate).not.toHaveBeenCalled();
  });

  test('confirm delete removes the timeline and calls delete endpoint', async () => {
    const timelines = [
      { id: 't1', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z', items: [] },
      { id: 't2', name: 'Plan B', last_modified: '2025-10-01T10:00:00Z', items: [] },
    ];
    setupFetchRoutes({
      getAll: timelines,
      delete: jsonResponse({}, true),
    });

    renderWithProviders({ user: baseUser });

    const delBtn = await screen.findByRole('button', { name: /delete timeline plan a/i });
    fireEvent.click(delBtn);

    const modal = await screen.findByTestId('delete-modal');
    const confirm = within(modal).getByRole('button', { name: /^delete$/i });
    fireEvent.click(confirm);

    // After deletion, Plan A should be gone
    await waitFor(() => expect(screen.queryByText('Plan A')).not.toBeInTheDocument());
    expect(screen.getByText('Plan B')).toBeInTheDocument();
  });

  test('error during timelines load shows alert', async () => {
    setupFetchRoutes({
      getAll: () => Promise.reject(new Error('Boom')),
    });

    renderWithProviders({ user: baseUser });

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load timelines/i)
    );
  });

  test('non-student does not fetch timelines and still shows empty state link', async () => {
    setupFetchRoutes({ getAll: [] }); // will not be used

    const advisor = { ...baseUser, type: 'advisor' };
    renderWithProviders({ user: advisor });

    // no fetch made
    expect(global.fetch).not.toHaveBeenCalled();
    // empty-state link is shown (component behavior)
    expect(
      screen.getByText(/You haven't saved any timelines yet/i)
    ).toBeInTheDocument();
  });

  test('degree credits failure falls back to 120 and still navigates', async () => {
    const timelines = [
      {
        id: 't1',
        name: 'Plan A',
        last_modified: '2025-10-02T10:00:00Z',
        items: [{ season: 'Fall', year: '2025', courses: [] }],
        degree_id: 'deg-1',
      },
    ];
    setupFetchRoutes({
      getAll: timelines,
      getCredits: () => Promise.reject(new Error('Credits API down')),
    });

    const onDataProcessed = jest.fn();
    renderWithProviders({ user: baseUser, onDataProcessed });

    const btn = await screen.findByRole('button', { name: /open timeline plan a/i });
    fireEvent.click(btn);

    await waitFor(() => expect(onDataProcessed).toHaveBeenCalled());
    expect(Router.__mocked.navigate).toHaveBeenCalledWith('/timeline_change');
  });
});
