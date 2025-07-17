import { createIntl, createIntlCache } from '@formatjs/intl';
import { getRequestConfig } from 'next-intl/server';

// Supported locales
export const locales = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko'] as const;
export type Locale = typeof locales[number];

// Default locale
export const defaultLocale: Locale = 'en';

// Locale configuration
export const localeConfig = {
  en: {
    name: 'English',
    flag: '🇺🇸',
    direction: 'ltr' as const,
  },
  es: {
    name: 'Español',
    flag: '🇪🇸',
    direction: 'ltr' as const,
  },
  fr: {
    name: 'Français',
    flag: '🇫🇷',
    direction: 'ltr' as const,
  },
  de: {
    name: 'Deutsch',
    flag: '🇩🇪',
    direction: 'ltr' as const,
  },
  zh: {
    name: '中文',
    flag: '🇨🇳',
    direction: 'ltr' as const,
  },
  ja: {
    name: '日本語',
    flag: '🇯🇵',
    direction: 'ltr' as const,
  },
  ko: {
    name: '한국어',
    flag: '🇰🇷',
    direction: 'ltr' as const,
  },
} as const;

// Intl cache for performance
const cache = createIntlCache();

// Create intl instance
export function createIntlInstance(locale: Locale) {
  return createIntl(
    {
      locale,
      messages: {}, // Will be loaded dynamically
    },
    cache
  );
}

// Next-intl configuration
export default getRequestConfig(async ({ locale }) => {
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    messages: (await import(`../translations/${locale}.json`)).default,
    timeZone: 'UTC',
    now: new Date(),
  };
});

// Translation function
export function t(key: string, locale: Locale = defaultLocale, params?: Record<string, any>): string {
  try {
    const messages = require(`../translations/${locale}.json`);
    let message = messages[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        message = message.replace(new RegExp(`{${param}}`, 'g'), String(value));
      });
    }
    
    return message;
  } catch (error) {
    // Translation not found - handled by error boundary
    return key;
  }
}

// Number formatting
export function formatNumber(
  value: number,
  locale: Locale = defaultLocale,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

// Currency formatting
export function formatCurrency(
  value: number,
  locale: Locale = defaultLocale,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

// Date formatting
export function formatDate(
  date: Date | string,
  locale: Locale = defaultLocale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

// Relative time formatting
export function formatRelativeTime(
  date: Date | string,
  locale: Locale = defaultLocale
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (Math.abs(diffInSeconds) < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (Math.abs(diffInSeconds) < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (Math.abs(diffInSeconds) < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  }
}

// Pluralization
export function pluralize(
  count: number,
  singular: string,
  plural: string,
  locale: Locale = defaultLocale
): string {
  const pluralRules = new Intl.PluralRules(locale);
  const rule = pluralRules.select(count);
  
  switch (rule) {
    case 'one':
      return singular;
    default:
      return plural;
  }
}

// Direction detection
export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return localeConfig[locale].direction;
}

// Locale validation
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

// Get locale from request
export function getLocaleFromRequest(request: Request): Locale {
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim())
      .find(lang => isValidLocale(lang));
    
    if (preferredLocale) {
      return preferredLocale as Locale;
    }
  }
  
  return defaultLocale;
}

// Locale switcher component props
export interface LocaleSwitcherProps {
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
  className?: string;
}

// Hook for using translations
export function useTranslations(locale: Locale = defaultLocale) {
  return {
    t: (key: string, params?: Record<string, any>) => t(key, locale, params),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => 
      formatNumber(value, locale, options),
    formatCurrency: (value: number, currency?: string) => 
      formatCurrency(value, locale, currency),
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => 
      formatDate(date, locale, options),
    formatRelativeTime: (date: Date | string) => 
      formatRelativeTime(date, locale),
    pluralize: (count: number, singular: string, plural: string) => 
      pluralize(count, singular, plural, locale),
    locale,
    direction: getDirection(locale),
  };
}

// Utility for loading translations dynamically
export async function loadTranslations(locale: Locale) {
  try {
    const messages = await import(`../translations/${locale}.json`);
    return messages.default;
  } catch (error) {
    // Failed to load translations - handled by error boundary
    return {};
  }
}

// Preload translations for better performance
export function preloadTranslations(locales: Locale[]) {
  locales.forEach(locale => {
    import(`../translations/${locale}.json`).catch(() => {
      // Ignore errors for preloading
    });
  });
} 