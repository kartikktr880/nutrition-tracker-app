import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { analytics } from '../../services/analytics';
import { logError, logInfo } from '../../utils/logger';
import { formatDateYYYYMMDD, addDays } from '../../utils/dateUtils';
import type { MealPlanV2 as MealPlan } from '../../types/nutrition';

interface MealPlanCreatorProps {
  userId: string;
  onPlanCreated: (plan: MealPlan) => void;
  onCancel: () => void;
}

// Step types for the wizard
type Step = 'basics' | 'macros' | 'dietary' | 'review';

export const MealPlanCreator: React.FC<MealPlanCreatorProps> = ({ userId, onPlanCreated, onCancel }) => {
  // Current step in the wizard
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  
  // Form state
  const [formData, setFormData] = useState<Partial<MealPlan>>({
    id: crypto.randomUUID(),
    name: '',
    description: '',
    startDate: formatDateYYYYMMDD(new Date()),
    endDate: formatDateYYYYMMDD(addDays(new Date(), 7)),
    dailyCalories: 2000,
    macroRatios: {
      protein: 30,
      carbs: 40,
      fat: 30
    },
    dietaryRestrictions: [],
    meals: []
  });
  
  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      if (parent === 'macroRatios') {
        setFormData(prev => ({
          ...prev,
          macroRatios: {
            ...(prev.macroRatios ?? { protein: 0, carbs: 0, fat: 0 }),
            [child]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numberValue = value === '' ? 0 : parseInt(value, 10);
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      if (parent === 'macroRatios') {
        setFormData(prev => ({
          ...prev,
          macroRatios: {
            ...(prev.macroRatios ?? { protein: 0, carbs: 0, fat: 0 }),
            [child]: numberValue
          }
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: numberValue }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Handle dietary restriction changes
  const handleDietaryChange = (restriction: string) => {
    setFormData(prev => {
      const currentRestrictions = prev.dietaryRestrictions || [];
      
      if (currentRestrictions.includes(restriction)) {
        // Remove restriction if already selected
        return {
          ...prev,
          dietaryRestrictions: currentRestrictions.filter(r => r !== restriction)
        };
      } else {
        // Add restriction if not already selected
        return {
          ...prev,
          dietaryRestrictions: [...currentRestrictions, restriction]
        };
      }
    });
  };
  
  // Validate the current step
  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (currentStep) {
      case 'basics':
        if (!formData.name?.trim()) {
          newErrors.name = 'Plan name is required';
        }
        
        if (!formData.startDate) {
          newErrors.startDate = 'Start date is required';
        }
        
        if (!formData.endDate) {
          newErrors.endDate = 'End date is required';
        } else if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
          newErrors.endDate = 'End date must be after start date';
        }
        break;
        
      case 'macros':
        if (!formData.dailyCalories || formData.dailyCalories < 500) {
          newErrors.dailyCalories = 'Daily calories must be at least 500';
        }
        
        if (!formData.macroRatios?.protein) {
          newErrors['macroRatios.protein'] = 'Protein percentage is required';
        }
        
        if (!formData.macroRatios?.carbs) {
          newErrors['macroRatios.carbs'] = 'Carbs percentage is required';
        }
        
        if (!formData.macroRatios?.fat) {
          newErrors['macroRatios.fat'] = 'Fat percentage is required';
        }
        
        // Check if macros add up to 100%
        const totalMacros = (formData.macroRatios?.protein || 0) + 
                            (formData.macroRatios?.carbs || 0) + 
                            (formData.macroRatios?.fat || 0);
                            
        if (totalMacros !== 100) {
          newErrors.macroTotal = 'Macronutrient percentages must add up to 100%';
        }
        break;
        
      case 'dietary':
        // No validation needed for dietary restrictions
        break;
        
      case 'review':
        // All validation done in previous steps
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Move to the next step
  const handleNextStep = () => {
    if (validateCurrentStep()) {
      switch (currentStep) {
        case 'basics':
          setCurrentStep('macros');
          break;
        case 'macros':
          setCurrentStep('dietary');
          break;
        case 'dietary':
          setCurrentStep('review');
          break;
        case 'review':
          handleCreatePlan();
          break;
      }
      
      // Track step completion
      analytics.trackEvent({
        category: 'MealPlanner',
        action: 'complete_step',
        label: currentStep
      });
    }
  };
  
  // Move to the previous step
  const handlePreviousStep = () => {
    switch (currentStep) {
      case 'macros':
        setCurrentStep('basics');
        break;
      case 'dietary':
        setCurrentStep('macros');
        break;
      case 'review':
        setCurrentStep('dietary');
        break;
    }
  };
  
  // Create the meal plan
  const handleCreatePlan = async () => {
    try {
      setIsLoading(true);
      
      // Final validation
      if (!validateCurrentStep()) {
        setIsLoading(false);
        return;
      }
      
      // Create the plan object
      const newPlan: MealPlan = {
        id: formData.id || '',
        name: formData.name || '',
        description: formData.description || '',
        startDate: formData.startDate || new Date().toISOString(),
        endDate: formData.endDate || new Date().toISOString(),
        dailyCalories: formData.dailyCalories || 2000,
        macroRatios: {
          protein: formData.macroRatios?.protein || 30,
          carbs: formData.macroRatios?.carbs || 40,
          fat: formData.macroRatios?.fat || 30
        },
        dietaryRestrictions: formData.dietaryRestrictions || [],
        meals: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save the plan to storage
      const existingPlans = await storage.getItem<MealPlan[]>(`meal_plans_${userId}`, 'mealPlans') || [];
      const updatedPlans = [...existingPlans, newPlan];
      await storage.setItem(`meal_plans_${userId}`, updatedPlans, 'mealPlans');
      
      // Track plan creation
      analytics.trackEvent({
        category: 'MealPlanner',
        action: 'create_plan',
        label: newPlan.name,
        metadata: {
          planId: newPlan.id,
          duration: Math.floor((new Date(newPlan.endDate).getTime() - new Date(newPlan.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        }
      });
      
      logInfo(`Created meal plan: ${newPlan.name}`, { userId, planId: newPlan.id });
      
      // Call the onPlanCreated callback
      onPlanCreated(newPlan);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create meal plan';
      logError('Error creating meal plan:', err);
      
      analytics.trackError({
        errorType: 'meal_plan_creation_error',
        errorMessage,
        context: { userId, planData: formData }
      });
      
      // Show error to user
      setErrors(prev => ({ ...prev, submit: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 'basics':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Plan Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                placeholder="Weekly Meal Plan"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Optional description of your meal plan"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm ${errors.startDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm ${errors.endDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                />
                {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
              </div>
            </div>
          </div>
        );
        
      case 'macros':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Nutritional Targets</h3>
            
            <div>
              <label htmlFor="dailyCalories" className="block text-sm font-medium text-gray-700">
                Daily Calories <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="dailyCalories"
                name="dailyCalories"
                value={formData.dailyCalories}
                onChange={handleNumberChange}
                min="500"
                max="10000"
                className={`mt-1 block w-full rounded-md shadow-sm ${errors.dailyCalories ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {errors.dailyCalories && <p className="mt-1 text-sm text-red-600">{errors.dailyCalories}</p>}
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Macronutrient Ratios <span className="text-red-500">*</span>
              </h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="protein" className="block text-sm text-gray-600">
                    Protein (%)
                  </label>
                  <input
                    type="number"
                    id="protein"
                    name="macroRatios.protein"
                    value={formData.macroRatios?.protein}
                    onChange={handleNumberChange}
                    min="0"
                    max="100"
                    className={`mt-1 block w-full rounded-md shadow-sm ${errors['macroRatios.protein'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  />
                </div>
                
                <div>
                  <label htmlFor="carbs" className="block text-sm text-gray-600">
                    Carbs (%)
                  </label>
                  <input
                    type="number"
                    id="carbs"
                    name="macroRatios.carbs"
                    value={formData.macroRatios?.carbs}
                    onChange={handleNumberChange}
                    min="0"
                    max="100"
                    className={`mt-1 block w-full rounded-md shadow-sm ${errors['macroRatios.carbs'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  />
                </div>
                
                <div>
                  <label htmlFor="fat" className="block text-sm text-gray-600">
                    Fat (%)
                  </label>
                  <input
                    type="number"
                    id="fat"
                    name="macroRatios.fat"
                    value={formData.macroRatios?.fat}
                    onChange={handleNumberChange}
                    min="0"
                    max="100"
                    className={`mt-1 block w-full rounded-md shadow-sm ${errors['macroRatios.fat'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  />
                </div>
              </div>
              
              {errors.macroTotal && <p className="mt-2 text-sm text-red-600">{errors.macroTotal}</p>}
              
              <div className="mt-4">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="flex h-full">
                    <div 
                      className="bg-blue-500" 
                      style={{ width: `${formData.macroRatios?.protein || 0}%` }}
                      title={`Protein: ${formData.macroRatios?.protein || 0}%`}
                    />
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${formData.macroRatios?.carbs || 0}%` }}
                      title={`Carbs: ${formData.macroRatios?.carbs || 0}%`}
                    />
                    <div 
                      className="bg-yellow-500" 
                      style={{ width: `${formData.macroRatios?.fat || 0}%` }}
                      title={`Fat: ${formData.macroRatios?.fat || 0}%`}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between mt-2 text-xs text-gray-600">
                  <div>Protein: {formData.macroRatios?.protein || 0}%</div>
                  <div>Carbs: {formData.macroRatios?.carbs || 0}%</div>
                  <div>Fat: {formData.macroRatios?.fat || 0}%</div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'dietary':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Dietary Restrictions</h3>
            <p className="text-sm text-gray-600">Select any dietary restrictions that apply to this meal plan.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                'Vegetarian',
                'Vegan',
                'Gluten-Free',
                'Dairy-Free',
                'Nut-Free',
                'Keto',
                'Paleo',
                'Low-Carb',
                'Low-Fat',
                'Low-Sodium',
                'Halal',
                'Kosher'
              ].map(restriction => (
                <div key={restriction} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`restriction-${restriction}`}
                    checked={(formData.dietaryRestrictions || []).includes(restriction)}
                    onChange={() => handleDietaryChange(restriction)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`restriction-${restriction}`} className="ml-2 block text-sm text-gray-700">
                    {restriction}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'review':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Review Your Meal Plan</h3>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Basic Information</h4>
                  <dl className="mt-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Name:</dt>
                      <dd className="font-medium">{formData.name}</dd>
                    </div>
                    {formData.description && (
                      <div className="flex justify-between mt-1">
                        <dt className="text-gray-500">Description:</dt>
                        <dd className="font-medium">{formData.description}</dd>
                      </div>
                    )}
                    <div className="flex justify-between mt-1">
                      <dt className="text-gray-500">Date Range:</dt>
                      <dd className="font-medium">{formData.startDate} to {formData.endDate}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Nutritional Targets</h4>
                  <dl className="mt-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Daily Calories:</dt>
                      <dd className="font-medium">{formData.dailyCalories}</dd>
                    </div>
                    <div className="flex justify-between mt-1">
                      <dt className="text-gray-500">Protein:</dt>
                      <dd className="font-medium">{formData.macroRatios?.protein}%</dd>
                    </div>
                    <div className="flex justify-between mt-1">
                      <dt className="text-gray-500">Carbs:</dt>
                      <dd className="font-medium">{formData.macroRatios?.carbs}%</dd>
                    </div>
                    <div className="flex justify-between mt-1">
                      <dt className="text-gray-500">Fat:</dt>
                      <dd className="font-medium">{formData.macroRatios?.fat}%</dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              {(formData.dietaryRestrictions?.length || 0) > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Dietary Restrictions</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.dietaryRestrictions?.map(restriction => (
                      <span key={restriction} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {restriction}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {errors.submit && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>{errors.submit}</p>
              </div>
            )}
          </div>
        );
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Progress bar */}
      <div className="bg-gray-100 px-4 py-2">
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-blue-700">
            Step {currentStep === 'basics' ? '1' : currentStep === 'macros' ? '2' : currentStep === 'dietary' ? '3' : '4'} of 4
          </span>
          <span className="text-xs font-medium text-blue-700">
            {currentStep === 'basics' ? '25%' : currentStep === 'macros' ? '50%' : currentStep === 'dietary' ? '75%' : '100%'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ 
              width: currentStep === 'basics' ? '25%' : 
                     currentStep === 'macros' ? '50%' : 
                     currentStep === 'dietary' ? '75%' : '100%' 
            }}
          />
        </div>
      </div>
      
      {/* Form content */}
      <div className="p-6">
        {renderStep()}
        
        {/* Navigation buttons */}
        <div className="mt-8 flex justify-between">
          <div>
            {currentStep !== 'basics' && (
              <button
                type="button"
                onClick={handlePreviousStep}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleNextStep}
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : currentStep === 'review' ? 'Create Plan' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 