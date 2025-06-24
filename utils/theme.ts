import { type Theme } from 'next-themes';

export const THEME_STORAGE_KEY = 'theme';

export const getStoredTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) as Theme;
  } catch (error) {
    console.error('Error reading theme from localStorage:', error);
    return null;
  }
};

export const setStoredTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error('Error saving theme to localStorage:', error);
  }
};

export const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const applyTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
};

export const handleThemeChange = (theme: Theme): void => {
  setStoredTheme(theme);
  applyTheme(theme);
}; 