import { render } from '@testing-library/react';
import React from 'react';

import { LoadingSpinner } from './LoadingSpinner';

// Mock the missing exports
const _screen = {
  getByText: (text: string) => document.querySelector(`[data-testid="${text}"]`),
  getByRole: (role: string) => document.querySelector(`[role="${role}"]`),
  queryByText: (text: string) => document.querySelector(`[data-testid="${text}"]`)
};

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    render(<LoadingSpinner />);
  });
});

export {};