import { 
  Checklist, 
  ChecklistItem, 
  ChecklistFormData, 
  ChecklistItemFormData, 
  ChecklistFilters,
  ChecklistStats 
} from '../types/checklist';

class ChecklistService {
  private storageKey = 'nutrition-tracker-checklists';
  private listeners: Set<() => void> = new Set();

  // Get all checklists from localStorage
  private getChecklistsSync(): Checklist[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const checklists = JSON.parse(stored);
      return checklists.map((checklist: any) => ({
        ...checklist,
        createdAt: new Date(checklist.createdAt),
        updatedAt: new Date(checklist.updatedAt),
        items: checklist.items.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          completedAt: item.completedAt ? new Date(item.completedAt) : undefined
        }))
      }));
    } catch (error) {
      console.error('Error loading checklists:', error);
      return [];
    }
  }

  // Save checklists to localStorage
  private saveChecklists(checklists: Checklist[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(checklists));
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving checklists:', error);
      throw new Error('Failed to save checklists');
    }
  }

  // Notify listeners of changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get all checklists
  async getChecklists(): Promise<Checklist[]> {
    return Promise.resolve(this.getChecklistsSync());
  }

  // Get checklist by ID
  async getChecklist(id: string): Promise<Checklist | null> {
    const checklists = this.getChecklistsSync();
    return checklists.find(checklist => checklist.id === id) || null;
  }

  // Create new checklist
  async createChecklist(data: ChecklistFormData): Promise<Checklist> {
    const checklists = this.getChecklistsSync();
    const newChecklist: Checklist = {
      id: this.generateId(),
      title: data.title,
      description: data.description,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      category: data.category,
      tags: data.tags || [],
      color: data.color
    };

    checklists.push(newChecklist);
    this.saveChecklists(checklists);
    return newChecklist;
  }

  // Update checklist
  async updateChecklist(id: string, data: Partial<ChecklistFormData>): Promise<Checklist> {
    const checklists = this.getChecklistsSync();
    const index = checklists.findIndex(checklist => checklist.id === id);
    
    if (index === -1) {
      throw new Error('Checklist not found');
    }

    checklists[index] = {
      ...checklists[index],
      ...data,
      updatedAt: new Date()
    };

    this.saveChecklists(checklists);
    return checklists[index];
  }

  // Delete checklist
  async deleteChecklist(id: string): Promise<void> {
    const checklists = this.getChecklistsSync();
    const filtered = checklists.filter(checklist => checklist.id !== id);
    this.saveChecklists(filtered);
  }

  // Archive checklist
  async archiveChecklist(id: string): Promise<void> {
    const checklists = this.getChecklistsSync();
    const index = checklists.findIndex(checklist => checklist.id === id);
    
    if (index === -1) {
      throw new Error('Checklist not found');
    }

    checklists[index].isArchived = true;
    checklists[index].updatedAt = new Date();
    this.saveChecklists(checklists);
  }

  // Add item to checklist
  async addItem(checklistId: string, data: ChecklistItemFormData): Promise<ChecklistItem> {
    const checklists = this.getChecklistsSync();
    const checklistIndex = checklists.findIndex(checklist => checklist.id === checklistId);
    
    if (checklistIndex === -1) {
      throw new Error('Checklist not found');
    }

    const newItem: ChecklistItem = {
      id: this.generateId(),
      text: data.text,
      completed: false,
      createdAt: new Date(),
      priority: data.priority,
      category: data.category,
      notes: data.notes,
      tags: data.tags || []
    };

    checklists[checklistIndex].items.push(newItem);
    checklists[checklistIndex].updatedAt = new Date();
    this.saveChecklists(checklists);
    
    return newItem;
  }

  // Update checklist item
  async updateItem(checklistId: string, itemId: string, data: Partial<ChecklistItemFormData>): Promise<ChecklistItem> {
    const checklists = this.getChecklistsSync();
    const checklistIndex = checklists.findIndex(checklist => checklist.id === checklistId);
    
    if (checklistIndex === -1) {
      throw new Error('Checklist not found');
    }

    const itemIndex = checklists[checklistIndex].items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }

    checklists[checklistIndex].items[itemIndex] = {
      ...checklists[checklistIndex].items[itemIndex],
      ...data
    };

    checklists[checklistIndex].updatedAt = new Date();
    this.saveChecklists(checklists);
    
    return checklists[checklistIndex].items[itemIndex];
  }

  // Delete checklist item
  async deleteItem(checklistId: string, itemId: string): Promise<void> {
    const checklists = this.getChecklistsSync();
    const checklistIndex = checklists.findIndex(checklist => checklist.id === checklistId);
    
    if (checklistIndex === -1) {
      throw new Error('Checklist not found');
    }

    checklists[checklistIndex].items = checklists[checklistIndex].items.filter(item => item.id !== itemId);
    checklists[checklistIndex].updatedAt = new Date();
    this.saveChecklists(checklists);
  }

  // Toggle item completion
  async toggleItem(checklistId: string, itemId: string): Promise<ChecklistItem> {
    const checklists = this.getChecklistsSync();
    const checklistIndex = checklists.findIndex(checklist => checklist.id === checklistId);
    
    if (checklistIndex === -1) {
      throw new Error('Checklist not found');
    }

    const itemIndex = checklists[checklistIndex].items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }

    const item = checklists[checklistIndex].items[itemIndex];
    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date() : undefined;

    checklists[checklistIndex].updatedAt = new Date();
    this.saveChecklists(checklists);
    
    return item;
  }

  // Filter checklists
  async filterChecklists(filters: ChecklistFilters): Promise<Checklist[]> {
    let checklists = this.getChecklistsSync().filter(checklist => !checklist.isArchived);

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      checklists = checklists.filter(checklist => 
        checklist.title.toLowerCase().includes(searchLower) ||
        checklist.description?.toLowerCase().includes(searchLower) ||
        checklist.items.some(item => item.text.toLowerCase().includes(searchLower))
      );
    }

    // Category filter
    if (filters.category) {
      checklists = checklists.filter(checklist => 
        checklist.category === filters.category ||
        checklist.items.some(item => item.category === filters.category)
      );
    }

    // Priority filter
    if (filters.priority) {
      checklists = checklists.filter(checklist => 
        checklist.items.some(item => item.priority === filters.priority)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      checklists = checklists.filter(checklist => {
        const hasCompleted = checklist.items.some(item => item.completed);
        const hasPending = checklist.items.some(item => !item.completed);
        
        if (filters.status === 'completed') return hasCompleted && !hasPending;
        if (filters.status === 'pending') return hasPending;
        return true;
      });
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      checklists = checklists.filter(checklist => 
        filters.tags!.some(tag => 
          checklist.tags?.includes(tag) ||
          checklist.items.some(item => item.tags?.includes(tag))
        )
      );
    }

    return checklists;
  }

  // Calculate statistics
  async getStats(): Promise<ChecklistStats> {
    const checklists = this.getChecklistsSync();
    const allItems = checklists.flatMap(checklist => checklist.items);
    
    const totalItems = allItems.length;
    const completedItems = allItems.filter(item => item.completed).length;
    const pendingItems = totalItems - completedItems;
    const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    // Calculate average priority
    const priorityScores = { low: 1, medium: 2, high: 3 };
    const totalPriorityScore = allItems.reduce((sum, item) => sum + priorityScores[item.priority], 0);
    const averagePriorityScore = totalItems > 0 ? totalPriorityScore / totalItems : 1;
    const averagePriority = averagePriorityScore <= 1.5 ? 'low' : averagePriorityScore <= 2.5 ? 'medium' : 'high';

    // Calculate categories
    const categories: Record<string, number> = {};
    allItems.forEach(item => {
      if (item.category) {
        categories[item.category] = (categories[item.category] || 0) + 1;
      }
    });

    // Calculate tags
    const tags: Record<string, number> = {};
    allItems.forEach(item => {
      item.tags?.forEach(tag => {
        tags[tag] = (tags[tag] || 0) + 1;
      });
    });

    return {
      totalItems,
      completedItems,
      pendingItems,
      completionRate,
      averagePriority,
      categories,
      tags
    };
  }

  // Export checklists
  async exportChecklists(): Promise<string> {
    const checklists = this.getChecklistsSync();
    return JSON.stringify(checklists, null, 2);
  }

  // Import checklists
  async importChecklists(data: string): Promise<void> {
    try {
      const checklists = JSON.parse(data);
      this.saveChecklists(checklists);
    } catch (error) {
      throw new Error('Invalid import data format');
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    localStorage.removeItem(this.storageKey);
    this.notifyListeners();
  }
}

export const checklistService = new ChecklistService(); 