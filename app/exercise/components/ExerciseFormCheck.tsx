import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useExerciseForm } from '@/lib/hooks/useExerciseForm';
import { ExerciseFormTemplate, ExerciseFormCheck } from '@/types/exercise';

interface ExerciseFormCheckProps {
  exerciseId: string;
}

export function ExerciseFormCheck({ exerciseId }: ExerciseFormCheckProps) {
  const [template, setTemplate] = useState<ExerciseFormTemplate | null>(null);
  const [formCheck, setFormCheck] = useState<Partial<ExerciseFormCheck>>({
    exerciseId,
    checklist: [],
    feedback: '',
  });
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    loading,
    error,
    getFormTemplates,
    createFormCheck,
    calculateFormScore,
  } = useExerciseForm();

  useEffect(() => {
    loadTemplate();
  }, [exerciseId]);

  const loadTemplate = async () => {
    const templates = await getFormTemplates(exerciseId);
    if (templates.length > 0) {
      setTemplate(templates[0]);
      setFormCheck(prev => ({
        ...prev,
        checklist: templates[0].checklist.map(item => ({
          ...item,
          completed: false,
        })),
      }));
    }
  };

  const handleChecklistItemChange = (index: number, completed: boolean) => {
    const newChecklist = [...(formCheck.checklist || [])];
    newChecklist[index] = { ...newChecklist[index], completed };
    setFormCheck(prev => ({ ...prev, checklist: newChecklist }));
  };

  const handleSubmit = async () => {
    if (!formCheck.checklist) return;

    setIsSubmitting(true);
    try {
      const score = calculateFormScore(
        formCheck.checklist.map(item => ({
          completed: item.completed,
          importance: item.importance
        }))
      );
      const newCheck = await createFormCheck({
        ...formCheck,
        score,
        videoUrl: videoUrl || undefined,
      });

      if (newCheck) {
        // Reset form
        setFormCheck({
          exerciseId,
          checklist: template?.checklist.map(item => ({
            ...item,
            completed: false,
          })) || [],
          feedback: '',
        });
        setVideoUrl('');
      }
    } finally {
      setIsSubmitting(false);
    }
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

  if (!template) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-600 rounded-lg">
        No form template found for this exercise.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-lg shadow-md space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold">{template.name}</h2>
        <p className="text-gray-600 mt-2">{template.description}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Form Checklist</h3>
        <div className="space-y-3">
          {formCheck.checklist?.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={(e) => handleChecklistItemChange(index, e.target.checked)}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <div>
                <label className="text-gray-700">{item.description}</label>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  item.importance === 'high' ? 'bg-red-100 text-red-800' :
                  item.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {item.importance}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {template.tips.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Tips</h3>
          <ul className="mt-2 list-disc list-inside space-y-1">
            {template.tips.map((tip, index) => (
              <li key={index} className="text-gray-600">{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {template.commonMistakes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Common Mistakes</h3>
          <ul className="mt-2 list-disc list-inside space-y-1">
            {template.commonMistakes.map((mistake, index) => (
              <li key={index} className="text-gray-600">{mistake}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Video URL (Optional)</label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://example.com/video"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Additional Feedback</label>
        <textarea
          value={formCheck.feedback}
          onChange={(e) => setFormCheck(prev => ({ ...prev, feedback: e.target.value }))}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          placeholder="Add any additional notes or feedback about your form..."
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors ${
            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Form Check'}
        </button>
      </div>
    </motion.div>
  );
} 