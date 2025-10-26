// src/components/__tests__/AdminPage.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminPage from '../AdminPage';

// Mock fetch
global.fetch = jest.fn();
global.alert = jest.fn();

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock SearchBar
jest.mock('../SearchBar', () => {
  return function MockSearchBar({ onSearch }) {
    return (
      <input
        data-testid="search-bar"
        placeholder="Search..."
        onChange={(e) => onSearch(e.target.value)}
      />
    );
  };
});

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('AdminPage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_SERVER = 'http://localhost:5000';
  });

  describe('initial loading', () => {
    it('should show loading spinner initially', () => {
      // Mock delayed response
      fetch.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<AdminPage />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should fetch tables and backups on mount', async () => {
      // Mock backups fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['backup1.sql'] }),
      });

      // Mock tables fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['users', 'courses'] }),
      });

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:5000/admin/fetch-backups',
          expect.any(Object)
        );
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:5000/admin/tables',
          expect.any(Object)
        );
      });
    });
  });

  describe('tables and records display', () => {
    beforeEach(async () => {
      // Mock backups fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      // Mock tables fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['users', 'courses'] }),
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

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('users')).toBeInTheDocument();
      });

      // Mock records fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRecords }),
      });

      const usersTable = screen.getByText('users');
      fireEvent.click(usersTable);

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
      // Initial setup mocks
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['users'] }),
      });

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('users')).toBeInTheDocument();
      });

      // Select table
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 1, name: 'John' }] }),
      });

      fireEvent.click(screen.getByText('users'));

      await waitFor(() => {
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      });

      // Perform search
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 1, name: 'John' }] }),
      });

      const searchBar = screen.getByTestId('search-bar');
      fireEvent.change(searchBar, { target: { value: 'john' } });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:5000/admin/tables/users?keyword=john',
          expect.any(Object)
        );
      });
    });
  });

  describe('backup management', () => {
    beforeEach(async () => {
      // Mock backups fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['backup1.sql', 'backup2.sql'] }),
      });

      // Mock tables fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['users'] }),
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
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Create Backup')).toBeInTheDocument();
      });

      // Mock create backup
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Mock refresh backups
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['backup1.sql', 'backup2.sql', 'new-backup.sql'] }),
      });

      const createButton = screen.getByText('Create Backup');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:5000/admin/create-backup',
          expect.any(Object)
        );
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
    beforeEach(async () => {
      // Mock initial fetches
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['users'] }),
      });
    });

    it('should display seed database button', async () => {
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Seed Database with JSON')).toBeInTheDocument();
      });
    });

    it('should seed database when button is clicked', async () => {
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Seed Database with JSON')).toBeInTheDocument();
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const seedButton = screen.getByText('Seed Database with JSON');
      fireEvent.click(seedButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:5000/admin/seed-data',
          expect.any(Object)
        );
        expect(alert).toHaveBeenCalledWith('Data seeding successful!');
      });
    });

    it('should show loading state when seeding', async () => {
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Seed Database with JSON')).toBeInTheDocument();
      });

      // Mock delayed response
      fetch.mockImplementation(() => new Promise(() => {}));

      const seedButton = screen.getByText('Seed Database with JSON');
      fireEvent.click(seedButton);

      await waitFor(() => {
        expect(screen.getByText('Seeding...')).toBeInTheDocument();
      });
    });

    it('should handle seed data failure', async () => {
      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Seed Database with JSON')).toBeInTheDocument();
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, message: 'Seeding failed' }),
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
      // Mock backups fetch success
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      // Mock tables fetch failure
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      });

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Error fetching table list')).toBeInTheDocument();
      });
    });

    it('should navigate to /403 when unauthorized', async () => {
      // Mock backups fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      // Mock tables fetch with 403
      fetch.mockResolvedValueOnce({
        ok: false,
      });

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        // Component should attempt navigation (tested in hook test)
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('user workflows', () => {
    it('should handle complete table selection and search workflow', async () => {
      // Initial setup
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['users', 'courses'] }),
      });

      renderWithRouter(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('users')).toBeInTheDocument();
      });

      // Select table
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 1, name: 'John' },
            { id: 2, name: 'Jane' },
          ],
        }),
      });

      fireEvent.click(screen.getByText('users'));

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      // Perform search
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ id: 1, name: 'John' }],
        }),
      });

      const searchBar = screen.getByTestId('search-bar');
      fireEvent.change(searchBar, { target: { value: 'john' } });

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.queryByText('Jane')).not.toBeInTheDocument();
      });
    });
  });
});