import { render, screen } from '@testing-library/react';
import React from 'react';

import { SearchTrends } from './SearchTrends';

describe('SearchTrends', () => {
  it('renders without crashing', () => {
    render(<SearchTrends />);
  });

  it('renders the placeholder content', () => {
    render(<SearchTrends />);
    expect(screen.getByText('Search Trends')).toBeInTheDocument();
    expect(screen.getByText('Search trends component placeholder')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<SearchTrends className="custom-class" />);
    const container = screen.getByText('Search Trends').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('has the correct CSS class structure', () => {
    render(<SearchTrends />);
    const container = screen.getByText('Search Trends').closest('div');
    expect(container).toHaveClass('search-trends');
  });
});