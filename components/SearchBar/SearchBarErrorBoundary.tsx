import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';

interface SearchBarErrorBoundaryProps {
  children: React.ReactNode;
}

const SearchBarErrorFallback = () => (
  <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
    <p className="text-sm text-destructive">
      There was an error loading the search. Please try again.
    </p>
  </div>
);

export const SearchBarErrorBoundary: React.FC<SearchBarErrorBoundaryProps> = ({ children }) => {
  const handleError = (error: Error) => {
    console.error('SearchBar error:', error);
  };

  return (
    <ErrorBoundary fallback={<SearchBarErrorFallback />} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}; 