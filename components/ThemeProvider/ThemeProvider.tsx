"use client";
import { usePathname } from 'next/navigation';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import React, { useEffect, useState } from 'react';

import '@/styles/theme-transitions.css';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = useState(true);

  // Handle theme changes and persistence
  useEffect(() => {
    // Prevent flash of wrong theme
    const root = window.document.documentElement;
    
    // Add initializing class to prevent transitions
    root.classList.add('theme-initializing');
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Get stored theme or system preference
    const storedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = storedTheme || systemTheme;
    
    // Apply theme
    root.classList.add(theme);
    
    // Remove initializing class after a short delay
    const timeoutId = setTimeout(() => {
      root.classList.remove('theme-initializing');
      setIsInitializing(false);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={isInitializing}
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
};

export default ThemeProvider; 