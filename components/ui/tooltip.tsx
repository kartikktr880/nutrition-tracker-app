import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-10 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg -top-8 left-1/2 transform -translate-x-1/2">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

export const TooltipContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg">
    {children}
  </div>
);

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative">
    {children}
  </div>
);

export const TooltipTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="inline-block">
    {children}
  </div>
);
