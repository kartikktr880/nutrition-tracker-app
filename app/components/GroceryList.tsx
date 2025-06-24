import React, { useState, useEffect } from 'react';
import { barcodeService } from '../../lib/barcode-service';

interface GroceryListProps {
  onClose?: () => void;
}

const GroceryList: React.FC<GroceryListProps> = ({ onClose }) => {
  const [groceryList, setGroceryList] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'name' | 'category'>('priority');

  useEffect(() => {
    loadGroceryList();
  }, []);

  const loadGroceryList = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = barcodeService.generateSmartGroceryList();
      setGroceryList(list);
    } catch (err) {
      setError('Failed to load grocery list. Please try again.');
      console.error('Error loading grocery list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPurchased = async (barcode: string) => {
    try {
      barcodeService.markItemPurchased(barcode);
      await loadGroceryList();
    } catch (err) {
      setError('Failed to update item. Please try again.');
      console.error('Error marking item as purchased:', err);
    }
  };

  const handleRemoveItem = async (barcode: string) => {
    try {
      barcodeService.removeFromGroceryList(barcode);
      await loadGroceryList();
    } catch (err) {
      setError('Failed to remove item. Please try again.');
      console.error('Error removing item:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Produce': 'bg-green-100',
      'Dairy': 'bg-blue-100',
      'Meat': 'bg-red-100',
      'Bakery': 'bg-yellow-100',
      'Frozen': 'bg-purple-100',
      'Canned': 'bg-orange-100',
      'Snacks': 'bg-pink-100',
      'Beverages': 'bg-indigo-100',
      'Household': 'bg-gray-100',
      'Other': 'bg-gray-100'
    };
    return colors[category] || 'bg-gray-100';
  };

  const renderCategoryFilter = () => {
    if (!groceryList?.categories) return null;

    const categories = ['All', ...Object.keys(groceryList.categories)];
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedCategory === category
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    );
  };

  const renderSortControls = () => (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-gray-600">Sort by:</span>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as any)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="priority">Priority</option>
        <option value="name">Name</option>
        <option value="category">Category</option>
      </select>
    </div>
  );

  const renderGroceryList = () => {
    if (!groceryList?.items) return null;

    let filteredItems = [...groceryList.items];
    if (selectedCategory !== 'All') {
      filteredItems = filteredItems.filter(item => item.category === selectedCategory);
    }

    filteredItems.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priority.localeCompare(a.priority);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return (
      <div className="space-y-4">
        {filteredItems.map(item => (
          <div
            key={item.barcode}
            className={`p-4 rounded-lg shadow-sm ${getCategoryColor(item.category)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <div className="text-sm text-gray-600">
                  <span className={getPriorityColor(item.priority)}>
                    {item.priority} priority
                  </span>
                  {' • '}
                  <span>{item.category}</span>
                  {item.estimatedPrice && (
                    <>
                      {' • '}
                      <span>${item.estimatedPrice.toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMarkPurchased(item.barcode)}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Purchased
                </button>
                <button
                  onClick={() => handleRemoveItem(item.barcode)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSummary = () => {
    if (!groceryList) return null;

    return (
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="font-medium mb-2">Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Items:</span>
            <span className="ml-2 font-medium">{groceryList.items.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Estimated Cost:</span>
            <span className="ml-2 font-medium">
              ${groceryList.totalEstimatedCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <p>{error}</p>
        <button
          onClick={loadGroceryList}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Smart Grocery List</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        )}
      </div>

      {renderSummary()}
      {renderCategoryFilter()}
      {renderSortControls()}
      {renderGroceryList()}
    </div>
  );
};

export default GroceryList; 