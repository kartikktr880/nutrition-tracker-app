import React from 'react';
import { twMerge } from 'tailwind-merge';
import { LoadingSpinner } from '@/components/LoadingSpinner/LoadingSpinner';

export interface LoadingOverlayProps {
  isLoading: boolean;
  label?: string;
  className?: string;
  spinnerSize?: 'sm' | 'md' | 'lg';
  spinnerVariant?: 'default' | 'primary' | 'secondary';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  label = 'Loading...',
  className,
  spinnerSize = 'lg',
  spinnerVariant = 'primary',
}) => {
  if (!isLoading) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={twMerge(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner
          size={spinnerSize}
          variant={spinnerVariant}
          label={label}
        />
        <p className="text-sm font-medium text-foreground/80">{label}</p>
      </div>
    </div>
  );
}; 