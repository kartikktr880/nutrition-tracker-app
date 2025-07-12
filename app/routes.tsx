import React from 'react';

import { ErrorBoundary } from '../components/ErrorBoundary/ErrorBoundary';
import { LoadingSpinner } from '../components/LoadingSpinner/LoadingSpinner';

import DataAnalytics from './components/DataAnalytics';

const Routes: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="routes-container">
        <LoadingSpinner />
        <DataAnalytics />
      </div>
    </ErrorBoundary>
  );
};

export default Routes; 