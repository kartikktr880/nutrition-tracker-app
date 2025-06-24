import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<LoadingSpinner label="Custom loading text" />);
    expect(screen.getByText('Custom loading text')).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let spinner = screen.getByRole('status').querySelector('svg');
    expect(spinner).toHaveClass('w-4', 'h-4');

    rerender(<LoadingSpinner size="md" />);
    spinner = screen.getByRole('status').querySelector('svg');
    expect(spinner).toHaveClass('w-6', 'h-6');

    rerender(<LoadingSpinner size="lg" />);
    spinner = screen.getByRole('status').querySelector('svg');
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<LoadingSpinner variant="default" />);
    let spinner = screen.getByRole('status').querySelector('svg');
    expect(spinner).toHaveClass('text-foreground');

    rerender(<LoadingSpinner variant="primary" />);
    spinner = screen.getByRole('status').querySelector('svg');
    expect(spinner).toHaveClass('text-primary');

    rerender(<LoadingSpinner variant="secondary" />);
    spinner = screen.getByRole('status').querySelector('svg');
    expect(spinner).toHaveClass('text-secondary');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-class');
  });
}); 