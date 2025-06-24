/// <reference types="next" />
/// <reference types="next/types/global" />

import { ReactNode } from 'react';

declare module 'framer-motion' {
  export interface MotionProps {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    variants?: any;
    className?: string;
    children?: ReactNode;
  }

  export const motion: {
    div: React.FC<MotionProps & React.HTMLAttributes<HTMLDivElement>>;
  };

  export const AnimatePresence: React.FC<{
    children: ReactNode;
    mode?: 'sync' | 'wait' | 'popLayout';
    initial?: boolean;
    onExitComplete?: () => void;
  }>;
}

declare module 'tailwind-merge' {
  export function twMerge(...classLists: (string | undefined | null | false)[]): string;
  export function clsx(...inputs: (string | undefined | null | false | Record<string, boolean>)[]): string;
}

declare module 'next-themes' {
  export type Theme = 'light' | 'dark' | 'system';

  export interface ThemeProviderProps {
    children: ReactNode;
    attribute?: string;
    defaultTheme?: Theme;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
    storageKey?: string;
    themes?: Theme[];
    forcedTheme?: Theme;
  }

  export function useTheme(): {
    theme: Theme | undefined;
    setTheme: (theme: Theme) => void;
    resolvedTheme: Theme | undefined;
    themes: Theme[];
    systemTheme: Theme | undefined;
  };

  export const ThemeProvider: React.FC<ThemeProviderProps>;
}

// Add global type augmentations
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: Record<string, any>): R;
    }
  }
} 