import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecordsTable from '../RecordsTable';
import SearchBar from '../../../components/SearchBar';

// Mock SearchBar component
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

describe('RecordsTable Component', () => {
  const mockRecords = [
    { id: 1, name: 'John Doe', email: 'john@test.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@test.com' },
  ];
  const mockColumns = ['id', 'name', 'email'];
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no table is selected', () => {
    it('should show info message', () => {
      render(
        <RecordsTable
          selectedTable={null}
          records={[]}
          columns={[]}
          onSearch={mockOnSearch}
        />
      );

      expect(screen.getByText('Select a table to view its records.')).toBeInTheDocument();
    });

    it('should not render search bar', () => {
      render(
        <RecordsTable
          selectedTable={null}
          records={[]}
          columns={[]}
          onSearch={mockOnSearch}
        />
      );

      expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
    });

    it('should not render table', () => {
      const { container } = render(
        <RecordsTable
          selectedTable={null}
          records={[]}
          columns={[]}
          onSearch={mockOnSearch}
        />
      );

      expect(container.querySelector('table')).not.toBeInTheDocument();
    });
  });

  describe('when table is selected', () => {
    it('should render table name as header', () => {
      render(
        <RecordsTable
          selectedTable="users"
          records={mockRecords}
          columns={mockColumns}
          onSearch={mockOnSearch}
        />
      );

      expect(screen.getByText('users')).toBeInTheDocument();
    });

    it('should render search bar', () => {
      render(
        <RecordsTable
          selectedTable="users"
          records={mockRecords}
          columns={mockColumns}
          onSearch={mockOnSearch}
        />
      );

      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });

    it('should call onSearch when searching', () => {
      render(
        <RecordsTable
          selectedTable="users"
          records={mockRecords}
          columns={mockColumns}
          onSearch={mockOnSearch}
        />
      );

      const searchInput = screen.getByTestId('search-bar');
      fireEvent.change(searchInput, { target: { value: 'john' } });

      expect(mockOnSearch).toHaveBeenCalledWith('john');
    });

    it('should render all column headers', () => {
      render(
        <RecordsTable
          selectedTable="users"
          records={mockRecords}
          columns={mockColumns}
          onSearch={mockOnSearch}
        />
      );

      mockColumns.forEach((col) => {
        const headers = screen.getAllByText(col);
        expect(headers.length).toBeGreaterThan(0);
      });
    });

    it('should render all records', () => {
      render(
        <RecordsTable
          selectedTable="users"
          records={mockRecords}
          columns={mockColumns}
          onSearch={mockOnSearch}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
      expect(screen.getByText('jane@test.com')).toBeInTheDocument();
    });

    it('should render correct number of rows', () => {
      const { container } = render(
        <RecordsTable
          selectedTable="users"
          records={mockRecords}
          columns={mockColumns}
          onSearch={mockOnSearch}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(mockRecords.length);
    });

    it('should show no records message when records array is empty', () => {
      render(
        <RecordsTable
          selectedTable="users"
          records={[]}
          columns={[]}
          onSearch={mockOnSearch}
        />
      );

      expect(screen.getByText('No records found.')).toBeInTheDocument();
    });

    it('should not render table when no records', () => {
      const { container } = render(
        <RecordsTable
          selectedTable="users"
          records={[]}
          columns={[]}
          onSearch={mockOnSearch}
        />
      );

      expect(container.querySelector('table')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle single record', () => {
      const singleRecord = [{ id: 1, name: 'John' }];
      const singleColumns = ['id', 'name'];

      const { container } = render(
        <RecordsTable
          selectedTable="users"
          records={singleRecord}
          columns={singleColumns}
          onSearch={mockOnSearch}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    it('should handle null or undefined values in records', () => {
      const recordsWithNull = [
        { id: 1, name: null, email: undefined },
      ];
      const columns = ['id', 'name', 'email'];

      render(
        <RecordsTable
          selectedTable="users"
          records={recordsWithNull}
          columns={columns}
          onSearch={mockOnSearch}
        />
      );

      expect(screen.getByText('users')).toBeInTheDocument();
    });

    it('should handle empty string values', () => {
      const recordsWithEmpty = [
        { id: 1, name: '', email: 'test@test.com' },
      ];
      const columns = ['id', 'name', 'email'];

      const { container } = render(
        <RecordsTable
          selectedTable="users"
          records={recordsWithEmpty}
          columns={columns}
          onSearch={mockOnSearch}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });
  });
});
