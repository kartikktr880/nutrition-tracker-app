import React from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';

import { logError } from '../../utils/logger';

const SearchBarErrorFallback: React.FC = () => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-red-600">Something went wrong with the search functionality.</p>
    <button 
      onClick={() => window.location.reload()} 
      className="mt-2 text-red-500 underline"
    >
      Reload page
    </button>
  </div>
);

interface SearchBarErrorBoundaryProps {
  children: React.ReactNode;
}

export const SearchBarErrorBoundary: React.FC<SearchBarErrorBoundaryProps> = ({ children }) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    logError(`SearchBar Error: ${JSON.stringify(errorInfo)}`, error);
  };

  return (
    <ErrorBoundary fallback={<SearchBarErrorFallback />} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}; 