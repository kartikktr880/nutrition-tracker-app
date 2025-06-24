import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useExerciseForm } from '@/lib/hooks/useExerciseForm';
import { ExerciseFormTemplate } from '@/types/exercise';

export function ExerciseFormTemplates() {
  const [templates, setTemplates] = useState<ExerciseFormTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ExerciseFormTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<ExerciseFormTemplate>>({
    name: '',
    description: '',
    checklist: [],
    tips: [],
    commonMistakes: [],
  });

  const {
    loading,
    error,
    getFormTemplates,
    createFormTemplate,
  } = useExerciseForm();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const fetchedTemplates = await getFormTemplates();
    setTemplates(fetchedTemplates);
  };

  const handleCreateTemplate = async () => {
    const template = await createFormTemplate(newTemplate);
    if (template) {
      setTemplates([...templates, template]);
      setIsCreating(false);
      setNewTemplate({
        name: '',
        description: '',
        checklist: [],
        tips: [],
        commonMistakes: [],
      });
    }
  };

  const addChecklistItem = () => {
    setNewTemplate(prev => ({
      ...prev,
      checklist: [...(prev.checklist || []), { description: '', importance: 'medium' }],
    }));
  };

  const addTip = () => {
    setNewTemplate(prev => ({
      ...prev,
      tips: [...(prev.tips || []), ''],
    }));
  };

  const addMistake = () => {
    setNewTemplate(prev => ({
      ...prev,
      commonMistakes: [...(prev.commonMistakes || []), ''],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Exercise Form Templates</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {isCreating ? 'Cancel' : 'Create Template'}
        </button>
      </div>

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-md space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={newTemplate.description}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Checklist Items</label>
            <div className="space-y-2">
              {newTemplate.checklist?.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const newChecklist = [...(newTemplate.checklist || [])];
                      newChecklist[index] = { ...item, description: e.target.value };
                      setNewTemplate(prev => ({ ...prev, checklist: newChecklist }));
                    }}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                    placeholder="Checklist item description"
                  />
                  <select
                    value={item.importance}
                    onChange={(e) => {
                      const newChecklist = [...(newTemplate.checklist || [])];
                      newChecklist[index] = { ...item, importance: e.target.value };
                      setNewTemplate(prev => ({ ...prev, checklist: newChecklist }));
                    }}
                    className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              ))}
              <button
                onClick={addChecklistItem}
                className="text-sm text-primary hover:text-primary-dark"
              >
                + Add Checklist Item
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tips</label>
            <div className="space-y-2">
              {newTemplate.tips?.map((tip, index) => (
                <input
                  key={index}
                  type="text"
                  value={tip}
                  onChange={(e) => {
                    const newTips = [...(newTemplate.tips || [])];
                    newTips[index] = e.target.value;
                    setNewTemplate(prev => ({ ...prev, tips: newTips }));
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  placeholder="Enter a tip"
                />
              ))}
              <button
                onClick={addTip}
                className="text-sm text-primary hover:text-primary-dark"
              >
                + Add Tip
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Common Mistakes</label>
            <div className="space-y-2">
              {newTemplate.commonMistakes?.map((mistake, index) => (
                <input
                  key={index}
                  type="text"
                  value={mistake}
                  onChange={(e) => {
                    const newMistakes = [...(newTemplate.commonMistakes || [])];
                    newMistakes[index] = e.target.value;
                    setNewTemplate(prev => ({ ...prev, commonMistakes: newMistakes }));
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  placeholder="Enter a common mistake"
                />
              ))}
              <button
                onClick={addMistake}
                className="text-sm text-primary hover:text-primary-dark"
              >
                + Add Common Mistake
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreateTemplate}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Create Template
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-lg shadow-md space-y-4"
          >
            <h3 className="text-xl font-semibold">{template.name}</h3>
            <p className="text-gray-600">{template.description}</p>
            
            <div>
              <h4 className="font-medium text-gray-700">Checklist Items</h4>
              <ul className="mt-2 space-y-2">
                {template.checklist.map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.importance === 'high' ? 'bg-red-100 text-red-800' :
                      item.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.importance}
                    </span>
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>

            {template.tips.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700">Tips</h4>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {template.tips.map((tip, index) => (
                    <li key={index} className="text-gray-600">{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {template.commonMistakes.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700">Common Mistakes</h4>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {template.commonMistakes.map((mistake, index) => (
                    <li key={index} className="text-gray-600">{mistake}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
} 