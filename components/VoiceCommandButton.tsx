"use client";
import React from 'react';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { cn } from '@/lib/utils';

interface VoiceCommandButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'icon-only';
  showStatus?: boolean;
}

export function VoiceCommandButton({
  className,
  size = 'md',
  variant = 'default',
  showStatus = true,
}: VoiceCommandButtonProps) {
  const {
    isListening,
    isSupported,
    startListeningWithPermission,
  } = useVoiceCommands();

  if (!isSupported) {
    return (
      <button
        disabled
        className={cn(
          'opacity-50 cursor-not-allowed',
          className
        )}
        title="Voice commands not supported in this browser"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    );
  }

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  const variantClasses = {
    default: 'bg-surface border border-border hover:bg-surface/80',
    minimal: 'bg-transparent hover:bg-surface/50',
    'icon-only': 'bg-transparent hover:bg-surface/50',
  };

  return (
    <button
      onClick={startListeningWithPermission}
      className={cn(
        'relative inline-flex items-center justify-center rounded-md transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        isListening && 'bg-primary text-white',
        className
      )}
      aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
      title={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
    >
      <div className="relative">
        <svg
          className={cn(
            'w-5 h-5 transition-all duration-200',
            isListening && 'animate-pulse'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        
        {isListening && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
        )}
      </div>

      {showStatus && variant !== 'icon-only' && (
        <span className="ml-2 text-sm">
          {isListening ? 'Listening...' : 'Voice'}
        </span>
      )}
    </button>
  );
} 