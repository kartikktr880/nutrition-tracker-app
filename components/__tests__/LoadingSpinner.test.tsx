// jest.skip: Skipping Vitest-based test file for now
// import { describe, it, expect } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading...');
  });

  it('renders with custom label', () => {
    const customLabel = 'Loading search results...';
    render(<LoadingSpinner label={customLabel} />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', customLabel);
    expect(screen.getByText(customLabel)).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="small" />);
    const div = screen.getByRole('status').querySelector('div');
    expect(div?.className).toMatch(/spinner/);
    expect(div?.className).toMatch(/small/);
    rerender(<LoadingSpinner size="medium" />);
    expect(div?.className).toMatch(/spinner/);
    expect(div?.className).toMatch(/medium/);
    rerender(<LoadingSpinner size="large" />);
    expect(div?.className).toMatch(/spinner/);
    expect(div?.className).toMatch(/large/);
  });

  it('applies custom className', () => {
    const customClass = 'custom-spinner';
    render(<LoadingSpinner className={customClass} />);
    
    expect(screen.getByRole('status').className).toMatch(/custom-spinner/);
  });

  it('hides visual spinner from screen readers', () => {
    render(<LoadingSpinner />);
    
    const visualSpinner = screen.getByRole('status').querySelector('[aria-hidden="true"]');
    expect(visualSpinner).toBeInTheDocument();
  });

  it('provides accessible status message', () => {
    render(<LoadingSpinner />);
    
    const statusMessage = screen.getByText('Loading...');
    expect(statusMessage.className).toMatch(/visuallyHidden/);
  });
}); 