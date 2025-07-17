'use client';

import React, { useState, useEffect } from 'react';

import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'icon-only';
}

export function ThemeToggle({
  className,
  showLabel = false,
  size = 'md',
  variant = 'default',
}: ThemeToggleProps) {
  const { isDark, isLight, isSystem, setTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn('animate-pulse bg-gray-200 rounded-md', {
        'w-8 h-8': size === 'sm',
        'w-10 h-10': size === 'md',
        'w-12 h-12': size === 'lg',
      }, className)} />
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

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  if (variant === 'icon-only') {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          'relative inline-flex items-center justify-center rounded-md transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <div className="relative w-5 h-5">
          {/* Sun icon */}
          <svg
            className={cn(
              'absolute inset-0 w-5 h-5 transition-all duration-300',
              isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>

          {/* Moon icon */}
          <svg
            className={cn(
              'absolute inset-0 w-5 h-5 transition-all duration-300',
              isLight ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>

          {/* System icon */}
          <svg
            className={cn(
              'absolute inset-0 w-5 h-5 transition-all duration-300',
              isSystem ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
      </button>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className="text-sm font-medium text-text">
          Theme:
        </span>
      )}

      <div className="flex items-center rounded-md border border-border bg-surface p-1">
        {/* Light mode button */}
        <button
          onClick={() => handleThemeChange('light')}
          className={cn(
            'relative px-3 py-1.5 rounded-sm text-sm font-medium transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isLight
              ? 'bg-primary text-white shadow-sm'
              : 'text-text hover:text-primary hover:bg-surface/80'
          )}
          aria-label="Light mode"
          title="Light mode"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            {variant === 'default' && <span>Light</span>}
          </div>
        </button>

        {/* System mode button */}
        <button
          onClick={() => handleThemeChange('system')}
          className={cn(
            'relative px-3 py-1.5 rounded-sm text-sm font-medium transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isSystem
              ? 'bg-primary text-white shadow-sm'
              : 'text-text hover:text-primary hover:bg-surface/80'
          )}
          aria-label="System mode"
          title="System mode"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            {variant === 'default' && <span>System</span>}
          </div>
        </button>

        {/* Dark mode button */}
        <button
          onClick={() => handleThemeChange('dark')}
          className={cn(
            'relative px-3 py-1.5 rounded-sm text-sm font-medium transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isDark
              ? 'bg-primary text-white shadow-sm'
              : 'text-text hover:text-primary hover:bg-surface/80'
          )}
          aria-label="Dark mode"
          title="Dark mode"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            {variant === 'default' && <span>Dark</span>}
          </div>
        </button>
      </div>
    </div>
  );
}

// Quick theme toggle (just icon)
export function QuickThemeToggle({ className }: { className?: string }) {
  return <ThemeToggle className={className} variant="icon-only" />;
}

// Theme indicator (shows current theme)
export function ThemeIndicator({ className }: { className?: string }) {
  const { theme, isSystem } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn('animate-pulse bg-gray-200 rounded-full w-2 h-2', className)} />
    );
  }

  const getThemeColor = () => {
    if (isSystem) return 'bg-gray-400';
    return theme === 'dark' ? 'bg-gray-800' : 'bg-yellow-400';
  };

  return (
    <div
      className={cn(
        'w-2 h-2 rounded-full transition-colors duration-200',
        getThemeColor(),
        className
      )}
      title={`Current theme: ${isSystem ? 'System' : theme}`}
    />
  );
} 