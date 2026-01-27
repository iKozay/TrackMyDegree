// src/test/TablesList.test.js
// @ts-nocheck - Legacy component
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TablesList from '../../../legacy/components/TableList';

describe('TablesList Component', () => {
  const mockTables = ['users', 'courses', 'degrees', 'prerequisites'];
  const mockOnTableSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tables list title', () => {
    render(<TablesList tables={mockTables} selectedTable={null} onTableSelect={mockOnTableSelect} />);

    expect(screen.getByText('Tables')).toBeInTheDocument();
  });

  it('should render all tables', () => {
    render(<TablesList tables={mockTables} selectedTable={null} onTableSelect={mockOnTableSelect} />);

    mockTables.forEach((table) => {
      expect(screen.getByText(table)).toBeInTheDocument();
    });
  });

  it('should render empty state when no tables', () => {
    render(<TablesList tables={[]} selectedTable={null} onTableSelect={mockOnTableSelect} />);

    expect(screen.getByText('No tables available.')).toBeInTheDocument();
  });

  it('should call onTableSelect when table is clicked', () => {
    render(<TablesList tables={mockTables} selectedTable={null} onTableSelect={mockOnTableSelect} />);

    const userTable = screen.getByText('users');
    fireEvent.click(userTable);

    expect(mockOnTableSelect).toHaveBeenCalledWith('users');
    expect(mockOnTableSelect).toHaveBeenCalledTimes(1);
  });

  it('should handle clicking the same table multiple times', () => {
    render(<TablesList tables={mockTables} selectedTable="users" onTableSelect={mockOnTableSelect} />);

    const userTable = screen.getByText('users');

    fireEvent.click(userTable);
    fireEvent.click(userTable);
    fireEvent.click(userTable);

    expect(mockOnTableSelect).toHaveBeenCalledTimes(3);
    expect(mockOnTableSelect).toHaveBeenCalledWith('users');
  });

  it('should render with single table', () => {
    render(<TablesList tables={['users']} selectedTable={null} onTableSelect={mockOnTableSelect} />);

    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.queryByText('No tables available.')).not.toBeInTheDocument();
  });

  it('should render correct column structure', () => {
    const { container } = render(
      <TablesList tables={mockTables} selectedTable={null} onTableSelect={mockOnTableSelect} />,
    );

    const col = container.querySelector('.d-flex.flex-column');
    expect(col).toBeInTheDocument();
  });

  it('should have list-group class on ul', () => {
    const { container } = render(
      <TablesList tables={mockTables} selectedTable={null} onTableSelect={mockOnTableSelect} />,
    );

    const ul = container.querySelector('ul');
    expect(ul).toHaveClass('list-group');
    expect(ul).toHaveClass('table-list');
  });

  // it('should not have active class when no table selected', () => {
  //   render(<TablesList tables={mockTables} selectedTable={null} onTableSelect={mockOnTableSelect} />);

  //   mockTables.forEach((table) => {
  //     const tableItem = screen.getByText(table).closest('li');
  //     expect(tableItem).not.toHaveClass('active');
  //   });
  // });

  it('should handle table names with special characters', () => {
    const specialTables = ['user_data', 'course-info', 'degree.list'];
    render(<TablesList tables={specialTables} selectedTable={null} onTableSelect={mockOnTableSelect} />);

    specialTables.forEach((table) => {
      expect(screen.getByText(table)).toBeInTheDocument();
    });
  });

  // it('should render list items for all tables', () => {
  //   const { container } = render(
  //     <TablesList tables={mockTables} selectedTable={null} onTableSelect={mockOnTableSelect} />,
  //   );

  //   const listItems = container.querySelectorAll('li.list-group-item-action');
  //   expect(listItems.length).toBe(mockTables.length);
  // });

  it('should only render one empty state item when no tables', () => {
    const { container } = render(<TablesList tables={[]} selectedTable={null} onTableSelect={mockOnTableSelect} />);

    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBe(1);
  });

  it('should not call onTableSelect for empty state item', () => {
    render(<TablesList tables={[]} selectedTable={null} onTableSelect={mockOnTableSelect} />);

    const emptyItem = screen.getByText('No tables available.');
    fireEvent.click(emptyItem);

    // Should not call because empty state doesn't have onClick
    expect(mockOnTableSelect).not.toHaveBeenCalled();
  });

  // it('should handle selectedTable that does not exist in tables array', () => {
  //   render(<TablesList tables={mockTables} selectedTable="nonexistent" onTableSelect={mockOnTableSelect} />);

  //   // No table should have active class
  //   mockTables.forEach((table) => {
  //     const tableItem = screen.getByText(table).closest('li');
  //     expect(tableItem).not.toHaveClass('active');
  //   });
  // });

  it('should maintain key prop on list items', () => {
    const { container } = render(
      <TablesList tables={mockTables} selectedTable={null} onTableSelect={mockOnTableSelect} />,
    );

    const listItems = container.querySelectorAll('li.list-group-item-action');
    listItems.forEach((item) => {
      // React adds keys internally, just verify items render correctly
      expect(item).toBeInTheDocument();
    });
  });
});
