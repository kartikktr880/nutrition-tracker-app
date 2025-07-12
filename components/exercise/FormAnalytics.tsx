import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExerciseFormCheck } from '@/lib/validations/exerciseForm';

interface FormAnalyticsProps {
  checks: ExerciseFormCheck[];
  exerciseName: string;
}

interface FormInsight {
  type: 'improvement' | 'warning' | 'achievement';
  message: string;
  metric?: string;
  trend?: 'up' | 'down';
}

export function FormAnalytics({ checks, exerciseName }: FormAnalyticsProps) {
  const [insights, setInsights] = useState<FormInsight[]>([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [criticalItemsRate, setCriticalItemsRate] = useState(0);
  const [trendData, setTrendData] = useState<{ date: string; completionRate: number }[]>([]);
  // const [_totalChecks, setTotalChecks] = useState<number>(0); // Removed unused state

  useEffect(() => {
    if (checks.length === 0) return;

    // Calculate completion rates
    const totalItems = checks.reduce((sum, check: ExerciseFormCheck) => sum + check.checklist.length, 0);
    const completedItems = checks.reduce(
      (sum, check: ExerciseFormCheck) => sum + check.checklist.filter((item: { completed: boolean }) => item.completed).length,
      0
    );
    const criticalItems = checks.reduce(
      (sum, check: ExerciseFormCheck) =>
        sum +
        check.checklist.filter(
          (item: { importance?: string; completed: boolean }) => item.importance === 'critical' && item.completed
        ).length,
      0
    );
    const totalCriticalItems = checks.reduce(
      (sum, check: ExerciseFormCheck) =>
        sum +
        check.checklist.filter((item: { importance?: string }) => item.importance === 'critical').length,
      0
    );

    setCompletionRate((completedItems / totalItems) * 100);
    setCriticalItemsRate((criticalItems / totalCriticalItems) * 100);

    // Generate trend data
    const sortedChecks = [...checks].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const trendData = sortedChecks.map((check: ExerciseFormCheck) => ({
      date: new Date(check.date).toLocaleDateString(),
      completionRate:
        (check.checklist.filter((item: { completed: boolean }) => item.completed).length /
          check.checklist.length) *
        100,
    }));
    setTrendData(trendData);

    // Generate insights
    const newInsights: FormInsight[] = [];

    // Completion rate insight
    if (completionRate > 80) {
      newInsights.push({
        type: 'achievement',
        message: 'Excellent form completion rate!',
        metric: `${completionRate.toFixed(1)}%`,
        trend: 'up',
      });
    } else if (completionRate < 50) {
      newInsights.push({
        type: 'warning',
        message: 'Form completion rate needs improvement',
        metric: `${completionRate.toFixed(1)}%`,
        trend: 'down',
      });
    }

    // Critical items insight
    if (criticalItemsRate < 70) {
      newInsights.push({
        type: 'warning',
        message: 'Focus on critical form points',
        metric: `${criticalItemsRate.toFixed(1)}%`,
        trend: 'down',
      });
    }

    // Consistency insight
    const recentChecks = checks.slice(-3);
    const recentCompletionRates = recentChecks.map(
      (check: ExerciseFormCheck) =>
        (check.checklist.filter((item: { completed: boolean }) => item.completed).length /
          check.checklist.length) *
        100
    );
    const isConsistent =
      Math.max(...recentCompletionRates) - Math.min(...recentCompletionRates) < 20;

    if (isConsistent) {
      newInsights.push({
        type: 'improvement',
        message: 'Great consistency in form execution',
      });
    } else {
      newInsights.push({
        type: 'warning',
        message: 'Form execution varies significantly',
      });
    }

    setInsights(newInsights);
  }, [checks, completionRate, criticalItemsRate]);

  const getInsightIcon = (type: FormInsight['type']) => {
    switch (type) {
      case 'improvement':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'achievement':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Form Analytics</h3>
        <Badge variant="outline">{exerciseName}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Completion</span>
            <span className="text-sm text-gray-500">
              {completionRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Critical Items</span>
            <span className="text-sm text-gray-500">
              {criticalItemsRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={criticalItemsRate} className="h-2" />
        </Card>
      </div>

      <Tabs defaultValue="insights">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {insights.map((insight, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start space-x-4">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <p className="text-sm font-medium">{insight.message}</p>
                  {insight.metric && (
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-gray-500">
                        {insight.metric}
                      </span>
                      {insight.trend && (
                        <span
                          className={`ml-2 ${
                            insight.trend === 'up'
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          {insight.trend === 'up' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="trends">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="completionRate"
                  stroke="#2563eb"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Info className="w-4 h-4" />
        <span>
          Based on {checks.length} form checks over the last{' '}
          {Math.ceil(
            (new Date().getTime() -
              new Date(checks[checks.length - 1].date).getTime()) /
              (1000 * 60 * 60 * 24)
          )}{' '}
          days
        </span>
      </div>
    </Card>
  );
} 