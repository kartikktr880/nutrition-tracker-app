export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  notes?: string;
  tags?: string[];
}

export interface Checklist {
  id: string;
  title: string;
  description?: string;
  items: ChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  category?: string;
  tags?: string[];
  color?: string;
}

export interface ChecklistFormData {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  color?: string;
}

export interface ChecklistItemFormData {
  text: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  notes?: string;
  tags?: string[];
}

export interface ChecklistFilters {
  search: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  status: 'all' | 'completed' | 'pending';
  tags?: string[];
}

export interface ChecklistStats {
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  completionRate: number;
  averagePriority: 'low' | 'medium' | 'high';
  categories: Record<string, number>;
  tags: Record<string, number>;
}

export interface ChecklistContextType {
  checklists: Checklist[];
  currentChecklist: Checklist | null;
  stats: ChecklistStats;
  filters: ChecklistFilters;
  isLoading: boolean;
  error: string | null;
  createChecklist: (data: ChecklistFormData) => Promise<void>;
  updateChecklist: (id: string, data: Partial<ChecklistFormData>) => Promise<void>;
  deleteChecklist: (id: string) => Promise<void>;
  archiveChecklist: (id: string) => Promise<void>;
  addItem: (checklistId: string, data: ChecklistItemFormData) => Promise<void>;
  updateItem: (checklistId: string, itemId: string, data: Partial<ChecklistItemFormData>) => Promise<void>;
  deleteItem: (checklistId: string, itemId: string) => Promise<void>;
  toggleItem: (checklistId: string, itemId: string) => Promise<void>;
  setFilters: (filters: Partial<ChecklistFilters>) => void;
  clearFilters: () => void;
  selectChecklist: (id: string | null) => void;
} 