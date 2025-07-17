import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  units: 'metric' | 'imperial';
  notifications: boolean;
  privacySettings: {
    shareData: boolean;
    publicProfile: boolean;
  };
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface FoodEntry {
  id: string;
  name: string;
  nutrition: Nutrition;
  servingSize: number;
  servingUnit: string;
  timestamp: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  barcode?: string;
  brand?: string;
}

export interface WaterEntry {
  id: string;
  amount: number;
  timestamp: Date;
}

export interface Goal {
  id: string;
  type: 'calories' | 'protein' | 'carbs' | 'fat' | 'water' | 'weight';
  target: number;
  current: number;
  unit: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  category: 'nutrition' | 'water' | 'streak' | 'goal' | 'social';
}

export interface Notification {
  id: string;
  type: 'reminder' | 'achievement' | 'goal' | 'system';
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export interface SearchHistory {
  query: string;
  timestamp: Date;
  resultCount: number;
}

export interface AppSettings {
  onboardingCompleted: boolean;
  lastSync: Date;
  dataExportFormat: 'csv' | 'json' | 'pdf';
  autoBackup: boolean;
  analyticsEnabled: boolean;
}

// State interface
interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // Data state
  foodEntries: FoodEntry[];
  waterEntries: WaterEntry[];
  goals: Goal[];
  achievements: Achievement[];
  notifications: Notification[];
  searchHistory: SearchHistory[];
  
  // UI state
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  loadingStates: Record<string, boolean>;
  errorStates: Record<string, string | null>;
  
  // Settings
  settings: AppSettings;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  
  // Food entries
  addFoodEntry: (entry: Omit<FoodEntry, 'id'>) => void;
  updateFoodEntry: (id: string, updates: Partial<FoodEntry>) => void;
  removeFoodEntry: (id: string) => void;
  getFoodEntriesByDate: (date: Date) => FoodEntry[];
  getFoodEntriesByMealType: (mealType: FoodEntry['mealType']) => FoodEntry[];
  
  // Water entries
  addWaterEntry: (entry: Omit<WaterEntry, 'id'>) => void;
  removeWaterEntry: (id: string) => void;
  getWaterEntriesByDate: (date: Date) => WaterEntry[];
  getTodayWaterTotal: () => number;
  
  // Goals
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  getActiveGoals: () => Goal[];
  getGoalByType: (type: Goal['type']) => Goal | undefined;
  
  // Achievements
  unlockAchievement: (achievement: Omit<Achievement, 'id' | 'unlockedAt'>) => void;
  getUnlockedAchievements: () => Achievement[];
  getAchievementsByCategory: (category: Achievement['category']) => Achievement[];
  
  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  getUnreadNotifications: () => Notification[];
  clearAllNotifications: () => void;
  
        // Search history
      addSearchHistory: (query: string, resultCount: number) => void;
      addRecentSearch: (query: string) => void;
      clearSearchHistory: () => void;
      getRecentSearches: (limit?: number) => SearchHistory[];
  
  // UI actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearError: (key: string) => void;
  
  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;
  completeOnboarding: () => void;
  
  // Data management
  exportData: (format: AppSettings['dataExportFormat']) => Promise<string>;
  importData: (data: string) => Promise<void>;
  clearAllData: () => void;
  
  // Analytics
  trackEvent: (event: string, properties?: Record<string, unknown>) => void;
  trackPageView: (page: string) => void;
}

// Create store
export const useAppStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      foodEntries: [],
      waterEntries: [],
      goals: [],
      achievements: [],
      notifications: [],
      searchHistory: [],
      theme: 'system',
      sidebarOpen: false,
      loadingStates: {},
      errorStates: {},
      settings: {
        onboardingCompleted: false,
        lastSync: new Date(),
        dataExportFormat: 'json',
        autoBackup: true,
        analyticsEnabled: true,
      },

      // User actions
      setUser: (user) => set((state) => {
        state.user = user;
        state.isAuthenticated = !!user;
      }),

      setAuthenticated: (isAuthenticated) => set((state) => {
        state.isAuthenticated = isAuthenticated;
      }),

      // Food entries
      addFoodEntry: (entry) => set((state) => {
        const newEntry: FoodEntry = {
          ...entry,
          id: crypto.randomUUID(),
        };
        state.foodEntries.push(newEntry);
        state.foodEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      }),

      updateFoodEntry: (id, updates) => set((state) => {
        const index = state.foodEntries.findIndex(entry => entry.id === id);
        if (index !== -1) {
          Object.assign(state.foodEntries[index], updates);
        }
      }),

      removeFoodEntry: (id) => set((state) => {
        state.foodEntries = state.foodEntries.filter(entry => entry.id !== id);
      }),

      getFoodEntriesByDate: (date) => {
        const state = get();
        const dateString = date.toDateString();
        return state.foodEntries.filter(entry => 
          entry.timestamp.toDateString() === dateString
        );
      },

      getFoodEntriesByMealType: (mealType) => {
        const state = get();
        return state.foodEntries.filter(entry => entry.mealType === mealType);
      },

      // Water entries
      addWaterEntry: (entry) => set((state) => {
        const newEntry: WaterEntry = {
          ...entry,
          id: crypto.randomUUID(),
        };
        state.waterEntries.push(newEntry);
        state.waterEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      }),

      removeWaterEntry: (id) => set((state) => {
        state.waterEntries = state.waterEntries.filter(entry => entry.id !== id);
      }),

      getWaterEntriesByDate: (date) => {
        const state = get();
        const dateString = date.toDateString();
        return state.waterEntries.filter(entry => 
          entry.timestamp.toDateString() === dateString
        );
      },

      getTodayWaterTotal: () => {
        const state = get();
        const today = new Date().toDateString();
        return state.waterEntries
          .filter(entry => entry.timestamp.toDateString() === today)
          .reduce((total, entry) => total + entry.amount, 0);
      },

      // Goals
      addGoal: (goal) => set((state) => {
        const newGoal: Goal = {
          ...goal,
          id: crypto.randomUUID(),
        };
        state.goals.push(newGoal);
      }),

      updateGoal: (id, updates) => set((state) => {
        const index = state.goals.findIndex(goal => goal.id === id);
        if (index !== -1) {
          Object.assign(state.goals[index], updates);
        }
      }),

      removeGoal: (id) => set((state) => {
        state.goals = state.goals.filter(goal => goal.id !== id);
      }),

      getActiveGoals: () => {
        const state = get();
        return state.goals.filter(goal => goal.isActive);
      },

      getGoalByType: (type) => {
        const state = get();
        return state.goals.find(goal => goal.type === type && goal.isActive);
      },

      // Achievements
      unlockAchievement: (achievement) => set((state) => {
        const newAchievement: Achievement = {
          ...achievement,
          id: crypto.randomUUID(),
          unlockedAt: new Date(),
        };
        state.achievements.push(newAchievement);
        
        // Add notification
        get().addNotification({
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: achievement.description,
          read: false,
          data: { achievementId: newAchievement.id },
        });
      }),

      getUnlockedAchievements: () => {
        const state = get();
        return state.achievements.sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime());
      },

      getAchievementsByCategory: (category) => {
        const state = get();
        return state.achievements.filter(achievement => achievement.category === category);
      },

      // Notifications
      addNotification: (notification) => set((state) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        };
        state.notifications.unshift(newNotification);
        
        // Keep only last 50 notifications
        if (state.notifications.length > 50) {
          state.notifications = state.notifications.slice(0, 50);
        }
      }),

      markNotificationRead: (id) => set((state) => {
        const notification = state.notifications.find(n => n.id === id);
        if (notification) {
          notification.read = true;
        }
      }),

      removeNotification: (id) => set((state) => {
        state.notifications = state.notifications.filter(n => n.id !== id);
      }),

      getUnreadNotifications: () => {
        const state = get();
        return state.notifications.filter(n => !n.read);
      },

      clearAllNotifications: () => set((state) => {
        state.notifications = [];
      }),

      // Search history
      addSearchHistory: (query, resultCount) => set((state) => {
        const searchEntry: SearchHistory = {
          query,
          timestamp: new Date(),
          resultCount,
        };
        state.searchHistory.unshift(searchEntry);
        
        // Keep only last 20 searches
        if (state.searchHistory.length > 20) {
          state.searchHistory = state.searchHistory.slice(0, 20);
        }
      }),

      addRecentSearch: (query) => set((state) => {
        const searchEntry: SearchHistory = {
          query,
          timestamp: new Date(),
          resultCount: 0,
        };
        state.searchHistory.unshift(searchEntry);
        
        // Keep only last 20 searches
        if (state.searchHistory.length > 20) {
          state.searchHistory = state.searchHistory.slice(0, 20);
        }
      }),

      clearSearchHistory: () => set((state) => {
        state.searchHistory = [];
      }),

      getRecentSearches: (limit = 10) => {
        const state = get();
        return state.searchHistory.slice(0, limit);
      },

      // UI actions
      setTheme: (theme) => set((state) => {
        state.theme = theme;
      }),

      toggleSidebar: () => set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      }),

      setSidebarOpen: (open) => set((state) => {
        state.sidebarOpen = open;
      }),

      setLoading: (key, loading) => set((state) => {
        state.loadingStates[key] = loading;
      }),

      setError: (key, error) => set((state) => {
        state.errorStates[key] = error;
      }),

      clearError: (key) => set((state) => {
        state.errorStates[key] = null;
      }),

      // Settings
      updateSettings: (updates) => set((state) => {
        Object.assign(state.settings, updates);
      }),

      completeOnboarding: () => set((state) => {
        state.settings.onboardingCompleted = true;
      }),

      // Data management
      exportData: async (format) => {
        const state = get();
        const data = {
          user: state.user,
          foodEntries: state.foodEntries,
          waterEntries: state.waterEntries,
          goals: state.goals,
          achievements: state.achievements,
          settings: state.settings,
          exportDate: new Date().toISOString(),
        };

        switch (format) {
          case 'json':
            return JSON.stringify(data, null, 2);
          case 'csv':
            // Convert to CSV format
            const csvData = [
              ['Type', 'Name', 'Calories', 'Protein', 'Carbs', 'Fat', 'Date'],
              ...state.foodEntries.map(entry => [
                'Food',
                entry.name,
                entry.nutrition.calories,
                entry.nutrition.protein,
                entry.nutrition.carbs,
                entry.nutrition.fat,
                entry.timestamp.toISOString(),
              ]),
              ...state.waterEntries.map(entry => [
                'Water',
                `${entry.amount}ml`,
                '',
                '',
                '',
                '',
                entry.timestamp.toISOString(),
              ]),
            ];
            return csvData.map(row => row.join(',')).join('\n');
          default:
            return JSON.stringify(data, null, 2);
        }
      },

      importData: async (data) => {
        try {
          const importedData = JSON.parse(data);
          set((state) => {
            if (importedData.foodEntries) state.foodEntries = importedData.foodEntries;
            if (importedData.waterEntries) state.waterEntries = importedData.waterEntries;
            if (importedData.goals) state.goals = importedData.goals;
            if (importedData.achievements) state.achievements = importedData.achievements;
            if (importedData.settings) state.settings = importedData.settings;
          });
        } catch (error) {
          throw new Error('Invalid data format');
        }
      },

      clearAllData: () => set((state) => {
        state.foodEntries = [];
        state.waterEntries = [];
        state.goals = [];
        state.achievements = [];
        state.notifications = [];
        state.searchHistory = [];
      }),

      // Analytics
      trackEvent: (event, properties = {}) => {
        const state = get();
        if (state.settings.analyticsEnabled) {
          // In a real app, this would send to analytics service
          // Analytics Event logged
        }
      },

      trackPageView: (page) => {
        const state = get();
        if (state.settings.analyticsEnabled) {
          // In a real app, this would send to analytics service
          // Page View logged
        }
      },
    })),
    {
      name: 'nutrition-tracker-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        foodEntries: state.foodEntries,
        waterEntries: state.waterEntries,
        goals: state.goals,
        achievements: state.achievements,
        notifications: state.notifications,
        searchHistory: state.searchHistory,
        theme: state.theme,
        settings: state.settings,
      }),
    }
  )
);

// Selector hooks for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useFoodEntries = () => useAppStore((state) => state.foodEntries);
export const useWaterEntries = () => useAppStore((state) => state.waterEntries);
export const useGoals = () => useAppStore((state) => state.goals);
export const useAchievements = () => useAppStore((state) => state.achievements);
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useSearchHistory = () => useAppStore((state) => state.searchHistory);
export const useTheme = () => useAppStore((state) => state.theme);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useSettings = () => useAppStore((state) => state.settings);
export const useLoadingState = (key: string) => useAppStore((state) => state.loadingStates[key]);
export const useErrorState = (key: string) => useAppStore((state) => state.errorStates[key]); 