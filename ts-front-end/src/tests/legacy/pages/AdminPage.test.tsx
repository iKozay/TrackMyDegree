// src/components/__tests__/AdminPage.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AdminPage from '../../../legacy/pages/AdminPage';

// Mock hooks instead of fetch
vi.mock('../../../legacy/hooks/useBackupManager', () => ({
  default: vi.fn(),
}));

vi.mock('../../../legacy/hooks/useDatabaseTables', () => ({
  default: vi.fn(),
}));

vi.mock('../../../legacy/hooks/useTableRecords', () => ({
  default: vi.fn(),
}));

// Mock api
vi.mock('../../../api/http-api-client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import useBackupManagerActual from '../../../legacy/hooks/useBackupManager';
import useDatabaseTablesActual from '../../../legacy/hooks/useDatabaseTables';
import useTableRecordsActual from '../../../legacy/hooks/useTableRecords';
import * as httpApiClient from '../../../api/http-api-client';

const useBackupManager = vi.mocked(useBackupManagerActual);
const useDatabaseTables = vi.mocked(useDatabaseTablesActual);
const useTableRecords = vi.mocked(useTableRecordsActual);
const api = vi.mocked(httpApiClient.api);

vi.stubGlobal('alert', vi.fn());

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock SearchBar
vi.mock('../../../legacy/components/SearchBar', () => ({
  default: ({ onSearch }: any) => {
    return <input data-testid="search-bar" placeholder="Search..." onChange={(e) => onSearch(e.target.value)} />;
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('AdminPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }

    // Setup default mock implementations for hooks
    useBackupManager.mockReturnValue({
      backups: [],
      selectedBackup: '',
      setSelectedBackup: vi.fn(),
      loading: false,
      error: null,
      createBackup: vi.fn(),
      restoreBackup: vi.fn(),
      deleteBackup: vi.fn(),
      refreshBackups: vi.fn(),
    } as any);

    useDatabaseTables.mockReturnValue({
      tables: [],
      selectedTable: null,
      loading: false,
      error: '',
      handleTableSelect: vi.fn(),
      refreshTables: vi.fn(),
    } as any);

    useTableRecords.mockReturnValue({
      records: [],
      columns: [],
      loading: false,
      error: '',
      fetchRecords: vi.fn(),
      handleSearch: vi.fn(),
    } as any);
  });

  describe('initial loading', () => {
    it('should show loading spinner initially', () => {
      useDatabaseTables.mockReturnValue({
        tables: [],
        selectedTable: null,
        loading: true,
        error: '',
        handleTableSelect: vi.fn(),
        refreshTables: vi.fn(),
      } as any);

      renderWithRouter(<AdminPage />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should fetch tables and backups on mount', async () => {
      useBackupManager.mockReturnValue({
        backups: ['backup1.sql'],
        selectedBackup: '',
        setSelectedBackup: vi.fn(),
        loading: false,
        error: null,
        createBackup: vi.fn(),
        restoreBackup: vi.fn(),
        deleteBackup: vi.fn(),
        refreshBackups: vi.fn(),
      } as any);

      useDatabaseTables.mockReturnValue({
        tables: ['users', 'courses'],
        selectedTable: null,
        loading: false,
        error: '',
        handleTableSelect: vi.fn(),
        refreshTables: vi.fn(),
      } as any);

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Tables')).toBeInTheDocument();
      });
    });
  });

  describe('tables and records display', () => {
    beforeEach(() => {
      useBackupManager.mockReturnValue({
        backups: [],
        selectedBackup: '',
        setSelectedBackup: vi.fn(),
        loading: false,
        error: null,
        createBackup: vi.fn(),
        restoreBackup: vi.fn(),
        deleteBackup: vi.fn(),
        refreshBackups: vi.fn(),
      } as any);

      useDatabaseTables.mockReturnValue({
        tables: ['users', 'courses'],
        selectedTable: null,
        loading: false,
        error: '',
        handleTableSelect: vi.fn(),
        refreshTables: vi.fn(),
      } as any);

      useTableRecords.mockReturnValue({
        records: [],
        columns: [],
        loading: false,
        error: '',
        fetchRecords: vi.fn(),
        handleSearch: vi.fn(),
      } as any);
    });

    it('should display tables list after loading', async () => {
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Tables')).toBeInTheDocument();
        expect(screen.getByText('users')).toBeInTheDocument();
        expect(screen.getByText('courses')).toBeInTheDocument();
      });
    });

    it('should fetch and display records when table is selected', async () => {
      const mockRecords = [
        { id: 1, name: 'John', email: 'john@test.com' },
        { id: 2, name: 'Jane', email: 'jane@test.com' },
      ];

      useDatabaseTables.mockReturnValue({
        tables: ['users', 'courses'],
        selectedTable: 'users',
        loading: false,
        error: '',
        handleTableSelect: vi.fn(),
        refreshTables: vi.fn(),
      } as any);

      useTableRecords.mockReturnValue({
        records: mockRecords,
        columns: ['id', 'name', 'email'],
        loading: false,
        error: '',
        fetchRecords: vi.fn(),
        handleSearch: vi.fn(),
      } as any);

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });
    });

    it('should show "Select a table" message initially', async () => {
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Select a table to view its records.')).toBeInTheDocument();
      });
    });
  });

  describe('search functionality', () => {
    it('should search records when search is performed', async () => {
      const mockHandleSearch = vi.fn();

      useDatabaseTables.mockReturnValue({
        tables: ['users'],
        selectedTable: 'users',
        loading: false,
        error: '',
        handleTableSelect: vi.fn(),
        refreshTables: vi.fn(),
      } as any);

      useTableRecords.mockReturnValue({
        records: [{ id: 1, name: 'John' }],
        columns: ['id', 'name'],
        loading: false,
        error: '',
        fetchRecords: vi.fn(),
        handleSearch: mockHandleSearch,
      } as any);

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      });

      const searchBar = screen.getByTestId('search-bar');
      fireEvent.change(searchBar, { target: { value: 'john' } });

      await waitFor(() => {
        expect(mockHandleSearch).toHaveBeenCalledWith('users', 'john');
      });
    });
  });

  // Skipping these tests until the feature is enabled
  describe.skip('backup management', () => {
    beforeEach(() => {
      useBackupManager.mockReturnValue({
        backups: ['backup1.sql', 'backup2.sql'],
        selectedBackup: '',
        setSelectedBackup: vi.fn(),
        loading: false,
        error: null,
        createBackup: vi.fn().mockResolvedValue({ success: true, message: 'Backup created successfully' }),
        restoreBackup: vi.fn(),
        deleteBackup: vi.fn(),
        refreshBackups: vi.fn(),
      } as any);

      useDatabaseTables.mockReturnValue({
        tables: ['users'],
        selectedTable: null,
        loading: false,
        error: '',
        handleTableSelect: vi.fn(),
        refreshTables: vi.fn(),
      } as any);

      useTableRecords.mockReturnValue({
        records: [],
        columns: [],
        loading: false,
        error: '',
        fetchRecords: vi.fn(),
        handleSearch: vi.fn(),
      } as any);
    });

    it('should display backup management section', async () => {
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Database Backups')).toBeInTheDocument();
        expect(screen.getByText('Create Backup')).toBeInTheDocument();
      });
    });

    it('should create backup when create button is clicked', async () => {
      const mockCreateBackup = vi.fn().mockResolvedValue({ success: true, message: 'Backup created successfully' });
      useBackupManager.mockReturnValue({
        backups: ['backup1.sql', 'backup2.sql'],
        selectedBackup: '',
        setSelectedBackup: vi.fn(),
        loading: false,
        error: null,
        createBackup: mockCreateBackup,
        restoreBackup: vi.fn(),
        deleteBackup: vi.fn(),
        refreshBackups: vi.fn(),
      } as any);

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Create Backup')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Backup');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateBackup).toHaveBeenCalled();
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('successfully'));
      });
    });

    it('should display available backups in dropdown', async () => {
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('backup1.sql')).toBeInTheDocument();
        expect(screen.getByText('backup2.sql')).toBeInTheDocument();
      });
    });
  });

  describe('seed data functionality', () => {
    beforeEach(() => {
      useBackupManager.mockReturnValue({
        backups: [],
        selectedBackup: '',
        setSelectedBackup: vi.fn(),
        loading: false,
        error: null,
        createBackup: vi.fn(),
        restoreBackup: vi.fn(),
        deleteBackup: vi.fn(),
        refreshBackups: vi.fn(),
      } as any);

      useDatabaseTables.mockReturnValue({
        tables: ['users'],
        selectedTable: null,
        loading: false,
        error: '',
        handleTableSelect: vi.fn(),
        refreshTables: vi.fn(),
      } as any);

      useTableRecords.mockReturnValue({
        records: [],
        columns: [],
        loading: false,
        error: '',
        fetchRecords: vi.fn(),
        handleSearch: vi.fn(),
      } as any);
    });

    it('should display seed database button', async () => {
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Seed Database with JSON')).toBeInTheDocument();
      });
    });

    it('should seed database when button is clicked', async () => {
      api.get.mockResolvedValueOnce({
        success: true,
      });

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Seed Database with JSON')).toBeInTheDocument();
      });

      const seedButton = screen.getByText('Seed Database with JSON');
      fireEvent.click(seedButton);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/admin/seed-data',
          {},
          expect.objectContaining({
            credentials: 'include',
          }),
        );
        expect(alert).toHaveBeenCalledWith('Data seeding successful!');
      });
    });

    it('should show loading state when seeding', async () => {
      api.get.mockReturnValue(new Promise(() => {})); // Never resolves

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Seed Database with JSON')).toBeInTheDocument();
      });

      const seedButton = screen.getByText('Seed Database with JSON');
      fireEvent.click(seedButton);

      await waitFor(() => {
        expect(screen.getByText('Seeding...')).toBeInTheDocument();
      });
    });

    it('should handle seed data failure', async () => {
      api.get.mockResolvedValueOnce({
        success: false,
        message: 'Seeding failed',
      });

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Seed Database with JSON')).toBeInTheDocument();
      });

      const seedButton = screen.getByText('Seed Database with JSON');
      fireEvent.click(seedButton);

      await waitFor(() => {
        expect(alert).toHaveBeenCalledWith('Data seeding failed: Seeding failed');
      });
    });
  });

  describe('error handling', () => {
    it('should display error message when tables fetch fails', async () => {
      useDatabaseTables.mockReturnValue({
        tables: [],
        selectedTable: null,
        loading: false,
        error: 'Error fetching table list',
        handleTableSelect: vi.fn(),
        refreshTables: vi.fn(),
      } as any);

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Error fetching table list')).toBeInTheDocument();
      });
    });

  });

  describe('user workflows', () => {
    it('should handle complete table selection and search workflow', async () => {
      const mockHandleTableSelect = vi.fn();
      const mockHandleSearch = vi.fn();

      useBackupManager.mockReturnValue({
        backups: [],
        selectedBackup: '',
        setSelectedBackup: vi.fn(),
        loading: false,
        error: null,
        createBackup: vi.fn(),
        restoreBackup: vi.fn(),
        deleteBackup: vi.fn(),
        refreshBackups: vi.fn(),
      } as any);

      useDatabaseTables.mockReturnValue({
        tables: ['users', 'courses'],
        selectedTable: 'users',
        loading: false,
        error: '',
        handleTableSelect: mockHandleTableSelect,
        refreshTables: vi.fn(),
      } as any);

      useTableRecords.mockReturnValue({
        records: [{ id: 1, name: 'John' }],
        columns: ['id', 'name'],
        loading: false,
        error: '',
        fetchRecords: vi.fn(),
        handleSearch: mockHandleSearch,
      } as any);

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      });

      const searchBar = screen.getByTestId('search-bar');
      fireEvent.change(searchBar, { target: { value: 'john' } });

      await waitFor(() => {
        expect(mockHandleSearch).toHaveBeenCalledWith('users', 'john');
      });
    });
  });
});
