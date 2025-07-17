import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Dynamic import wrapper with loading and error states
export function createDynamicComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: {
    ssr?: boolean;
  } = {}
) {
  return dynamic(importFunc, {
    ssr: options.ssr ?? true,
  });
}

// Predefined dynamic components for common use cases
export const DynamicChart = createDynamicComponent(
  () => import('react-chartjs-2').then((mod) => ({ default: mod.Line })),
  { ssr: false }
);

export const DynamicBarChart = createDynamicComponent(
  () => import('react-chartjs-2').then((mod) => ({ default: mod.Bar })),
  { ssr: false }
);

export const DynamicPieChart = createDynamicComponent(
  () => import('react-chartjs-2').then((mod) => ({ default: mod.Pie })),
  { ssr: false }
);

export const DynamicDoughnutChart = createDynamicComponent(
  () => import('react-chartjs-2').then((mod) => ({ default: mod.Doughnut })),
  { ssr: false }
);

// Use existing dialog component instead of non-existent modal
export const DynamicModal = createDynamicComponent(
  () => import('@/components/ui/dialog').then((mod) => ({ default: mod.Dialog })),
  { ssr: false }
);

// Remove date-picker import as it doesn't exist
// export const DynamicDatePicker = createDynamicComponent(
//   () => import('@/components/ui/date-picker').then((mod) => ({ default: mod.DatePicker })),
//   { ssr: false }
// );

// Use existing BarcodeScanner component
export const DynamicBarcodeScanner = createDynamicComponent(
  () => import('@/components/BarcodeScanner/BarcodeScanner').then((mod) => ({ default: mod.BarcodeScanner })),
  { ssr: false }
);

export const DynamicAnalytics = createDynamicComponent(
  () => import('@/components/AnalyticsDashboard').then((mod) => ({ default: mod.AnalyticsDashboard })),
  { ssr: false }
);

// Utility for conditional dynamic imports
export function conditionalDynamicImport<T extends ComponentType<any>>(
  condition: boolean,
  importFunc: () => Promise<{ default: T }>,
  fallback: T
): T {
  if (condition) {
    return createDynamicComponent(importFunc, { ssr: false }) as T;
  }
  return fallback;
}

// Lazy load utilities for different screen sizes
export const MobileOnlyComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return createDynamicComponent(importFunc, {
    ssr: false,
  });
};

export const DesktopOnlyComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return createDynamicComponent(importFunc, {
    ssr: false,
  });
};

// Performance monitoring for dynamic imports
export function withPerformanceMonitoring<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  componentName: string
) {
  return createDynamicComponent(
    () => {
      const startTime = performance.now();
      return importFunc().then((module) => {
        const endTime = performance.now();
        // Performance monitoring: component loaded
        return module;
      });
    },
    { ssr: false }
  );
} 