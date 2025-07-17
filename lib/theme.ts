import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Theme types
export type Theme = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

// Theme configuration
export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  shadow: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  themes: Record<string, { className: string }>;
  colorSchemes: Record<string, Record<string, string>>;
}

// Theme store interface
interface ThemeStore {
  config: ThemeConfig;
  theme: 'light' | 'dark' | 'system';
  colorScheme: ColorScheme;
  isDarkMode: boolean;
  updateConfig: (config: Partial<ThemeConfig>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleDarkMode: () => void;
  applyTheme: () => void;
  updateColorScheme: () => void;
}

// Light theme configuration
export const lightTheme: ThemeConfig = {
  primary: '#28a745',
  secondary: '#6c757d',
  accent: '#ff9800',
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#212529',
  textSecondary: '#6c757d',
  border: '#dee2e6',
  shadow: 'rgba(0, 0, 0, 0.1)',
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  themes: {
    light: { className: 'light' },
    dark: { className: 'dark' },
  },
  colorSchemes: {
    light: {
      primary: '#28a745',
      secondary: '#6c757d',
      background: '#ffffff',
      text: '#212529',
    },
    dark: {
      primary: '#4ade80',
      secondary: '#9ca3af',
      background: '#0f172a',
      text: '#f1f5f9',
    },
  },
};

// Dark theme configuration
export const darkTheme: ThemeConfig = {
  primary: '#4ade80',
  secondary: '#9ca3af',
  accent: '#fbbf24',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#334155',
  shadow: 'rgba(0, 0, 0, 0.3)',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  themes: {
    light: { className: 'light' },
    dark: { className: 'dark' },
  },
  colorSchemes: {
    light: {
      primary: '#28a745',
      secondary: '#6c757d',
      background: '#ffffff',
      text: '#212529',
    },
    dark: {
      primary: '#4ade80',
      secondary: '#9ca3af',
      background: '#0f172a',
      text: '#f1f5f9',
    },
  },
};

// Theme store
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      config: lightTheme,
      theme: 'system',
      colorScheme: 'light',
      isDarkMode: false,

      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates },
        }));
        get().applyTheme();
      },

      setTheme: (theme) => {
        set({ theme });
        get().applyTheme();
      },

      setColorScheme: (scheme) => {
        set({ colorScheme: scheme });
        get().updateColorScheme();
      },

      toggleDarkMode: () => {
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        }));
      },

      applyTheme: () => {
        const { theme, config } = get();
        const root = document.documentElement;

        // Remove old theme classes
        Object.values(config.themes).forEach((themeConfig) => {
          root.classList.remove(themeConfig.className);
        });

        // Add new theme class
        const currentTheme = theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          : theme;
        
        const themeConfig = config.themes[currentTheme];
        root.classList.add(themeConfig.className);

        // Update dark mode state
        set({ isDarkMode: currentTheme === 'dark' });
      },

      updateColorScheme: () => {
        const { colorScheme, config } = get();
        const root = document.documentElement;
        const scheme = config.colorSchemes[colorScheme];

        Object.entries(scheme).forEach(([key, value]) => {
          root.style.setProperty(`--color-${key}`, value);
        });
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

// Theme utilities
export class ThemeUtils {
  // Get system color scheme
  static getSystemColorScheme(): ColorScheme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Listen for system theme changes
  static onSystemThemeChange(callback: (scheme: ColorScheme) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      callback(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }

  // Generate CSS variables
  static generateCSSVariables(config: ThemeConfig): string {
    return Object.entries(config)
      .map(([key, value]) => `--color-${key}: ${value};`)
      .join('\n  ');
  }

  // Create theme-aware styles
  static createThemeStyles(config: ThemeConfig): string {
    return `
      :root {
        ${this.generateCSSVariables(config)}
      }
      
      .light {
        ${this.generateCSSVariables(lightTheme)}
      }
      
      .dark {
        ${this.generateCSSVariables(darkTheme)}
      }
      
      /* Theme transitions */
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }
      
      /* Dark mode specific styles */
      .dark {
        color-scheme: dark;
      }
      
      .dark ::selection {
        background-color: var(--color-primary);
        color: var(--color-background);
      }
      
      /* Light mode specific styles */
      .light {
        color-scheme: light;
      }
      
      .light ::selection {
        background-color: var(--color-primary);
        color: var(--color-background);
      }
    `;
  }

  // Get contrast ratio
  static getContrastRatio(color1: string, color2: string): number {
    const getLuminance = (color: string): number => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      const [rs, gs, bs] = [r, g, b].map(c => {
        if (c <= 0.03928) return c / 12.92;
        return Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }

  // Check if color meets accessibility standards
  static isAccessible(foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    const thresholds = { AA: 4.5, AAA: 7 };
    return ratio >= thresholds[level];
  }

  // Generate accessible color variants
  static generateAccessibleVariants(baseColor: string, background: string): {
    primary: string;
    secondary: string;
    muted: string;
  } {
    // This is a simplified implementation
    // In a real app, you would use a color manipulation library
    return {
      primary: baseColor,
      secondary: baseColor,
      muted: baseColor,
    };
  }
}

// Export utilities
export const themeUtils = {
  ThemeUtils,
  lightTheme,
  darkTheme,
}; 