import { useState, useEffect } from 'react';
import { ExerciseFormCheck } from '@/lib/validations/exerciseForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormHistoryComparisonProps {
  checks: ExerciseFormCheck[];
}

interface ComparisonResult {
  item: string;
  previousRate: number;
  currentRate: number;
  trend: 'improved' | 'declined' | 'stable';
  significance: 'high' | 'medium' | 'low';
}

export function FormHistoryComparison({ checks }: FormHistoryComparisonProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  useEffect(() => {
    if (checks.length === 0) return;

    // Calculate date range based on selected time range
    const end = new Date();
    const start = new Date();
    switch (timeRange) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'all':
        start.setTime(0); // Beginning of time
        break;
    }
    setSelectedPeriod({ start, end });

    // Get all unique form items
    const allItems = new Set<string>();
    checks.forEach((check) => {
      check.checklist.forEach((item) => {
        allItems.add(item.item);
      });
    });

    // Calculate comparison results
    const results: ComparisonResult[] = Array.from(allItems).map((item) => {
      // Calculate rates for previous and current periods
      const midPoint = new Date((start.getTime() + end.getTime()) / 2);
      
      const previousChecks = checks.filter(
        (check) => new Date(check.date) >= start && new Date(check.date) < midPoint
      );
      const currentChecks = checks.filter(
        (check) => new Date(check.date) >= midPoint && new Date(check.date) <= end
      );

      const previousRate = calculateCompletionRate(previousChecks, item);
      const currentRate = calculateCompletionRate(currentChecks, item);

      // Determine trend and significance
      const difference = currentRate - previousRate;
      const trend = difference > 0.1 ? 'improved' : difference < -0.1 ? 'declined' : 'stable';
      const significance = Math.abs(difference) > 0.3 ? 'high' : Math.abs(difference) > 0.15 ? 'medium' : 'low';

      return {
        item,
        previousRate,
        currentRate,
        trend,
        significance,
      };
    });

    setComparisonResults(results);
  }, [checks, timeRange]);

  const calculateCompletionRate = (checks: ExerciseFormCheck[], item: string) => {
    if (checks.length === 0) return 0;
    
    const totalOccurrences = checks.reduce((sum, check) => {
      const itemInCheck = check.checklist.find((i) => i.item === item);
      return sum + (itemInCheck ? 1 : 0);
    }, 0);

    const completedOccurrences = checks.reduce((sum, check) => {
      const itemInCheck = check.checklist.find((i) => i.item === item);
      return sum + (itemInCheck?.completed ? 1 : 0);
    }, 0);

    return totalOccurrences > 0 ? completedOccurrences / totalOccurrences : 0;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improved':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declined':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Form Progress Comparison</h3>
        <Select value={timeRange} onValueChange={(value: 'week' | 'month' | 'all') => setTimeRange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedPeriod && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(selectedPeriod.start)}</span>
          </div>
          <ArrowRight className="w-4 h-4" />
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(selectedPeriod.end)}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comparisonResults
          .filter((result) => result.significance === 'high')
          .map((result, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium">{result.item}</h4>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">
                        {Math.round(result.previousRate * 100)}%
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">
                        {Math.round(result.currentRate * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getTrendIcon(result.trend)}
                  <Badge
                    variant="outline"
                    className={
                      result.trend === 'improved'
                        ? 'text-green-500'
                        : result.trend === 'declined'
                        ? 'text-red-500'
                        : 'text-gray-500'
                    }
                  >
                    {result.trend}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
      </div>

      <div className="text-sm text-gray-500">
        Showing significant changes in form execution over time
      </div>
    </Card>
  );
} 