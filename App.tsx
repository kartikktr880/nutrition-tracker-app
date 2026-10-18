import { logError, logWarn, logInfo, logDebug } from './utils/logger';
import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './app/auth/ErrorBoundary';
import { NutritionalGoals } from './components/NutritionalGoals';
import { NutritionTracker } from './app/food-logger/NutritionTracker';
import ActivityTracker from './app/exercise/ActivityTracker';
import { MealPlanner } from './app/meal-plan/MealPlanner';
import { RecipeManager } from './components/RecipeManager';
import { FoodItemManager } from './app/food-logger/FoodItemManager';
import { LoginForm } from './app/auth/LoginForm';
import { useAuth } from './hooks/useAuth';
import { analytics } from './services/analytics';
import { monitoring } from './services/monitoring';
import { storage } from './services/storage';
import { componentLifecycleManager } from './lib/componentLifecycleManager';
import { PerformanceDashboard } from './scripts/utils/performance-dashboard';
import { useComponentLifecycle } from './lib/hooks/useComponentLifecycle';

// Create singleton instance for performance dashboard
const performanceDashboard = PerformanceDashboard.initialize({ containerId: 'performance-dashboard-root' });

const App: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('nutrition');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Use component lifecycle hook
  useComponentLifecycle({
    onMemoryWarning: (usage: number, limit: number) => {
      logWarn(`Memory usage warning: ${usage}MB/${limit}MB`);
    },
    onPerformanceWarning: (metrics: Record<string, unknown>) => {
      logWarn('Performance warning:', metrics);
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
        // Initialize monitoring (if needed)
        // No initialize method, so skip

        // Initialize storage (constructor handles it)
        // No need to await
        // Initialize analytics (constructor handles it)
        // No need to await

        // Start performance dashboard
        await performanceDashboard.start();

        // Register app component with lifecycle
        componentLifecycleManager.registerComponent('app-root', {
          onMount: () => {},
          onUnmount: () => {},
        });

        setIsInitialized(true);
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : 'Failed to initialize services';
        setInitError(error);
        try {
          analytics.trackError({
            errorType: 'service_initialization_error',
            errorMessage: error
          });
        } catch {
          logError('Failed to track initialization error:', error);
        }
      }
    };
    initializeServices();
    // Cleanup function
    return () => {
      componentLifecycleManager.cleanup();
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

  useEffect(() => {
    // Track authentication state
    if (isAuthenticated && user) {
      analytics.trackEvent({
        category: 'Auth',
        action: 'user_authenticated',
        label: user.email
      });
    }
  }, [isAuthenticated, user]);

  const handleTabChange = (tab: string) => {
    if (!isInitialized) return;

    setActiveTab(tab);
    analytics.trackEvent({
      category: 'Navigation',
      action: 'change_tab',
      label: tab
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      analytics.trackEvent({
        category: 'Auth',
        action: 'user_logout'
      });
    } catch (err) {
      logError('Logout error:', err);
    }
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

    if (!isAuthenticated && !authLoading) {
      return <LoginForm />;
    }

    const TabComponent = (() => {
      switch (activeTab) {
        case 'nutrition':
          return <NutritionTracker userId={user?.id || 'guest'} />;
        case 'activity':
          return <ActivityTracker userId={user?.id || 'guest'} />;
        case 'goals':
          return <NutritionalGoals userId={user?.id || 'guest'} />;
        case 'meal-planner':
          return <MealPlanner />;
        case 'recipes':
          return <RecipeManager userId={user?.id || 'guest'} onSave={() => {}} />;
        case 'food-items':
          return <FoodItemManager userId={user?.id || 'guest'} />;
        default:
          return <NutritionTracker userId={user?.id || 'guest'} />;
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
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Nutrition Tracker</h1>
            {isAuthenticated && user && (
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  Hello, {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isAuthenticated && (
        <nav className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4 overflow-x-auto py-2">
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
                  className={`px-4 py-2 rounded whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      <main className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {renderActiveTab()}
      </main>

      <footer className="bg-white border-t py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Nutrition Tracker. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App; 