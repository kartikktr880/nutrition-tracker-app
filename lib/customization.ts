import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';

// Customization schemas
export const LayoutSchema = z.object({
  sidebar: z.object({
    position: z.enum(['left', 'right']).default('left'),
    width: z.number().min(200).max(400).default(280),
    collapsed: z.boolean().default(false),
    autoCollapse: z.boolean().default(true),
  }),
  header: z.object({
    height: z.number().min(50).max(100).default(64),
    sticky: z.boolean().default(true),
    showBreadcrumbs: z.boolean().default(true),
  }),
  content: z.object({
    maxWidth: z.number().min(800).max(1400).default(1200),
    padding: z.number().min(16).max(48).default(24),
    gridGap: z.number().min(8).max(32).default(16),
  }),
  footer: z.object({
    show: z.boolean().default(true),
    height: z.number().min(40).max(80).default(60),
  }),
});

export const DisplaySchema = z.object({
  fontSize: z.enum(['xs', 'sm', 'base', 'lg', 'xl', '2xl']).default('base'),
  lineHeight: z.enum(['tight', 'normal', 'relaxed']).default('normal'),
  spacing: z.enum(['compact', 'normal', 'comfortable']).default('normal'),
  animations: z.object({
    enabled: z.boolean().default(true),
    duration: z.enum(['fast', 'normal', 'slow']).default('normal'),
    reducedMotion: z.boolean().default(false),
  }),
  colors: z.object({
    saturation: z.enum(['muted', 'normal', 'vibrant']).default('normal'),
    contrast: z.enum(['low', 'normal', 'high']).default('normal'),
  }),
});

export const NotificationSchema = z.object({
  enabled: z.boolean().default(true),
  types: z.object({
    achievements: z.boolean().default(true),
    goals: z.boolean().default(true),
    reminders: z.boolean().default(true),
    updates: z.boolean().default(true),
    social: z.boolean().default(false),
  }),
  sound: z.object({
    enabled: z.boolean().default(true),
    volume: z.number().min(0).max(100).default(50),
  }),
  position: z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left']).default('top-right'),
  duration: z.number().min(2000).max(10000).default(5000),
});

export const PrivacySchema = z.object({
  dataSharing: z.object({
    analytics: z.boolean().default(true),
    crashReports: z.boolean().default(true),
    usageStats: z.boolean().default(false),
  }),
  visibility: z.object({
    profile: z.enum(['public', 'friends', 'private']).default('private'),
    achievements: z.enum(['public', 'friends', 'private']).default('friends'),
    goals: z.enum(['public', 'friends', 'private']).default('private'),
  }),
  tracking: z.object({
    allowCookies: z.boolean().default(true),
    allowLocation: z.boolean().default(false),
    allowNotifications: z.boolean().default(true),
  }),
});

export const AccessibilitySchema = z.object({
  screenReader: z.object({
    enabled: z.boolean().default(false),
    announcements: z.boolean().default(true),
    skipLinks: z.boolean().default(true),
  }),
  keyboard: z.object({
    shortcuts: z.boolean().default(true),
    focusIndicators: z.boolean().default(true),
    tabOrder: z.boolean().default(true),
  }),
  visual: z.object({
    highContrast: z.boolean().default(false),
    largeText: z.boolean().default(false),
    colorBlind: z.enum(['none', 'protanopia', 'deuteranopia', 'tritanopia']).default('none'),
  }),
});

// Customization store interface
interface CustomizationStore {
  layout: z.infer<typeof LayoutSchema>;
  display: z.infer<typeof DisplaySchema>;
  notifications: z.infer<typeof NotificationSchema>;
  privacy: z.infer<typeof PrivacySchema>;
  accessibility: z.infer<typeof AccessibilitySchema>;
  
  // Actions
  updateLayout: (updates: Partial<z.infer<typeof LayoutSchema>>) => void;
  updateDisplay: (updates: Partial<z.infer<typeof DisplaySchema>>) => void;
  updateNotifications: (updates: Partial<z.infer<typeof NotificationSchema>>) => void;
  updatePrivacy: (updates: Partial<z.infer<typeof PrivacySchema>>) => void;
  updateAccessibility: (updates: Partial<z.infer<typeof AccessibilitySchema>>) => void;
  resetAll: () => void;
  exportSettings: () => string;
  importSettings: (settings: string) => boolean;
  applyCustomization: () => void;
}

// Default customization values
const defaultLayout = LayoutSchema.parse({});
const defaultDisplay = DisplaySchema.parse({});
const defaultNotifications = NotificationSchema.parse({});
const defaultPrivacy = PrivacySchema.parse({});
const defaultAccessibility = AccessibilitySchema.parse({});

// Customization store
export const useCustomizationStore = create<CustomizationStore>()(
  persist(
    (set, get) => ({
      layout: defaultLayout,
      display: defaultDisplay,
      notifications: defaultNotifications,
      privacy: defaultPrivacy,
      accessibility: defaultAccessibility,

      updateLayout: (updates) => {
        set((state) => ({
          layout: { ...state.layout, ...updates },
        }));
        get().applyCustomization();
      },

      updateDisplay: (updates) => {
        set((state) => ({
          display: { ...state.display, ...updates },
        }));
        get().applyCustomization();
      },

      updateNotifications: (updates) => {
        set((state) => ({
          notifications: { ...state.notifications, ...updates },
        }));
        get().applyCustomization();
      },

      updatePrivacy: (updates) => {
        set((state) => ({
          privacy: { ...state.privacy, ...updates },
        }));
        get().applyCustomization();
      },

      updateAccessibility: (updates) => {
        set((state) => ({
          accessibility: { ...state.accessibility, ...updates },
        }));
        get().applyCustomization();
      },

      resetAll: () => {
        set({
          layout: defaultLayout,
          display: defaultDisplay,
          notifications: defaultNotifications,
          privacy: defaultPrivacy,
          accessibility: defaultAccessibility,
        });
        get().applyCustomization();
      },

      exportSettings: () => {
        const state = get();
        return JSON.stringify({
          layout: state.layout,
          display: state.display,
          notifications: state.notifications,
          privacy: state.privacy,
          accessibility: state.accessibility,
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
        }, null, 2);
      },

      importSettings: (settings) => {
        try {
          const parsed = JSON.parse(settings);
          
          // Validate imported settings
          const layout = LayoutSchema.parse(parsed.layout || defaultLayout);
          const display = DisplaySchema.parse(parsed.display || defaultDisplay);
          const notifications = NotificationSchema.parse(parsed.notifications || defaultNotifications);
          const privacy = PrivacySchema.parse(parsed.privacy || defaultPrivacy);
          const accessibility = AccessibilitySchema.parse(parsed.accessibility || defaultAccessibility);

          set({
            layout,
            display,
            notifications,
            privacy,
            accessibility,
          });

          get().applyCustomization();
          return true;
        } catch (error) {
          // Failed to import settings - handled by error boundary
          return false;
        }
      },

      applyCustomization: () => {
        const state = get();
        const root = document.documentElement;

        // Apply layout customizations
        root.style.setProperty('--sidebar-width', `${state.layout.sidebar.width}px`);
        root.style.setProperty('--header-height', `${state.layout.header.height}px`);
        root.style.setProperty('--content-max-width', `${state.layout.content.maxWidth}px`);
        root.style.setProperty('--content-padding', `${state.layout.content.padding}px`);
        root.style.setProperty('--grid-gap', `${state.layout.content.gridGap}px`);
        root.style.setProperty('--footer-height', `${state.layout.footer.height}px`);

        // Apply display customizations
        root.style.setProperty('--font-size', state.display.fontSize);
        root.style.setProperty('--line-height', state.display.lineHeight);
        root.style.setProperty('--spacing', state.display.spacing);
        root.style.setProperty('--animation-duration', 
          state.display.animations.duration === 'fast' ? '150ms' :
          state.display.animations.duration === 'slow' ? '500ms' : '300ms'
        );

        // Apply accessibility customizations
        if (state.accessibility.visual.highContrast) {
          root.classList.add('high-contrast');
        } else {
          root.classList.remove('high-contrast');
        }

        if (state.accessibility.visual.largeText) {
          root.classList.add('large-text');
        } else {
          root.classList.remove('large-text');
        }

        if (state.accessibility.visual.colorBlind !== 'none') {
          root.classList.add(`colorblind-${state.accessibility.visual.colorBlind}`);
        } else {
          root.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
        }

        if (state.accessibility.keyboard.focusIndicators) {
          root.classList.add('focus-visible');
        } else {
          root.classList.remove('focus-visible');
        }

        // Apply reduced motion
        if (state.display.animations.reducedMotion) {
          root.classList.add('reduce-motion');
        } else {
          root.classList.remove('reduce-motion');
        }

        // Update document attributes for screen readers
        if (state.accessibility.screenReader.enabled) {
          document.body.setAttribute('aria-live', 'polite');
        } else {
          document.body.removeAttribute('aria-live');
        }
      },
    }),
    {
      name: 'customization-storage',
      partialize: (state) => ({
        layout: state.layout,
        display: state.display,
        notifications: state.notifications,
        privacy: state.privacy,
        accessibility: state.accessibility,
      }),
    }
  )
);

// Customization utilities
export class CustomizationUtils {
  // Get CSS custom properties
  static getCSSVariables(): Record<string, string> {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const variables: Record<string, string> = {};

    for (let i = 0; i < computed.length; i++) {
      const property = computed[i];
      if (property.startsWith('--')) {
        variables[property] = computed.getPropertyValue(property);
      }
    }

    return variables;
  }

  // Generate customization CSS
  static generateCustomizationCSS(): string {
    return `
      :root {
        /* Layout variables */
        --sidebar-width: 280px;
        --header-height: 64px;
        --content-max-width: 1200px;
        --content-padding: 24px;
        --grid-gap: 16px;
        --footer-height: 60px;

        /* Display variables */
        --font-size: base;
        --line-height: normal;
        --spacing: normal;
        --animation-duration: 300ms;

        /* Customization classes */
        .sidebar-left { --sidebar-position: left; }
        .sidebar-right { --sidebar-position: right; }
        .sidebar-collapsed { --sidebar-width: 60px; }

        .header-sticky { position: sticky; top: 0; z-index: 100; }
        .header-static { position: static; }

        .content-narrow { --content-max-width: 800px; }
        .content-wide { --content-max-width: 1400px; }

        .spacing-compact { --spacing: 8px; }
        .spacing-comfortable { --spacing: 32px; }

        .font-xs { font-size: 0.75rem; }
        .font-sm { font-size: 0.875rem; }
        .font-base { font-size: 1rem; }
        .font-lg { font-size: 1.125rem; }
        .font-xl { font-size: 1.25rem; }
        .font-2xl { font-size: 1.5rem; }

        .line-tight { line-height: 1.25; }
        .line-relaxed { line-height: 1.75; }

        /* Accessibility classes */
        .high-contrast {
          --color-text: #000000;
          --color-background: #ffffff;
          --color-border: #000000;
        }

        .large-text {
          font-size: 1.2em;
        }

        .colorblind-protanopia {
          filter: url('#protanopia');
        }

        .colorblind-deuteranopia {
          filter: url('#deuteranopia');
        }

        .colorblind-tritanopia {
          filter: url('#tritanopia');
        }

        .reduce-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        .focus-visible:focus {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        /* Skip links for accessibility */
        .skip-link {
          position: absolute;
          top: -40px;
          left: 6px;
          background: var(--color-primary);
          color: white;
          padding: 8px;
          text-decoration: none;
          border-radius: 4px;
          z-index: 1000;
        }

        .skip-link:focus {
          top: 6px;
        }
      }
    `;
  }

  // Validate customization settings
  static validateSettings(settings: any): boolean {
    try {
      LayoutSchema.parse(settings.layout);
      DisplaySchema.parse(settings.display);
      NotificationSchema.parse(settings.notifications);
      PrivacySchema.parse(settings.privacy);
      AccessibilitySchema.parse(settings.accessibility);
      return true;
    } catch {
      return false;
    }
  }

  // Get customization recommendations
  static getRecommendations(): Record<string, string[]> {
    return {
      accessibility: [
        'Enable high contrast mode for better visibility',
        'Use large text if you have difficulty reading',
        'Enable focus indicators for keyboard navigation',
        'Use reduced motion if animations cause discomfort',
      ],
      performance: [
        'Disable animations for better performance on older devices',
        'Use compact spacing to fit more content on screen',
        'Reduce font size for more content visibility',
      ],
      privacy: [
        'Disable analytics tracking for enhanced privacy',
        'Set profile visibility to private',
        'Disable location tracking',
      ],
    };
  }
}

// React hook for customization
import { useEffect } from 'react';

export function useCustomization() {
  const store = useCustomizationStore();

  // Apply customization on mount
  useEffect(() => {
    store.applyCustomization();
  }, []);

  return store;
}

// Export utilities
export const customizationUtils = {
  CustomizationUtils,
  useCustomization,
  LayoutSchema,
  DisplaySchema,
  NotificationSchema,
  PrivacySchema,
  AccessibilitySchema,
}; 