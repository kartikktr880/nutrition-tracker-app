import { render } from '@testing-library/react';
import React from 'react';

import { LoadingOverlay } from './LoadingOverlay';

// Mock the missing exports
const _screen = {
  getByText: (text: string) => document.querySelector(`[data-testid="${text}"]`),
  getByRole: (role: string) => document.querySelector(`[role="${role}"]`),
  queryByText: (text: string) => document.querySelector(`[data-testid="${text}"]`)
};

describe('LoadingOverlay', () => {
  it('renders without crashing', () => {
    render(<LoadingOverlay isLoading={true} />);
  });
});

export {};