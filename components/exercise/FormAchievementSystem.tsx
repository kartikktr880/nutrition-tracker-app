import { useState, useEffect } from 'react';
import { ExerciseFormCheck } from '@/lib/validations/exerciseForm';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  Info,
  Target,
  Star,
  Medal,
  Award,
  Crown,
  Sparkles,
  CheckCircle2,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FormAchievementSystemProps {
  checks: ExerciseFormCheck[];
  currentCheck: ExerciseFormCheck;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'consistency' | 'mastery' | 'milestone' | 'special';
  icon: React.ReactNode;
  progress: number;
  completed: boolean;
  unlockedAt?: Date;
  requirements: {
    type: string;
    value: number;
    current: number;
  };
}

interface AchievementMetrics {
  achievements: Achievement[];
  totalAchievements: number;
  completedAchievements: number;
  nextAchievement?: Achievement;
  recentUnlocks: Achievement[];
  streakAchievements: Achievement[];
}

export function FormAchievementSystem({
  checks,
  currentCheck,
}: FormAchievementSystemProps) {
  const [metrics, setMetrics] = useState<AchievementMetrics>({
    achievements: [],
    totalAchievements: 0,
    completedAchievements: 0,
    recentUnlocks: [],
    streakAchievements: [],
  });

  useEffect(() => {
    if (!currentCheck || !checks.length) return;

    const achievements = generateAchievements(checks, currentCheck);
    const completedAchievements = achievements.filter(a => a.completed).length;
    const nextAchievement = achievements.find(a => !a.completed);
    const recentUnlocks = achievements
      .filter(a => a.completed && a.unlockedAt)
      .sort((a, b) => b.unlockedAt!.getTime() - a.unlockedAt!.getTime())
      .slice(0, 3);
    const streakAchievements = achievements.filter(a => 
      a.type === 'consistency' && a.completed
    );

    setMetrics({
      achievements,
      totalAchievements: achievements.length,
      completedAchievements,
      nextAchievement,
      recentUnlocks,
      streakAchievements,
    });
  }, [checks, currentCheck]);

  const generateAchievements = (
    checks: ExerciseFormCheck[],
    currentCheck: ExerciseFormCheck
  ): Achievement[] => {
    const achievements: Achievement[] = [];

    // Consistency Achievements
    achievements.push(
      {
        id: 'consistency_3',
        title: 'Form Master Beginner',
        description: 'Maintain 80% form consistency for 3 days',
        type: 'consistency',
        icon: <Star className="w-6 h-6 text-yellow-500" />,
        progress: calculateConsistencyProgress(checks, 3),
        completed: calculateConsistencyProgress(checks, 3) >= 100,
        requirements: {
          type: 'days',
          value: 3,
          current: Math.min(calculateConsistencyProgress(checks, 3) / 100 * 3, 3),
        },
      },
      {
        id: 'consistency_7',
        title: 'Form Master Intermediate',
        description: 'Maintain 80% form consistency for 7 days',
        type: 'consistency',
        icon: <Medal className="w-6 h-6 text-blue-500" />,
        progress: calculateConsistencyProgress(checks, 7),
        completed: calculateConsistencyProgress(checks, 7) >= 100,
        requirements: {
          type: 'days',
          value: 7,
          current: Math.min(calculateConsistencyProgress(checks, 7) / 100 * 7, 7),
        },
      },
      {
        id: 'consistency_30',
        title: 'Form Master Expert',
        description: 'Maintain 80% form consistency for 30 days',
        type: 'consistency',
        icon: <Crown className="w-6 h-6 text-purple-500" />,
        progress: calculateConsistencyProgress(checks, 30),
        completed: calculateConsistencyProgress(checks, 30) >= 100,
        requirements: {
          type: 'days',
          value: 30,
          current: Math.min(calculateConsistencyProgress(checks, 30) / 100 * 30, 30),
        },
      }
    );

    // Mastery Achievements
    achievements.push(
      {
        id: 'mastery_upper',
        title: 'Upper Body Form Master',
        description: 'Achieve 90% form score in upper body exercises',
        type: 'mastery',
        icon: <Target className="w-6 h-6 text-red-500" />,
        progress: calculateAreaMastery(checks, 'upper_body'),
        completed: calculateAreaMastery(checks, 'upper_body') >= 90,
        requirements: {
          type: 'score',
          value: 90,
          current: calculateAreaMastery(checks, 'upper_body'),
        },
      },
      {
        id: 'mastery_lower',
        title: 'Lower Body Form Master',
        description: 'Achieve 90% form score in lower body exercises',
        type: 'mastery',
        icon: <Target className="w-6 h-6 text-green-500" />,
        progress: calculateAreaMastery(checks, 'lower_body'),
        completed: calculateAreaMastery(checks, 'lower_body') >= 90,
        requirements: {
          type: 'score',
          value: 90,
          current: calculateAreaMastery(checks, 'lower_body'),
        },
      }
    );

    // Milestone Achievements
    achievements.push(
      {
        id: 'milestone_100',
        title: 'Century Club',
        description: 'Complete 100 form checks',
        type: 'milestone',
        icon: <Trophy className="w-6 h-6 text-yellow-500" />,
        progress: (checks.length / 100) * 100,
        completed: checks.length >= 100,
        requirements: {
          type: 'checks',
          value: 100,
          current: checks.length,
        },
      }
    );

    // Special Achievements
    achievements.push(
      {
        id: 'special_perfect',
        title: 'Perfect Form',
        description: 'Achieve 100% form score in any check',
        type: 'special',
        icon: <Sparkles className="w-6 h-6 text-purple-500" />,
        progress: hasPerfectScore(checks) ? 100 : 0,
        completed: hasPerfectScore(checks),
        requirements: {
          type: 'perfect',
          value: 1,
          current: hasPerfectScore(checks) ? 1 : 0,
        },
      }
    );

    return achievements;
  };

  const calculateConsistencyProgress = (checks: ExerciseFormCheck[], days: number): number => {
    const recentChecks = checks.slice(-days);
    if (recentChecks.length < days) return 0;

    const consistencyScores = recentChecks.map(check => {
      const completed = check.checklist.filter(item => item.completed).length;
      return (completed / check.checklist.length) * 100;
    });

    const averageScore = consistencyScores.reduce((sum, score) => sum + score, 0) / consistencyScores.length;
    return averageScore >= 80 ? 100 : (averageScore / 80) * 100;
  };

  const calculateAreaMastery = (checks: ExerciseFormCheck[], area: string): number => {
    const recentChecks = checks.slice(-10);
    const areaScores = recentChecks.map(check => {
      const areaItems = check.checklist.filter(item =>
        item.item.toLowerCase().includes(area)
      );
      if (areaItems.length === 0) return 100;
      const completed = areaItems.filter(item => item.completed).length;
      return (completed / areaItems.length) * 100;
    });

    return areaScores.reduce((sum, score) => sum + score, 0) / areaScores.length;
  };

  const hasPerfectScore = (checks: ExerciseFormCheck[]): boolean => {
    return checks.some(check => {
      const completed = check.checklist.filter(item => item.completed).length;
      return completed === check.checklist.length;
    });
  };

  const getAchievementIcon = (achievement: Achievement) => {
    if (achievement.completed) {
      return achievement.icon;
    }
    return <Lock className="w-6 h-6 text-gray-400" />;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 70) return 'bg-blue-500';
    if (progress >= 30) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Form Achievements</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-5 h-5 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Track your form improvement achievements</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-6">
        {/* Achievement Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-500">
              {metrics.completedAchievements} / {metrics.totalAchievements}
            </span>
          </div>
          <Progress
            value={(metrics.completedAchievements / metrics.totalAchievements) * 100}
            className="h-2"
          />
        </div>

        {/* Next Achievement */}
        {metrics.nextAchievement && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Next Achievement</span>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getAchievementIcon(metrics.nextAchievement)}
                  <span className="font-medium">{metrics.nextAchievement.title}</span>
                </div>
                <Badge variant="outline">
                  {metrics.nextAchievement.requirements.current} / {metrics.nextAchievement.requirements.value}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{metrics.nextAchievement.description}</p>
              <Progress
                value={metrics.nextAchievement.progress}
                className={`h-2 ${getProgressColor(metrics.nextAchievement.progress)}`}
              />
            </div>
          </div>
        )}

        {/* Recent Unlocks */}
        {metrics.recentUnlocks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="font-medium">Recent Achievements</span>
            </div>
            <div className="space-y-2">
              {metrics.recentUnlocks.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-3 border rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    {achievement.icon}
                    <div>
                      <span className="font-medium">{achievement.title}</span>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100">
                    Unlocked
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Achievements */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-purple-500" />
            <span className="font-medium">All Achievements</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {metrics.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-3 border rounded-lg ${
                  achievement.completed ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getAchievementIcon(achievement)}
                    <div>
                      <span className="font-medium">{achievement.title}</span>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={achievement.completed ? 'bg-green-100' : 'bg-gray-100'}
                  >
                    {achievement.requirements.current} / {achievement.requirements.value}
                  </Badge>
                </div>
                <Progress
                  value={achievement.progress}
                  className={`h-1 mt-2 ${getProgressColor(achievement.progress)}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
} 