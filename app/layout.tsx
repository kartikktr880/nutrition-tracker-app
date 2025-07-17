import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/ThemeProvider/ThemeProvider';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Nutrition Tracker - Smart Health & Fitness Tracking',
    template: '%s | Nutrition Tracker'
  },
  description: 'Track your nutrition, calories, and fitness goals with our comprehensive health tracking app. Get personalized insights, meal planning, and progress analytics.',
  keywords: [
    'nutrition tracker',
    'calorie counter',
    'fitness app',
    'meal planning',
    'health tracking',
    'diet app',
    'weight loss',
    'macros tracking',
    'food diary',
    'health analytics'
  ],
  authors: [{ name: 'Nutrition Tracker Team' }],
  creator: 'Nutrition Tracker',
  publisher: 'Nutrition Tracker',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://nutrition-tracker.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
      'es-ES': '/es-ES',
      'de-DE': '/de-DE',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Nutrition Tracker - Smart Health & Fitness Tracking',
    description: 'Track your nutrition, calories, and fitness goals with our comprehensive health tracking app. Get personalized insights, meal planning, and progress analytics.',
    siteName: 'Nutrition Tracker',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Nutrition Tracker - Smart Health & Fitness Tracking',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nutrition Tracker - Smart Health & Fitness Tracking',
    description: 'Track your nutrition, calories, and fitness goals with our comprehensive health tracking app.',
    images: ['/images/twitter-image.jpg'],
    creator: '@nutritiontracker',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    yahoo: process.env.YAHOO_VERIFICATION,
  },
  category: 'health',
  classification: 'Health & Fitness',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Nutrition Tracker',
    'application-name': 'Nutrition Tracker',
    'msapplication-TileColor': '#28a745',
    'msapplication-config': '/browserconfig.xml',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

// Structured data for the homepage
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Nutrition Tracker',
  description: 'Smart health and fitness tracking application',
  url: 'https://nutrition-tracker.com',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Organization',
    name: 'Nutrition Tracker Team',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1250',
  },
  featureList: [
    'Calorie Tracking',
    'Macro Analysis',
    'Meal Planning',
    'Progress Analytics',
    'Water Intake Tracking',
    'Goal Setting',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#28a745" />
        <meta name="msapplication-TileColor" content="#28a745" />
        <meta name="theme-color" content="#28a745" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.nutritionix.com" />
        
        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//api.nutritionix.com" />
        
        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <SessionProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
} 