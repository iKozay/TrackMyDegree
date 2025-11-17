// src/components/__tests__/AdminPage.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminPage from '../pages/AdminPage';

// Mock hooks instead of fetch
jest.mock('../pages/AdminPage/hooks/useBackupManager', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../pages/AdminPage/hooks/useDatabaseTables', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../pages/AdminPage/hooks/useTableRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock api
jest.mock('../api/http-api-client', () => ({
  api: {
    post: jest.fn(),
  },
}));

import useBackupManager from '../pages/AdminPage/hooks/useBackupManager';
import useDatabaseTables from '../pages/AdminPage/hooks/useDatabaseTables';
import useTableRecords from '../pages/AdminPage/hooks/useTableRecords';
import { api } from '../api/http-api-client';

global.alert = jest.fn();

// Helper to create mock headers
const createMockHeaders = () => ({
  get: (name) => {
    if (name === 'Content-Type') return 'application/json';
    return null;
  },
});

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock SearchBar
jest.mock('../components/SearchBar', () => {
  return function MockSearchBar({ onSearch }) {
    return <input data-testid="search-bar" placeholder="Search..." onChange={(e) => onSearch(e.target.value)} />;
  };
});

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('AdminPage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }

    // Setup default mock implementations for hooks
    useBackupManager.mockReturnValue({
      backups: [],
      selectedBackup: '',
      setSelectedBackup: jest.fn(),
      loading: false,
      error: null,
      createBackup: jest.fn(),
      restoreBackup: jest.fn(),
      deleteBackup: jest.fn(),
      refreshBackups: jest.fn(),
    });

    useDatabaseTables.mockReturnValue({
      tables: [],
      selectedTable: null,
      loading: false,
      error: '',
      handleTableSelect: jest.fn(),
      refreshTables: jest.fn(),
    });

    useTableRecords.mockReturnValue({
      records: [],
      columns: [],
      loading: false,
      error: '',
      fetchRecords: jest.fn(),
      handleSearch: jest.fn(),
    });
  });

  describe('initial loading', () => {
    it('should show loading spinner initially', () => {
      useDatabaseTables.mockReturnValue({
        tables: [],
        selectedTable: null,
        loading: true,
        error: '',
        handleTableSelect: jest.fn(),
        refreshTables: jest.fn(),
      });

      renderWithRouter(<AdminPage />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should fetch tables and backups on mount', async () => {
      useBackupManager.mockReturnValue({
        backups: ['backup1.sql'],
        selectedBackup: '',
        setSelectedBackup: jest.fn(),
        loading: false,
        error: null,
        createBackup: jest.fn(),
        restoreBackup: jest.fn(),
        deleteBackup: jest.fn(),
        refreshBackups: jest.fn(),
      });

      useDatabaseTables.mockReturnValue({
        tables: ['users', 'courses'],
        selectedTable: null,
        loading: false,
        error: '',
        handleTableSelect: jest.fn(),
        refreshTables: jest.fn(),
      });

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
        setSelectedBackup: jest.fn(),
        loading: false,
        error: null,
        createBackup: jest.fn(),
        restoreBackup: jest.fn(),
        deleteBackup: jest.fn(),
        refreshBackups: jest.fn(),
      });

      useDatabaseTables.mockReturnValue({
        tables: ['users', 'courses'],
        selectedTable: null,
        loading: false,
        error: '',
        handleTableSelect: jest.fn(),
        refreshTables: jest.fn(),
      });

      useTableRecords.mockReturnValue({
        records: [],
        columns: [],
        loading: false,
        error: '',
        fetchRecords: jest.fn(),
        handleSearch: jest.fn(),
      });
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
        handleTableSelect: jest.fn(),
        refreshTables: jest.fn(),
      });

      useTableRecords.mockReturnValue({
        records: mockRecords,
        columns: ['id', 'name', 'email'],
        loading: false,
        error: '',
        fetchRecords: jest.fn(),
        handleSearch: jest.fn(),
      });

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
      const mockHandleSearch = jest.fn();

      useDatabaseTables.mockReturnValue({
        tables: ['users'],
        selectedTable: 'users',
        loading: false,
        error: '',
        handleTableSelect: jest.fn(),
        refreshTables: jest.fn(),
      });

      useTableRecords.mockReturnValue({
        records: [{ id: 1, name: 'John' }],
        columns: ['id', 'name'],
        loading: false,
        error: '',
        fetchRecords: jest.fn(),
        handleSearch: mockHandleSearch,
      });

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

  describe('backup management', () => {
    beforeEach(() => {
      useBackupManager.mockReturnValue({
        backups: ['backup1.sql', 'backup2.sql'],
        selectedBackup: '',
        setSelectedBackup: jest.fn(),
        loading: false,
        error: null,
        createBackup: jest.fn().mockResolvedValue({ success: true, message: 'Backup created successfully' }),
        restoreBackup: jest.fn(),
        deleteBackup: jest.fn(),
        refreshBackups: jest.fn(),
      });

      useDatabaseTables.mockReturnValue({
        tables: ['users'],
        selectedTable: null,
        loading: false,
        error: '',
        handleTableSelect: jest.fn(),
        refreshTables: jest.fn(),
      });

      useTableRecords.mockReturnValue({
        records: [],
        columns: [],
        loading: false,
        error: '',
        fetchRecords: jest.fn(),
        handleSearch: jest.fn(),
      });
    });

    it('should display backup management section', async () => {
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Database Backups')).toBeInTheDocument();
        expect(screen.getByText('Create Backup')).toBeInTheDocument();
      });
    });

    it('should create backup when create button is clicked', async () => {
      const mockCreateBackup = jest.fn().mockResolvedValue({ success: true, message: 'Backup created successfully' });
      useBackupManager.mockReturnValue({
        backups: ['backup1.sql', 'backup2.sql'],
        selectedBackup: '',
        setSelectedBackup: jest.fn(),
        loading: false,
        error: null,
        createBackup: mockCreateBackup,
        restoreBackup: jest.fn(),
        deleteBackup: jest.fn(),
        refreshBackups: jest.fn(),
      });

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
        setSelectedBackup: jest.fn(),
        loading: false,
        error: null,
        createBackup: jest.fn(),
        restoreBackup: jest.fn(),
        deleteBackup: jest.fn(),
        refreshBackups: jest.fn(),
      });

      useDatabaseTables.mockReturnValue({
        tables: ['users'],
        selectedTable: null,
        loading: false,
        error: '',
        handleTableSelect: jest.fn(),
        refreshTables: jest.fn(),
      });

      useTableRecords.mockReturnValue({
        records: [],
        columns: [],
        loading: false,
        error: '',
        fetchRecords: jest.fn(),
        handleSearch: jest.fn(),
      });
    });

    it('should display seed database button', async () => {
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Seed Database with JSON')).toBeInTheDocument();
      });
    });

    it('should seed database when button is clicked', async () => {
      api.post.mockResolvedValueOnce({
        success: true,
      });

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Seed Database with JSON')).toBeInTheDocument();
      });

      const seedButton = screen.getByText('Seed Database with JSON');
      fireEvent.click(seedButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
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
      api.post.mockReturnValue(new Promise(() => {})); // Never resolves

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
      api.post.mockResolvedValueOnce({
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
        handleTableSelect: jest.fn(),
        refreshTables: jest.fn(),
      });

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Error fetching table list')).toBeInTheDocument();
      });
    });

  });

  describe('user workflows', () => {
    it('should handle complete table selection and search workflow', async () => {
      const mockHandleTableSelect = jest.fn();
      const mockHandleSearch = jest.fn();

      useBackupManager.mockReturnValue({
        backups: [],
        selectedBackup: '',
        setSelectedBackup: jest.fn(),
        loading: false,
        error: null,
        createBackup: jest.fn(),
        restoreBackup: jest.fn(),
        deleteBackup: jest.fn(),
        refreshBackups: jest.fn(),
      });

      useDatabaseTables.mockReturnValue({
        tables: ['users', 'courses'],
        selectedTable: 'users',
        loading: false,
        error: '',
        handleTableSelect: mockHandleTableSelect,
        refreshTables: jest.fn(),
      });

      useTableRecords.mockReturnValue({
        records: [{ id: 1, name: 'John' }],
        columns: ['id', 'name'],
        loading: false,
        error: '',
        fetchRecords: jest.fn(),
        handleSearch: mockHandleSearch,
      });

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
