import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

import { checklistService } from '../services/checklistService';
import { 
  Checklist, 
  ChecklistItem, 
  ChecklistFormData, 
  ChecklistItemFormData, 
  ChecklistFilters,
  ChecklistStats,
  ChecklistContextType 
} from '../types/checklist';

const ChecklistContext = createContext<ChecklistContextType | undefined>(undefined);

interface ChecklistProviderProps {
  children: ReactNode;
}

export const ChecklistProvider: React.FC<ChecklistProviderProps> = ({ children }) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [currentChecklist, setCurrentChecklist] = useState<Checklist | null>(null);
  const [stats, setStats] = useState<ChecklistStats>({
    totalItems: 0,
    completedItems: 0,
    pendingItems: 0,
    completionRate: 0,
    averagePriority: 'low',
    categories: {},
    tags: {}
  });
  const [filters, setFilters] = useState<ChecklistFilters>({
    search: '',
    status: 'all'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load checklists and stats
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [checklistsData, statsData] = await Promise.all([
        checklistService.getChecklists(),
        checklistService.getStats()
      ]);
      
      setChecklists(checklistsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklists');
      // logError('Error loading checklists:', err); // Removed logger import
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to service changes
  useEffect(() => {
    const unsubscribe = checklistService.subscribe(loadData);
    loadData();
    return unsubscribe;
  }, [loadData]);

  // Create checklist
  const createChecklist = useCallback(async (data: ChecklistFormData) => {
    try {
      setError(null);
      await checklistService.createChecklist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checklist');
      throw err;
    }
  }, []);

  // Update checklist
  const updateChecklist = useCallback(async (id: string, data: Partial<ChecklistFormData>) => {
    try {
      setError(null);
      await checklistService.updateChecklist(id, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update checklist');
      throw err;
    }
  }, []);

  // Delete checklist
  const deleteChecklist = useCallback(async (id: string) => {
    try {
      setError(null);
      await checklistService.deleteChecklist(id);
      if (currentChecklist?.id === id) {
        setCurrentChecklist(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete checklist');
      throw err;
    }
  }, [currentChecklist?.id]);

  // Archive checklist
  const archiveChecklist = useCallback(async (id: string) => {
    try {
      setError(null);
      await checklistService.archiveChecklist(id);
      if (currentChecklist?.id === id) {
        setCurrentChecklist(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive checklist');
      throw err;
    }
  }, [currentChecklist?.id]);

  // Add item
  const addItem = useCallback(async (checklistId: string, data: ChecklistItemFormData) => {
    try {
      setError(null);
      await checklistService.addItem(checklistId, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
      throw err;
    }
  }, []);

  // Update item
  const updateItem = useCallback(async (checklistId: string, itemId: string, data: Partial<ChecklistItemFormData>) => {
    try {
      setError(null);
      await checklistService.updateItem(checklistId, itemId, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
      throw err;
    }
  }, []);

  // Delete item
  const deleteItem = useCallback(async (checklistId: string, itemId: string) => {
    try {
      setError(null);
      await checklistService.deleteItem(checklistId, itemId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      throw err;
    }
  }, []);

  // Toggle item
  const toggleItem = useCallback(async (checklistId: string, itemId: string) => {
    try {
      setError(null);
      await checklistService.toggleItem(checklistId, itemId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle item');
      throw err;
    }
  }, []);

  // Set filters
  const setFiltersHandler = useCallback((newFilters: Partial<ChecklistFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all'
    });
  }, []);

  // Select checklist
  const selectChecklist = useCallback((id: string | null) => {
    if (id === null) {
      setCurrentChecklist(null);
    } else {
      const checklist = checklists.find(c => c.id === id);
      setCurrentChecklist(checklist || null);
    }
  }, [checklists]);

  const value: ChecklistContextType = {
    checklists,
    currentChecklist,
    stats,
    filters,
    isLoading,
    error,
    createChecklist,
    updateChecklist,
    deleteChecklist,
    archiveChecklist,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
    setFilters: setFiltersHandler,
    clearFilters,
    selectChecklist
  };

  return (
    <ChecklistContext.Provider value={value}>
      {children}
    </ChecklistContext.Provider>
  );
};

// Custom hook to use checklist context
export const useChecklist = (): ChecklistContextType => {
  const context = useContext(ChecklistContext);
  if (context === undefined) {
    throw new Error('useChecklist must be used within a ChecklistProvider');
  }
  return context;
}; 