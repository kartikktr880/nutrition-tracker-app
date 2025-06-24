import React, { useState, useEffect, useCallback } from 'react';
import { useChecklist } from '../providers/ChecklistProvider';
import { ChecklistItem, ChecklistItemFormData } from '../types/checklist';
import { 
  formatDate, 
  formatRelativeTime, 
  getPriorityColor, 
  getPriorityIcon,
  calculateCompletionPercentage,
  sortItems,
  filterItemsBySearch,
  validateChecklistItemData,
  truncateText
} from '../utils/checklistUtils';

interface ChecklistProps {
  checklistId: string;
  className?: string;
}

export const Checklist: React.FC<ChecklistProps> = ({ checklistId, className = '' }) => {
  const {
    checklists,
    currentChecklist,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
    selectChecklist,
    isLoading,
    error
  } = useChecklist();

  const [newItemText, setNewItemText] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'alphabetical'>('priority');

  // Find the current checklist
  const checklist = checklists.find(c => c.id === checklistId);

  // Select checklist on mount
  useEffect(() => {
    if (checklistId && !currentChecklist) {
      selectChecklist(checklistId);
    }
  }, [checklistId, currentChecklist, selectChecklist]);

  // Filter and sort items
  const filteredAndSortedItems = useCallback(() => {
    if (!checklist) return [];

    let items = [...checklist.items];

    // Filter by search term
    if (searchTerm.trim()) {
      items = filterItemsBySearch(items, searchTerm);
    }

    // Filter by completion status
    if (!showCompleted) {
      items = items.filter(item => !item.completed);
    }

    // Sort items
    switch (sortBy) {
      case 'priority':
        items = sortItems(items);
        break;
      case 'date':
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'alphabetical':
        items.sort((a, b) => a.text.localeCompare(b.text));
        break;
    }

    return items;
  }, [checklist, searchTerm, showCompleted, sortBy]);

  // Handle adding new item
  const handleAddItem = useCallback(async () => {
    if (!checklist || !newItemText.trim()) return;

    const errors = validateChecklistItemData({ text: newItemText, priority: newItemPriority });
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    try {
      const itemData: ChecklistItemFormData = {
        text: newItemText.trim(),
        priority: newItemPriority,
        category: checklist.category,
        tags: checklist.tags
      };

      await addItem(checklist.id, itemData);
      setNewItemText('');
      setNewItemPriority('medium');
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  }, [checklist, newItemText, newItemPriority, addItem]);

  // Handle toggling item completion
  const handleToggleItem = useCallback(async (itemId: string) => {
    if (!checklist) return;

    try {
      await toggleItem(checklist.id, itemId);
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  }, [checklist, toggleItem]);

  // Handle editing item
  const handleEditItem = useCallback(async (itemId: string) => {
    if (!checklist) return;

    try {
      await updateItem(checklist.id, itemId, { text: editingText.trim() });
      setEditingItemId(null);
      setEditingText('');
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  }, [checklist, editingText, updateItem]);

  // Handle deleting item
  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!checklist || !confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteItem(checklist.id, itemId);
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  }, [checklist, deleteItem]);

  // Start editing item
  const startEditing = useCallback((item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingText(item.text);
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingItemId(null);
    setEditingText('');
  }, []);

  // Handle key press for adding/editing items
  const handleKeyPress = useCallback((e: React.KeyboardEvent, action: 'add' | 'edit', itemId?: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (action === 'add') {
        handleAddItem();
      } else if (action === 'edit' && itemId) {
        handleEditItem(itemId);
      }
    } else if (e.key === 'Escape') {
      if (action === 'edit') {
        cancelEditing();
      }
    }
  }, [handleAddItem, handleEditItem, cancelEditing]);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 h-8 rounded mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 h-6 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="text-red-800 font-medium">Error</div>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="text-gray-600">Checklist not found</div>
      </div>
    );
  }

  const items = filteredAndSortedItems();
  const completionPercentage = calculateCompletionPercentage(checklist.items);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900">{checklist.title}</h2>
          <div className="text-sm text-gray-500">
            {checklist.items.length} items
          </div>
        </div>
        
        {checklist.description && (
          <p className="text-gray-600 text-sm mb-3">{checklist.description}</p>
        )}

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-0 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'priority' | 'date' | 'alphabetical')}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="priority">Sort by Priority</option>
            <option value="date">Sort by Date</option>
            <option value="alphabetical">Sort Alphabetically</option>
          </select>

          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              showCompleted 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showCompleted ? 'Hide' : 'Show'} Completed
          </button>
        </div>
      </div>

      {/* Add new item */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a new item..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, 'add')}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <select
            value={newItemPriority}
            onChange={(e) => setNewItemPriority(e.target.value as 'low' | 'medium' | 'high')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          
          <button
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="divide-y divide-gray-200">
        {items.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'No items match your search' : 'No items yet. Add your first item above!'}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`p-4 transition-colors ${
                item.completed ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggleItem(item.id)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                />

                {/* Item content */}
                <div className="flex-1 min-w-0">
                  {editingItemId === item.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'edit', item.id)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                      <button
                        onClick={() => handleEditItem(item.id)}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {truncateText(item.text, 200)}
                        </div>
                        
                        {/* Item metadata */}
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className={`px-2 py-0.5 rounded-full ${getPriorityColor(item.priority)}`}>
                            {getPriorityIcon(item.priority)} {item.priority}
                          </span>
                          
                          {item.category && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              {item.category}
                            </span>
                          )}
                          
                          <span>
                            {item.completed 
                              ? `Completed ${formatRelativeTime(item.completedAt!)}`
                              : `Created ${formatRelativeTime(item.createdAt)}`
                            }
                          </span>
                        </div>

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Notes */}
                        {item.notes && (
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {item.notes}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!item.completed && (
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => startEditing(item)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit item"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete item"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            {items.filter(item => item.completed).length} of {items.length} completed
          </span>
          <span>
            Last updated: {checklist.updatedAt ? formatDate(checklist.updatedAt) : 'Never'}
          </span>
        </div>
      </div>
    </div>
  );
}; 