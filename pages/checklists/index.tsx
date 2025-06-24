import { NextPage } from 'next';
import Head from 'next/head';
import React, { useState } from 'react';
import { ChecklistProvider } from '../../providers/ChecklistProvider';
import { Checklist } from '../../components/Checklist';
import { useChecklist } from '../../providers/ChecklistProvider';
import { ChecklistFormData } from '../../types/checklist';

// Create a wrapper component to use the checklist context
const ChecklistPageContent: React.FC = () => {
  const {
    checklists,
    createChecklist,
    isLoading,
    error
  } = useChecklist();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<ChecklistFormData>({
    title: '',
    description: '',
    category: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createChecklist(formData);
      setFormData({ title: '', description: '', category: '', tags: [] });
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create checklist:', err);
    }
  };

  // Handle tag input
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error</div>
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Checklists</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {showCreateForm ? 'Cancel' : 'Create New Checklist'}
          </button>
        </div>

        {/* Create checklist form */}
        {showCreateForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="space-y-4">
              {/* Title input */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Description input */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Category input */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  id="category"
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Tags input */}
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (press Enter to add)
                </label>
                <input
                  type="text"
                  id="tags"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Create Checklist
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Display checklists */}
      <div className="space-y-6">
        {checklists.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No checklists yet</h3>
            <p className="text-gray-500">Create your first checklist to get started!</p>
          </div>
        ) : (
          checklists.map(checklist => (
            <Checklist
              key={checklist.id}
              checklistId={checklist.id}
              className="transition-shadow hover:shadow-md"
            />
          ))
        )}
      </div>
    </div>
  );
};

const ChecklistsPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Checklists | Nutrition Tracker</title>
        <meta name="description" content="Manage your nutrition checklists and track your progress" />
      </Head>
      <ChecklistProvider>
        <ChecklistPageContent />
      </ChecklistProvider>
    </>
  );
};

export default ChecklistsPage; 