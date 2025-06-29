import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NutritionalGoals } from './components/NutritionalGoals';
import { NutritionTracker } from './components/NutritionTracker';
import { ActivityTracker } from './components/ActivityTracker';
import { MealPlanner } from './components/MealPlanner';
import { RecipeManager } from './components/RecipeManager';
import { FoodItemManager } from './components/FoodItemManager';
import { analytics } from './services/analytics';
import { monitoring } from './services/monitoring';
import { storage } from './services/storage';
import { componentLifecycleManager } from './lib/componentLifecycleManager';
import { performanceDashboard } from './scripts/utils/performance-dashboard';
import { useComponentLifecycle } from './lib/hooks/useComponentLifecycle';

const App: React.FC = () => {
  const [userId, setUserId] = useState<string>('default-user');
  const [activeTab, setActiveTab] = useState<string>('nutrition');
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Use component lifecycle hook
  useComponentLifecycle({
    onMemoryWarning: (usage, limit) => {
      console.warn(`Memory usage warning: ${usage}MB/${limit}MB`);
    },
    onPerformanceWarning: (metrics) => {
      console.warn('Performance warning:', metrics);
    },
    performanceWarningThreshold: {
      fps: 30,
      memoryUsage: 0.8,
      renderTime: 16.67
    }
  });

  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize services in correct order
        // 1. First initialize monitoring (needed to track other services)
        await monitoring.initialize();

        // 2. Initialize storage (needed for analytics)
        await storage.initialize();

        // 3. Initialize analytics (depends on storage)
        await analytics.initialize();

        // 4. Initialize performance monitoring
        await performanceDashboard.start();

        // Register app component
        componentLifecycleManager.registerComponent('app-root');

        setIsInitialized(true);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to initialize services';
        setInitError(error);
        
        // Still try to track error even if analytics isn't fully initialized
        try {
          analytics.trackError({
            errorType: 'service_initialization_error',
            errorMessage: error
          });
        } catch {
          console.error('Failed to track initialization error:', error);
        }
      }
    };

    initializeServices();

    // Cleanup function
    return () => {
      componentLifecycleManager.cleanup('app-root').catch(console.error);
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    // Track page view
    analytics.trackEvent({
      category: 'Navigation',
      action: 'view_page',
      label: activeTab
    });

    // Register app-level monitoring metrics
    monitoring.registerMetric({
      name: 'app_errors',
      type: 'counter',
      description: 'Number of application errors',
      alertThresholds: {
        warning: 5,
        critical: 10
      }
    });

    // Monitor tab changes
    monitoring.registerMetric({
      name: 'tab_changes',
      type: 'counter',
      description: 'Number of tab changes',
      alertThresholds: {
        warning: 50,
        critical: 100
      }
    });
  }, [activeTab, isInitialized]);

  const handleTabChange = (tab: string) => {
    if (!isInitialized) return;

    setActiveTab(tab);
    analytics.trackEvent({
      category: 'Navigation',
      action: 'change_tab',
      label: tab
    });

    monitoring.incrementMetric('tab_changes');
  };

  const renderActiveTab = () => {
    if (!isInitialized) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing services...</p>
          </div>
        </div>
      );
    }

    if (initError) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Initialization Error</p>
          <p>{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      );
    }

    const TabComponent = (() => {
      switch (activeTab) {
        case 'nutrition':
          return <NutritionTracker userId={userId} />;
        case 'activity':
          return <ActivityTracker userId={userId} />;
        case 'goals':
          return <NutritionalGoals userId={userId} />;
        case 'meal-planner':
          return <MealPlanner userId={userId} />;
        case 'recipes':
          return <RecipeManager userId={userId} />;
        case 'food-items':
          return <FoodItemManager userId={userId} />;
        default:
          return <NutritionTracker userId={userId} />;
      }
    })();

    return (
      <ErrorBoundary>
        {TabComponent}
      </ErrorBoundary>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Nutrition Tracker</h1>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4">
            {[
              { id: 'nutrition', label: 'Daily Log' },
              { id: 'activity', label: 'Activity' },
              { id: 'goals', label: 'Goals' },
              { id: 'meal-planner', label: 'Meal Planner' },
              { id: 'recipes', label: 'Recipes' },
              { id: 'food-items', label: 'Food Items' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={!isInitialized}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTab()}
      </main>
    </div>
  );
};

export default App; 