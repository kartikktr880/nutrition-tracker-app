import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExerciseFormCheck, ExerciseFormTemplate } from '@/lib/validations/exerciseForm';

import { Target, CheckCircle, AlertCircle } from '../../components/icons/lucide-react';

interface FormRecommendationsProps {
  checks: ExerciseFormCheck[];
  template: ExerciseFormTemplate;
}

interface Recommendation {
  type: 'improvement' | 'achievement' | 'focus';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

export function FormRecommendations({
  checks,
  template,
}: FormRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [streak, setStreak] = useState(0);
  const [nextMilestone, setNextMilestone] = useState<{
    target: number;
    current: number;
    type: string;
  } | null>(null);

  useEffect(() => {
    if (checks.length === 0) return;

    // Calculate streak
    const sortedChecks = checks.sort(
      (a, b) => new Date(b.date || Date.now()).getTime() - new Date(a.date || Date.now()).getTime()
    );
    let currentStreak = 0;
    let lastDate = new Date(sortedChecks[0].date || Date.now());

    for (const check of sortedChecks) {
      const checkDate = new Date(check.date || Date.now());
      const dayDiff = Math.floor(
        (lastDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff <= 1) {
        currentStreak++;
        lastDate = checkDate;
      } else {
        break;
      }
    }
    setStreak(currentStreak);

    // Generate recommendations
    const newRecommendations: Recommendation[] = [];

    // Analyze critical items
    const criticalItems = template.checklist.filter(
      (item) => item.importance === 'critical'
    );
    const criticalCompletionRate =
      checks.reduce(
        (sum, check) =>
          sum +
          check.checklist.filter(
            (item) =>
              item.importance === 'critical' && item.completed
          ).length,
        0
      ) /
      (criticalItems.length * checks.length);

    if (criticalCompletionRate < 0.7) {
      newRecommendations.push({
        type: 'focus',
        title: 'Focus on Critical Form Points',
        description: 'Your critical form points need more attention. These are essential for proper technique and injury prevention.',
        priority: 'high',
        action: 'Review critical items',
      });
    }

    // Analyze consistency
    const recentChecks = checks.slice(-3);
    const completionRates = recentChecks.map(
      (check) =>
        check.checklist.filter((item) => item.completed).length /
        check.checklist.length
    );
    const consistency = Math.max(...completionRates) - Math.min(...completionRates);

    if (consistency > 0.3) {
      newRecommendations.push({
        type: 'improvement',
        title: 'Improve Form Consistency',
        description: 'Your form execution varies significantly between sessions. Focus on maintaining consistent technique.',
        priority: 'medium',
        action: 'Practice form consistency',
      });
    }

    // Check for achievements
    if (currentStreak >= 3) {
      newRecommendations.push({
        type: 'achievement',
        title: 'Maintaining Good Habits',
        description: `Great job maintaining a ${currentStreak}-day streak! Keep up the consistent practice.`,
        priority: 'low',
      });
    }

    // Set next milestone
    const totalChecks = checks.length;
    const nextTarget = Math.ceil(totalChecks / 5) * 5;
    setNextMilestone({
      target: nextTarget,
      current: totalChecks,
      type: 'form checks',
    });

    setRecommendations(newRecommendations);
  }, [checks, template]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Form Insights</h3>
        <Badge variant="outline">{template.name}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <div>
              <p className="text-sm font-medium">Current Streak</p>
              <p className="text-2xl font-bold">{streak} days</p>
            </div>
          </div>
        </Card>

        {nextMilestone && (
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Next Milestone</p>
                <p className="text-2xl font-bold">
                  {nextMilestone.current}/{nextMilestone.target}
                </p>
                <p className="text-sm text-gray-500">
                  {nextMilestone.type}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Recommendations</h4>
        {recommendations.map((recommendation, index) => (
          <Card
            key={index}
            className={`p-4 ${
              recommendation.type === 'achievement'
                ? 'bg-green-50'
                : recommendation.type === 'focus'
                ? 'bg-red-50'
                : 'bg-yellow-50'
            }`}
          >
            <div className="flex items-start space-x-4">
              {recommendation.type === 'achievement' ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              ) : recommendation.type === 'focus' ? (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              ) : (
                <Target className="w-5 h-5 text-yellow-500 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">{recommendation.title}</h5>
                  <Badge
                    variant="outline"
                    className={getPriorityColor(recommendation.priority)}
                  >
                    {recommendation.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {recommendation.description}
                </p>
                {recommendation.action && (
                  <Button
                    variant="link"
                    className="mt-2 p-0 h-auto text-sm"
                    onClick={() => {
                      // Handle action
                    }}
                  >
                    {recommendation.action}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <CheckCircle className="w-4 h-4" />
        <span>
          Based on {checks.length} form checks and {template.checklist.length} form
          points
        </span>
      </div>
    </Card>
  );
} 