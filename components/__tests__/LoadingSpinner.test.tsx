// jest.skip: Skipping Vitest-based test file for now
// import { describe, it, expect } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';

import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    const customLabel = 'Custom loading message';
    const { getByText } = render(<LoadingSpinner label={customLabel} />);
    expect(getByText(customLabel)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-spinner" />);
    const div = container.querySelector('[role="status"]');
    expect(div).toHaveClass('custom-spinner');
  });

  it('renders visual spinner', () => {
    const { container } = render(<LoadingSpinner />);
    const visualSpinner = container.querySelector('[aria-hidden="true"]');
    expect(visualSpinner).toBeInTheDocument();
  });

  it('renders status message', () => {
    const { getByText } = render(<LoadingSpinner />);
    const statusMessage = getByText('Loading...');
    expect(statusMessage).toBeInTheDocument();
  });
}); 