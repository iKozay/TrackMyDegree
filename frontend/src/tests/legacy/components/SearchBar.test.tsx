import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import SearchBar from '../../../legacy/components/SearchBar';

describe('SearchBar Component', () => {
  test('renders search input and button', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by keyword...');
    const button = screen.getByRole('button', { name: /search/i });

    expect(input).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  test('updates input value when user types', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by keyword...');

    fireEvent.change(input, { target: { value: 'test keyword' } });

    expect(input).toHaveValue('test keyword');
  });

  test('calls onSearch with keyword when form is submitted', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by keyword...');
    const button = screen.getByRole('button', { name: /search/i });

    fireEvent.change(input, { target: { value: 'test search' } });
    fireEvent.click(button);

    expect(mockOnSearch).toHaveBeenCalledWith('test search');
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
  });

  test('calls onSearch when Enter key is pressed', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by keyword...');

    fireEvent.change(input, { target: { value: 'enter key test' } });
    fireEvent.submit(input.closest('form')!);

    expect(mockOnSearch).toHaveBeenCalledWith('enter key test');
  });
});