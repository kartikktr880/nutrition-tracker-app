import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    mockOnSearch.mockClear();
  });

  it('renders with default props', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search foods, meals, or recipes...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<SearchBar onSearch={mockOnSearch} placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('calls onSearch when form is submitted', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('searchbox');
    const form = input.closest('form');

    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.submit(form!);

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('shows search results when input is focused and has value', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.focus(input);

    expect(screen.getByText('Press Enter to search for "test query"')).toBeInTheDocument();
  });

  it('hides search results when input loses focus', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(screen.queryByText('Press Enter to search for "test query"')).not.toBeInTheDocument();
  });

  it('closes search results when Escape key is pressed', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByText('Press Enter to search for "test query"')).not.toBeInTheDocument();
  });

  it('applies minimal variant styles', () => {
    render(<SearchBar onSearch={mockOnSearch} variant="minimal" />);
    const container = screen.getByRole('searchbox').closest('div');
    expect(container).toHaveClass('w-64');
  });

  it('applies custom className', () => {
    render(<SearchBar onSearch={mockOnSearch} className="custom-class" />);
    const container = screen.getByRole('searchbox').closest('div');
    expect(container).toHaveClass('custom-class');
  });
}); 