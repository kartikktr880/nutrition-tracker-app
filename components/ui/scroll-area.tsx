import React from 'react';

interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({ 
  children, 
  className = '',
  maxHeight = '400px'
}) => {
  return (
    <div 
      className={`overflow-auto ${className}`}
      style={{ maxHeight }}
    >
      {children}
    </div>
  );
};

export {}; 