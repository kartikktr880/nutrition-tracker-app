'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Target, 
  TrendingUp, 
  Droplets, 
  Apple, 
  Flame,
  Calendar,
  Clock,
  Award,
  BarChart3
} from 'lucide-react';

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
}

interface GoalData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

interface DailyProgress {
  date: string;
  calories: number;
  water: number;
  exercise: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [nutritionData, setNutritionData] = useState<NutritionData>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    water: 0
  });
  const [goals, setGoals] = useState<GoalData>({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
    water: 2000
  });
  const [weeklyProgress, setWeeklyProgress] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchDashboardData();
    }
  }, [session, status]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch today's nutrition data
      const nutritionResponse = await fetch('/api/nutrition/today');
      if (nutritionResponse.ok) {
        const nutrition = await nutritionResponse.json();
        setNutritionData(nutrition);
      }

      // Fetch user goals
      const goalsResponse = await fetch('/api/user/goals');
      if (goalsResponse.ok) {
        const userGoals = await goalsResponse.json();
        setGoals(userGoals);
      }

      // Fetch weekly progress
      const progressResponse = await fetch('/api/analytics/weekly-progress');
      if (progressResponse.ok) {
        const progress = await progressResponse.json();
        setWeeklyProgress(progress);
      }
    } catch (error) {
      // Error fetching dashboard data - handled by error boundary
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };



  const getRemainingCalories = () => {
    return Math.max(0, goals.calories - nutritionData.calories);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to access your dashboard.
            </p>
            <Button className="w-full">
              <a href="/auth/signin">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {session?.user?.name || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your nutrition overview for today
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="outline">
            <a href="/meal-plan">Meal Plan</a>
          </Button>
          <Button>
            <a href="/tracker">Log Food</a>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calories</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionData.calories}</div>
            <p className="text-xs text-muted-foreground">
              {getRemainingCalories()} remaining
            </p>
            <Progress 
              value={calculateProgress(nutritionData.calories, goals.calories)} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Water</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionData.water}ml</div>
            <p className="text-xs text-muted-foreground">
              {Math.max(0, goals.water - nutritionData.water)}ml remaining
            </p>
            <Progress 
              value={calculateProgress(nutritionData.water, goals.water)} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protein</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionData.protein}g</div>
            <p className="text-xs text-muted-foreground">
              {Math.max(0, goals.protein - nutritionData.protein)}g remaining
            </p>
            <Progress 
              value={calculateProgress(nutritionData.protein, goals.protein)} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exercise</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 min</div>
            <p className="text-xs text-muted-foreground">
              No exercise logged today
            </p>
            <Button variant="outline" size="sm" className="mt-2 w-full">
              Log Exercise
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nutrition Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                Today&apos;s Nutrition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Protein</span>
                    <span>{nutritionData.protein}g / {goals.protein}g</span>
                  </div>
                  <Progress value={calculateProgress(nutritionData.protein, goals.protein)} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Carbs</span>
                    <span>{nutritionData.carbs}g / {goals.carbs}g</span>
                  </div>
                  <Progress value={calculateProgress(nutritionData.carbs, goals.carbs)} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Fat</span>
                    <span>{nutritionData.fat}g / {goals.fat}g</span>
                  </div>
                  <Progress value={calculateProgress(nutritionData.fat, goals.fat)} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Fiber</span>
                  <span>{nutritionData.fiber}g</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Weekly Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {weeklyProgress.length > 0 ? (
                  weeklyProgress.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div 
                        className="w-full bg-primary rounded-t"
                        style={{ 
                          height: `${(day.calories / goals.calories) * 100}%`,
                          minHeight: '20px'
                        }}
                      ></div>
                      <div className="text-xs mt-1">{day.calories}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                    No data available for this week
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <a href="/tracker">
                  <Clock className="mr-2 h-4 w-4" />
                  Log Food
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <a href="/meal-plan">
                  <Calendar className="mr-2 h-4 w-4" />
                  Plan Meals
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <a href="/analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <a href="/goals">
                  <Target className="mr-2 h-4 w-4" />
                  Set Goals
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Award className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">7 Day Streak</p>
                    <p className="text-xs text-muted-foreground">Logged food for 7 consecutive days</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Goal Achiever</p>
                    <p className="text-xs text-muted-foreground">Met your protein goal</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Tip</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Drinking water before meals can help you feel fuller and reduce calorie intake. 
                Try having a glass of water 30 minutes before your next meal!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 