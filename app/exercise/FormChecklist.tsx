import { CheckCircle2, AlertCircle, Info, Star } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip';
import { ExerciseFormTemplate, ExerciseFormCheck } from '@/lib/validations/exerciseForm';

interface FormChecklistProps {
  template: ExerciseFormTemplate;
  onComplete: (check: ExerciseFormCheck) => void;
  previousChecks?: ExerciseFormCheck[];
}

export function FormChecklist({
  template,
  onComplete,
  previousChecks = [],
}: FormChecklistProps) {
  const [checklist, setChecklist] = useState(
    template.checklist.map((item) => ({ ...item, completed: false }))
  );
  const [feedback, setFeedback] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [completionRate, setCompletionRate] = useState(0);

  useEffect(() => {
    const completed = checklist.filter((item) => item.completed).length;
    setCompletionRate((completed / checklist.length) * 100);
  }, [checklist]);

  const handleItemToggle = (index: number) => {
    const newChecklist = [...checklist];
    newChecklist[index].completed = !newChecklist[index].completed;
    setChecklist(newChecklist);
  };

  const handleSubmit = () => {
    const completedItems = checklist.filter((item) => item.completed).length;
    const newCheck: ExerciseFormCheck = {
      exerciseId: template.exerciseId,
      date: new Date(),
      score: Math.round((completedItems / checklist.length) * 100),
      checklist: template.checklist.map(item => ({
        ...item,
        completed: false
      })),
      feedback: feedback || undefined,
      videoUrl: undefined
    };
    onComplete(newCheck);
  };

  const getItemStatus = (index: number) => {
    const previousItemChecks = previousChecks.map(
      (check) => check.checklist[index]
    );
    const completionRate =
      previousItemChecks.filter((_item) => _item.completed).length /
      previousItemChecks.length;

    if (completionRate > 0.8) {
      return 'excellent';
    } else if (completionRate > 0.5) {
      return 'good';
    } else {
      return 'needs-improvement';
    }
  };

  const getItemRecommendation = (index: number) => {
    const status = getItemStatus(index);

    switch (status) {
      case 'excellent':
        return 'Keep up the great work!';
      case 'good':
        return 'Focus on consistency with this item';
      case 'needs-improvement':
        return 'This item needs more attention';
      default:
        return '';
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{template.name}</h3>
        <p className="text-sm text-gray-500">{template.description}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Form Completion</span>
          <span className="text-sm text-gray-500">
            {completionRate.toFixed(1)}%
          </span>
        </div>
        <Progress value={completionRate} className="h-2" />
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {checklist.map((_item, index) => (
            <Collapsible key={index} className="">
              <Card
                className={`p-4 transition-colors ${
                  checklist[index].completed ? 'bg-green-50' : 'bg-white'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleItemToggle(index)}
                    className={`${
                      checklist[index].completed ? 'text-green-500' : 'text-gray-400'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </Button>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{checklist[index].item}</h4>
                        <p className="text-sm text-gray-500">
                          {checklist[index].description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            checklist[index].importance === 'critical'
                              ? 'destructive'
                              : checklist[index].importance === 'important'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {checklist[index].importance}
                        </Badge>
                        <CollapsibleTrigger>
                          <Button variant="ghost" size="icon">
                            <span className="sr-only">Toggle</span>
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent className="space-y-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <Star
                          className={`w-4 h-4 ${
                            getItemStatus(index) === 'excellent'
                              ? 'text-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                        <span className="text-gray-500">
                          {getItemRecommendation(index)}
                        </span>
                      </div>

                      {template.tips && template.tips.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <div className="flex items-start space-x-2">
                            <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-700">
                                Tips
                              </p>
                              <ul className="mt-1 text-sm text-blue-600 list-disc list-inside">
                                {template.tips.map((tip, tipIndex) => (
                                  <li key={tipIndex}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {template.commonMistakes &&
                        template.commonMistakes.length > 0 && (
                          <div className="bg-yellow-50 p-3 rounded-md">
                            <div className="flex items-start space-x-2">
                              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-yellow-700">
                                  Common Mistakes
                                </p>
                                <ul className="mt-1 text-sm text-yellow-600 list-disc list-inside">
                                  {template.commonMistakes.map(
                                    (mistake, mistakeIndex) => (
                                      <li key={mistakeIndex}>{mistake}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                    </CollapsibleContent>
                  </div>
                </div>
              </Card>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Feedback</label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add any additional feedback about your form..."
            className="h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Video URL (Optional)
          </label>
          <div className="flex space-x-2">
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Add a video URL for form review"
            />
            <Tooltip content="Add video URL for form analysis">
              <TooltipTrigger>
                <Button variant="outline" size="sm">
                  Add Video
                </Button>
              </TooltipTrigger>
            </Tooltip>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          className="w-full"
          disabled={completionRate === 0}
        >
          Submit Form Check
        </Button>
      </div>
    </Card>
  );
} 