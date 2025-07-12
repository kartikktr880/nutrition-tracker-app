import React from 'react';

interface CollapsibleProps {
  children: React.ReactNode;
  className?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({ 
  children, 
  className = ''
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

interface CollapsibleTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const CollapsibleTrigger: React.FC<CollapsibleTriggerProps> = ({ 
  children, 
  className = '',
  onClick
}) => {
  return (
    <button 
      className={`w-full text-left ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

interface CollapsibleContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CollapsibleContent: React.FC<CollapsibleContentProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`overflow-hidden transition-all ${className}`}>
      {children}
    </div>
  );
};

export {}; 