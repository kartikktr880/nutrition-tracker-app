import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingOverlay } from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders nothing when not loading', () => {
    const { container } = render(<LoadingOverlay isLoading={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders with default props when loading', () => {
    render(<LoadingOverlay isLoading={true} />);
    const overlay = screen.getByRole('alert');
    expect(overlay).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<LoadingOverlay isLoading={true} label="Custom loading text" />);
    expect(screen.getByText('Custom loading text')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingOverlay isLoading={true} className="custom-class" />);
    const overlay = screen.getByRole('alert');
    expect(overlay).toHaveClass('custom-class');
  });

  it('passes spinner props correctly', () => {
    render(
      <LoadingOverlay
        isLoading={true}
        spinnerSize="sm"
        spinnerVariant="secondary"
      />
    );
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });
}); 