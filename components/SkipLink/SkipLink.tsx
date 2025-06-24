import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface SkipLinkProps {
  targetId?: string;
  className?: string;
  children?: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId = 'main-content',
  className,
  children = 'Skip to main content',
}) => {
  return (
    <a
      href={`#${targetId}`}
      className={twMerge(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50',
        'px-4 py-2 text-sm font-medium text-primary-foreground bg-primary',
        'rounded-md shadow-lg transition-all duration-200',
        'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
    >
      {children}
    </a>
  );
}; 