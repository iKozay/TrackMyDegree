// src/test/RecordsTable.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecordsTable from '../../pages/AdminPage/components/RecordsTable';

// Mock SearchBar component
jest.mock('../../components/SearchBar', () => {
  return function MockSearchBar({ onSearch }) {
    return <input data-testid="search-bar" placeholder="Search..." onChange={(e) => onSearch(e.target.value)} />;
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
      render(<RecordsTable selectedTable={null} records={[]} columns={[]} onSearch={mockOnSearch} />);

      expect(screen.getByText('Select a table to view its records.')).toBeInTheDocument();
    });

    it('should not render search bar', () => {
      render(<RecordsTable selectedTable={null} records={[]} columns={[]} onSearch={mockOnSearch} />);

      expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
    });

    it('should not render table', () => {
      const { container } = render(
        <RecordsTable selectedTable={null} records={[]} columns={[]} onSearch={mockOnSearch} />,
      );

      expect(container.querySelector('table')).not.toBeInTheDocument();
    });
  });

  describe('when table is selected', () => {
    it('should render table name as header', () => {
      render(
        <RecordsTable selectedTable="users" records={mockRecords} columns={mockColumns} onSearch={mockOnSearch} />,
      );

      expect(screen.getByText('users')).toBeInTheDocument();
    });

    it('should render search bar', () => {
      render(
        <RecordsTable selectedTable="users" records={mockRecords} columns={mockColumns} onSearch={mockOnSearch} />,
      );

      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });

    it('should call onSearch when searching', () => {
      render(
        <RecordsTable selectedTable="users" records={mockRecords} columns={mockColumns} onSearch={mockOnSearch} />,
      );

      const searchInput = screen.getByTestId('search-bar');
      fireEvent.change(searchInput, { target: { value: 'john' } });

      expect(mockOnSearch).toHaveBeenCalledWith('john');
    });

    it('should render all column headers', () => {
      render(
        <RecordsTable selectedTable="users" records={mockRecords} columns={mockColumns} onSearch={mockOnSearch} />,
      );

      mockColumns.forEach((col) => {
        const headers = screen.getAllByText(col);
        expect(headers.length).toBeGreaterThan(0);
      });
    });

    it('should render all records', () => {
      render(
        <RecordsTable selectedTable="users" records={mockRecords} columns={mockColumns} onSearch={mockOnSearch} />,
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
      expect(screen.getByText('jane@test.com')).toBeInTheDocument();
    });

    it('should render correct number of rows', () => {
      const { container } = render(
        <RecordsTable selectedTable="users" records={mockRecords} columns={mockColumns} onSearch={mockOnSearch} />,
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(mockRecords.length);
    });

    it('should render correct number of cells per row', () => {
      const { container } = render(
        <RecordsTable selectedTable="users" records={mockRecords} columns={mockColumns} onSearch={mockOnSearch} />,
      );

      const firstRow = container.querySelector('tbody tr');
      const cells = firstRow.querySelectorAll('td');
      expect(cells.length).toBe(mockColumns.length);
    });

    it('should show no records message when records array is empty', () => {
      render(<RecordsTable selectedTable="users" records={[]} columns={[]} onSearch={mockOnSearch} />);

      expect(screen.getByText('No records found.')).toBeInTheDocument();
    });

    it('should not render table when no records', () => {
      const { container } = render(
        <RecordsTable selectedTable="users" records={[]} columns={[]} onSearch={mockOnSearch} />,
      );

      expect(container.querySelector('table')).not.toBeInTheDocument();
    });

    it('should have responsive table class', () => {
      const { container } = render(
        <RecordsTable selectedTable="users" records={mockRecords} columns={mockColumns} onSearch={mockOnSearch} />,
      );

      const table = container.querySelector('table');
      expect(table).toHaveClass('records-table');
    });

    it('should add data-label attribute to cells', () => {
      const { container } = render(
        <RecordsTable selectedTable="users" records={mockRecords} columns={mockColumns} onSearch={mockOnSearch} />,
      );

      const firstCell = container.querySelector('tbody tr td');
      expect(firstCell).toHaveAttribute('data-label');
    });

    // it('should handle records with different data types', () => {
    //   const mixedRecords = [
    //     { id: 1, name: 'John', age: 25, active: true },
    //     { id: 2, name: 'Jane', age: 30, active: false },
    //   ];
    //   const mixedColumns = ['id', 'name', 'age', 'active'];

    //   render(
    //     <RecordsTable selectedTable="users" records={mixedRecords} columns={mixedColumns} onSearch={mockOnSearch} />,
    //   );

    //   expect(screen.getByText('25')).toBeInTheDocument();
    //   expect(screen.getByText('30')).toBeInTheDocument();
    //   expect(screen.getByText('true')).toBeInTheDocument();
    //   expect(screen.getByText('false')).toBeInTheDocument();
    // });
  });

  describe('edge cases', () => {
    it('should handle single record', () => {
      const singleRecord = [{ id: 1, name: 'John' }];
      const singleColumns = ['id', 'name'];

      const { container } = render(
        <RecordsTable selectedTable="users" records={singleRecord} columns={singleColumns} onSearch={mockOnSearch} />,
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    it('should handle single column', () => {
      const records = [{ id: 1 }, { id: 2 }];
      const columns = ['id'];

      const { container } = render(
        <RecordsTable selectedTable="users" records={records} columns={columns} onSearch={mockOnSearch} />,
      );

      const headerCells = container.querySelectorAll('thead th');
      expect(headerCells.length).toBe(1);
    });

    it('should handle null or undefined values in records', () => {
      const recordsWithNull = [{ id: 1, name: null, email: undefined }];
      const columns = ['id', 'name', 'email'];

      render(
        <RecordsTable selectedTable="users" records={recordsWithNull} columns={columns} onSearch={mockOnSearch} />,
      );

      expect(screen.getByText('users')).toBeInTheDocument();
    });

    it('should handle empty string values', () => {
      const recordsWithEmpty = [{ id: 1, name: '', email: 'test@test.com' }];
      const columns = ['id', 'name', 'email'];

      const { container } = render(
        <RecordsTable selectedTable="users" records={recordsWithEmpty} columns={columns} onSearch={mockOnSearch} />,
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    it('should render with undefined selectedTable as falsy', () => {
      render(<RecordsTable selectedTable={undefined} records={[]} columns={[]} onSearch={mockOnSearch} />);

      expect(screen.getByText('Select a table to view its records.')).toBeInTheDocument();
    });

    // it('should render with empty string selectedTable as truthy', () => {
    //   render(<RecordsTable selectedTable="" records={[]} columns={[]} onSearch={mockOnSearch} />);

    //   // Empty string is truthy in this context, so search bar should render
    //   expect(screen.queryByTestId('search-bar')).toBeInTheDocument();
    // });

    it('should handle many columns', () => {
      const manyColumns = ['col1', 'col2', 'col3', 'col4', 'col5', 'col6', 'col7', 'col8'];
      const record = manyColumns.reduce((acc, col) => ({ ...acc, [col]: 'value' }), {});

      const { container } = render(
        <RecordsTable selectedTable="test" records={[record]} columns={manyColumns} onSearch={mockOnSearch} />,
      );

      const headerCells = container.querySelectorAll('thead th');
      expect(headerCells.length).toBe(manyColumns.length);
    });
  });
});
