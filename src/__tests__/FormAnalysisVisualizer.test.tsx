import { render } from '@testing-library/react';
import React from 'react';

import { FormAnalysisVisualizer } from '../../app/performance/FormAnalysisVisualizer';

// Mock the missing exports
const _screen = {
  getByText: (text: string) => document.querySelector(`[data-testid="${text}"]`),
  getByRole: (role: string) => document.querySelector(`[role="${role}"]`),
  queryByText: (text: string) => document.querySelector(`[data-testid="${text}"]`)
};

describe('FormAnalysisVisualizer', () => {
  it('renders without crashing', () => {
    render(<FormAnalysisVisualizer exerciseKey="test" currentForm={{}} validationResult={{ isValid: true, errors: [], warnings: [], metadata: {
      validationTime: 0,
      validationType: 'custom',
      timestamp: new Date(),
      performanceMetrics: {
        cacheHit: false,
        middlewareTime: 0,
        validationTime: 0,
        totalTime: 0
      }
    } }} />);
  });
});

export {};
