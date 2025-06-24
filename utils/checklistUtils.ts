import { ChecklistItem, Checklist, ChecklistStats } from '../types/checklist';

// Format date for display
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Format relative time
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return formatDate(date);
};

// Get priority color
export const getPriorityColor = (priority: 'low' | 'medium' | 'high'): string => {
  switch (priority) {
    case 'low':
      return 'text-green-600 bg-green-100';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'high':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

// Get priority icon
export const getPriorityIcon = (priority: 'low' | 'medium' | 'high'): string => {
  switch (priority) {
    case 'low':
      return '⬇️';
    case 'medium':
      return '➡️';
    case 'high':
      return '⬆️';
    default:
      return '•';
  }
};

// Calculate completion percentage
export const calculateCompletionPercentage = (items: ChecklistItem[]): number => {
  if (items.length === 0) return 0;
  const completedCount = items.filter(item => item.completed).length;
  return Math.round((completedCount / items.length) * 100);
};

// Sort items by priority and completion status
export const sortItems = (items: ChecklistItem[]): ChecklistItem[] => {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  
  return [...items].sort((a, b) => {
    // First sort by completion status (pending first)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    // Then sort by priority (high first)
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Finally sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

// Filter items based on search term
export const filterItemsBySearch = (items: ChecklistItem[], search: string): ChecklistItem[] => {
  if (!search.trim()) return items;
  
  const searchLower = search.toLowerCase();
  return items.filter(item => 
    item.text.toLowerCase().includes(searchLower) ||
    item.notes?.toLowerCase().includes(searchLower) ||
    item.category?.toLowerCase().includes(searchLower) ||
    item.tags?.some(tag => tag.toLowerCase().includes(searchLower))
  );
};

// Get unique categories from items
export const getUniqueCategories = (items: ChecklistItem[]): string[] => {
  const categories = items
    .map(item => item.category)
    .filter((category): category is string => !!category);
  
  return [...new Set(categories)].sort();
};

// Get unique tags from items
export const getUniqueTags = (items: ChecklistItem[]): string[] => {
  const tags = items
    .flatMap(item => item.tags || [])
    .filter(tag => !!tag);
  
  return [...new Set(tags)].sort();
};

// Validate checklist data
export const validateChecklistData = (data: { title: string; description?: string }): string[] => {
  const errors: string[] = [];
  
  if (!data.title.trim()) {
    errors.push('Title is required');
  }
  
  if (data.title.length > 100) {
    errors.push('Title must be less than 100 characters');
  }
  
  if (data.description && data.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }
  
  return errors;
};

// Validate checklist item data
export const validateChecklistItemData = (data: { text: string; priority: string }): string[] => {
  const errors: string[] = [];
  
  if (!data.text.trim()) {
    errors.push('Item text is required');
  }
  
  if (data.text.length > 200) {
    errors.push('Item text must be less than 200 characters');
  }
  
  if (!['low', 'medium', 'high'].includes(data.priority)) {
    errors.push('Invalid priority level');
  }
  
  return errors;
};

// Generate checklist statistics
export const generateStats = (checklists: Checklist[]): ChecklistStats => {
  const allItems = checklists
    .filter(checklist => !checklist.isArchived)
    .flatMap(checklist => checklist.items);
  
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
};

// Debounce function for search
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Generate random color for checklist
export const generateRandomColor = (): string => {
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
    'bg-gray-100 text-gray-800'
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
};

// Check if item is overdue (for items with due dates)
export const isItemOverdue = (item: ChecklistItem): boolean => {
  // This would be implemented if we add due dates to items
  return false;
};

// Get item status text
export const getItemStatusText = (item: ChecklistItem): string => {
  if (item.completed) {
    return `Completed ${formatRelativeTime(item.completedAt!)}`;
  }
  
  return `Created ${formatRelativeTime(item.createdAt)}`;
};

// Truncate text for display
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Format file size for export
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 