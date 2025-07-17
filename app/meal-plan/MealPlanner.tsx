import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../services/storage';
import { analytics } from '../services/analytics';
import { logError, logInfo } from '../utils/logger';
import { MealPlanCreator } from './meal-planning/MealPlanCreator';
import { MealPlanViewer } from './meal-planning/MealPlanViewer';
import { MealAdder } from './meal-planning/MealAdder';
import type { MealPlanV2 as MealPlan } from '../types/nutrition';

export const MealPlanner: React.FC = () => {
  // Get the current user
  const { user } = useAuth();
  
  // State for meal plans
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // UI state
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load meal plans
  useEffect(() => {
    const loadMealPlans = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const storedPlans = await storage.getItem<MealPlan[]>(`meal_plans_${user.id}`, 'mealPlans');
        
        if (storedPlans) {
          // Sort plans by start date (newest first)
          const sortedPlans = [...storedPlans].sort((a, b) => 
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
          
          setMealPlans(sortedPlans);
          
          // Track analytics
          analytics.trackEvent({
            category: 'MealPlanner',
            action: 'load_plans',
            label: 'success',
            value: sortedPlans.length
          });
          
          logInfo(`Loaded ${sortedPlans.length} meal plans for user ${user.id}`);
        } else {
          setMealPlans([]);
          
          // Track analytics
        analytics.trackEvent({
          category: 'MealPlanner',
            action: 'load_plans',
            label: 'empty',
            value: 0
        });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load meal plans';
        setError(errorMessage);
        logError('Error loading meal plans:', err);
        
        // Track analytics
        analytics.trackError({
          errorType: 'load_plans_error',
          errorMessage,
          context: { userId: user.id }
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMealPlans();
  }, [user]);
  
  // Handle plan creation
  const handlePlanCreated = (newPlan: MealPlan) => {
    setMealPlans(prev => [newPlan, ...prev]);
    setIsCreatingPlan(false);
    setSelectedPlanId(newPlan.id);
    
    // Track analytics
    analytics.trackEvent({
      category: 'MealPlanner',
      action: 'create_plan_success',
      label: newPlan.name
    });
  };
  
  // Handle meal addition
  const handleMealAdded = (updatedPlan: MealPlan) => {
    setMealPlans(prev => prev.map(plan => 
      plan.id === updatedPlan.id ? updatedPlan : plan
    ));
    setIsAddingMeal(false);
    
    // Track analytics
      analytics.trackEvent({
      category: 'MealPlanner',
      action: 'add_meal_success',
      label: updatedPlan.name,
      value: updatedPlan.meals.length
    });
  };
  
  // Handle plan deletion
  const handleDeletePlan = async () => {
    if (!user || !selectedPlanId) return;
    
    try {
      // Find the plan to delete
      const planToDelete = mealPlans.find(plan => plan.id === selectedPlanId);
      
      if (!planToDelete) {
        throw new Error('Plan not found');
      }
      
      // Remove the plan from the list
      const updatedPlans = mealPlans.filter(plan => plan.id !== selectedPlanId);
      
      // Update storage
      await storage.setItem(`meal_plans_${user.id}`, updatedPlans, 'mealPlans');
      
      // Update state
      setMealPlans(updatedPlans);
      setSelectedPlanId(null);

      // Track analytics
      analytics.trackEvent({
        category: 'MealPlanner',
        action: 'delete_plan',
        label: planToDelete.name
      });
      
      logInfo(`Deleted meal plan: ${planToDelete.name}`, { userId: user.id, planId: selectedPlanId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete meal plan';
      setError(errorMessage);
      logError('Error deleting meal plan:', err);
      
      // Track analytics
      analytics.trackError({
        errorType: 'delete_plan_error',
        errorMessage,
        context: { userId: user.id, planId: selectedPlanId }
      });
    }
  };

  // Render the appropriate view based on state
  const renderContent = () => {
    if (!user) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Sign In Required</h2>
          <p className="text-gray-600">Please sign in to access your meal plans.</p>
        </div>
      );
    }
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading meal plans...</p>
          </div>
        </div>
      );
    }
    
    if (error) {
  return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      );
    }
    
    if (isCreatingPlan) {
      return (
        <MealPlanCreator 
          userId={user.id}
          onPlanCreated={handlePlanCreated}
          onCancel={() => setIsCreatingPlan(false)}
        />
      );
    }
    
    if (isAddingMeal && selectedPlanId) {
      return (
        <MealAdder 
          userId={user.id}
          planId={selectedPlanId}
          onMealAdded={handleMealAdded}
          onCancel={() => setIsAddingMeal(false)}
        />
      );
    }
    
    if (selectedPlanId) {
      const selectedPlan = mealPlans.find(plan => plan.id === selectedPlanId);
      
      if (selectedPlan) {
        return (
          <MealPlanViewer 
            plan={selectedPlan}
            onDelete={handleDeletePlan}
            onAddMeal={() => setIsAddingMeal(true)}
          />
        );
      }
    }
    
    // Default view - list of meal plans or empty state
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Your Meal Plans</h2>
        <button
          onClick={() => setIsCreatingPlan(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          Create New Plan
        </button>
      </div>

        {mealPlans.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No meal plans yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first meal plan.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setIsCreatingPlan(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg 
                  className="-ml-1 mr-2 h-5 w-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                  />
                </svg>
                Create New Plan
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mealPlans.map(plan => (
              <div
                key={plan.id}
                className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <div className="bg-blue-600 px-4 py-2">
                  <h3 className="font-bold text-white truncate">{plan.name}</h3>
                </div>
                <div className="p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">{plan.startDate} to {plan.endDate}</span>
                    <span className="font-medium">{plan.dailyCalories} cal/day</span>
                  </div>
                  
                  {plan.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plan.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-1">
                      {plan.dietaryRestrictions.slice(0, 2).map(restriction => (
                        <span 
                          key={restriction}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {restriction}
                        </span>
                      ))}
                      {plan.dietaryRestrictions.length > 2 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          +{plan.dietaryRestrictions.length - 2} more
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {plan.meals.length} {plan.meals.length === 1 ? 'meal' : 'meals'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      {renderContent()}
    </div>
  );
}; 