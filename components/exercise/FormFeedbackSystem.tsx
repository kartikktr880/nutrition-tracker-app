import { AlertCircle, CheckCircle2, Info, Lightbulb } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ExerciseFormCheck } from '@/lib/validations/exerciseForm';

interface FormFeedbackSystemProps {
  checks: ExerciseFormCheck[];
  currentCheck: ExerciseFormCheck;
}

interface FormFeedback {
  item: string;
  status: 'correct' | 'needs_improvement' | 'critical';
  feedback: string;
  suggestion: string;
  videoUrl?: string;
  commonMistakes: string[];
}

type ChecklistItem = {
  item: string;
  description: string;
  importance: 'critical' | 'important' | 'optional';
  completed: boolean;
  videoUrl?: string;
};

export function FormFeedbackSystem({
  checks,
  currentCheck,
}: FormFeedbackSystemProps) {
  const [feedback, setFeedback] = useState<FormFeedback[]>([]);

  useEffect(() => {
    if (!currentCheck) return;

    // Generate feedback based on current check and historical data
    const newFeedback: FormFeedback[] = currentCheck.checklist.map((item: ChecklistItem) => {
      const historicalData = checks
        .filter((check) => check.exerciseId !== currentCheck.exerciseId)
        .map((check) => {
          const historicalItem = check.checklist.find((i: typeof item) => i.item === item.item);
          return historicalItem?.completed || false;
        });

      const completionRate =
        historicalData.reduce((sum, completed) => sum + (completed ? 1 : 0), 0) /
        historicalData.length;

      // Determine status based on completion rate and importance
      let status: 'correct' | 'needs_improvement' | 'critical';
      if (item.importance === 'critical' && !item.completed) {
        status = 'critical';
      } else if (completionRate < 0.7) {
        status = 'needs_improvement';
      } else {
        status = 'correct';
      }

      // Generate feedback and suggestions
      const feedback = generateFeedback(status);
      const suggestion = generateSuggestion(status);
      const commonMistakes = generateCommonMistakes();

      return {
        item: item.item,
        status,
        feedback,
        suggestion,
        commonMistakes,
        videoUrl: item.videoUrl,
      };
    });

    setFeedback(newFeedback);
  }, [checks, currentCheck]);

  const generateFeedback = (status: string) => {
    if (status === 'correct') {
      return 'Good form! Keep maintaining this technique.';
    } else if (status === 'needs_improvement') {
      return 'This form point needs attention. Focus on maintaining proper technique.';
    } else {
      return 'Critical form point needs immediate attention. This is essential for proper technique and injury prevention.';
    }
  };

  const generateSuggestion = (status: string) => {
    if (status === 'correct') {
      return 'Continue focusing on maintaining this form point.';
    } else if (status === 'needs_improvement') {
      return 'Practice this form point with reduced weight or slower tempo to improve technique.';
    } else {
      return 'Stop and correct this form point immediately. Consider reducing weight or seeking guidance.';
    }
  };

  const generateCommonMistakes = () => {
    // This would typically come from a database of common mistakes
    return [
      'Rushing through the movement',
      'Not maintaining proper alignment',
      'Using momentum instead of controlled movement',
    ];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'correct':
        return 'text-green-500';
      case 'needs_improvement':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Form Feedback</h3>
        <Info className="w-5 h-5 text-gray-400" />
      </div>

      <div className="space-y-4">
        {feedback.map((item, index) => (
          <Collapsible key={index} className="">
            <Card
              className={`p-4 ${
                item.status === 'critical'
                  ? 'bg-red-50'
                  : item.status === 'needs_improvement'
                  ? 'bg-yellow-50'
                  : 'bg-green-50'
              }`}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {item.status === 'correct' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <h4 className="font-medium">{item.item}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{item.feedback}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={getStatusColor(item.status)}
                  >
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">Suggestion</span>
                  </div>
                  <p className="text-sm text-gray-600">{item.suggestion}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="font-medium">Common Mistakes</span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {item.commonMistakes.map((mistake, i) => (
                      <li key={i}>{mistake}</li>
                    ))}
                  </ul>
                </div>

                {item.videoUrl && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(item.videoUrl, '_blank')}
                  >
                    Watch Form Demonstration
                  </Button>
                )}
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Info className="w-4 h-4" />
        <span>Click on any item to see detailed feedback and suggestions</span>
      </div>
    </Card>
  );
} 