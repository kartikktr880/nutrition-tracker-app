'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import { 
  Droplets, 
  Plus, 
  Minus, 
  Target, 
  TrendingUp, 
  Calendar,
  Bell,
  Settings
} from 'lucide-react';
import { useAppStore, useWaterEntries, useGoals } from '@/lib/store';
import { cn } from '@/lib/utils';



const WATER_AMOUNTS = [
  { amount: 250, label: 'Small Glass', icon: '🥤' },
  { amount: 350, label: 'Regular Glass', icon: '🥛' },
  { amount: 500, label: 'Large Glass', icon: '🍶' },
  { amount: 750, label: 'Bottle', icon: '💧' },
];

export default function WaterTrackerPage() {
  const { data: session } = useSession();

  const [customAmount, setCustomAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const waterEntries = useWaterEntries();
  const goals = useGoals();
  const { addWaterEntry, removeWaterEntry, updateGoal } = useAppStore();

  // Get water goal
  const waterGoal = goals.find(goal => goal.type === 'water') || {
    id: 'default-water-goal',
    type: 'water' as const,
    target: 2000,
    current: 0,
    unit: 'ml',
    startDate: new Date(),
    isActive: true,
  };

  // Calculate today's water intake
  const today = new Date().toDateString();
  const todayEntries = waterEntries.filter(entry => 
    new Date(entry.timestamp).toDateString() === today
  );
  
  const todayTotal = todayEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const progressPercentage = Math.min((todayTotal / waterGoal.target) * 100, 100);

  // Update goal current amount
  useEffect(() => {
    if (waterGoal.id !== 'default-water-goal') {
      updateGoal(waterGoal.id, { current: todayTotal });
    }
  }, [todayTotal, waterGoal.id, updateGoal]);

  const handleAddWater = async (amount: number) => {
    if (!session?.user) return;
    
    setIsLoading(true);
    try {
      addWaterEntry({
        amount,
        timestamp: new Date(),
      });
      
      // Reset custom input
      if (showCustomInput) {
        setCustomAmount('');
        setShowCustomInput(false);
      }
    } catch (error) {
      // Failed to add water entry - handled by error boundary
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLastEntry = () => {
    if (todayEntries.length > 0) {
      const lastEntry = todayEntries[todayEntries.length - 1];
      removeWaterEntry(lastEntry.id);
    }
  };

  const handleCustomAmount = () => {
    const amount = parseInt(customAmount);
    if (amount > 0 && amount <= 5000) {
      handleAddWater(amount);
    }
  };

  const getHydrationStatus = () => {
    const percentage = (todayTotal / waterGoal.target) * 100;
    if (percentage >= 100) return { status: 'Hydrated', color: 'text-green-600', bg: 'bg-green-100' };
    if (percentage >= 75) return { status: 'Well Hydrated', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (percentage >= 50) return { status: 'Moderately Hydrated', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'Needs Hydration', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const hydrationStatus = getHydrationStatus();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Water Tracker
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Stay hydrated and track your daily water intake
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Water Tracker */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                Today&apos;s Hydration
              </CardTitle>
              <CardDescription>
                Track your water intake and stay hydrated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Section */}
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {todayTotal}ml
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  of {waterGoal.target}ml goal
                </div>
                <Progress value={progressPercentage} className="h-3 mb-4" />
                <Badge className={cn('text-sm', hydrationStatus.bg, hydrationStatus.color)}>
                  {hydrationStatus.status}
                </Badge>
              </div>

              {/* Quick Add Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {WATER_AMOUNTS.map((item) => (
                  <Button
                    key={item.amount}
                    variant="outline"
                    className="h-20 flex flex-col gap-1"
                    onClick={() => handleAddWater(item.amount)}
                    disabled={isLoading}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-medium">{item.amount}ml</span>
                    <span className="text-xs text-gray-500">{item.label}</span>
                  </Button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="space-y-3">
                {showCustomInput ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Enter amount (ml)"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="5000"
                    />
                    <Button 
                      onClick={handleCustomAmount}
                      disabled={!customAmount || isLoading}
                      size="sm"
                    >
                      Add
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCustomInput(false)}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowCustomInput(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Custom Amount
                  </Button>
                )}
              </div>

              {/* Remove Last Entry */}
              {todayEntries.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={handleRemoveLastEntry}
                  className="w-full text-red-600 hover:text-red-700"
                  disabled={isLoading}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Remove Last Entry
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Goal Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Daily Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Target:</span>
                  <span className="font-medium">{waterGoal.target}ml</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Today:</span>
                  <span className="font-medium">{todayTotal}ml</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Remaining:</span>
                  <span className="font-medium text-blue-600">
                    {Math.max(0, waterGoal.target - todayTotal)}ml
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today&apos;s Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayEntries.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No entries yet today
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {todayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">{entry.amount}ml</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-2" />
                Set Reminders
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Goal Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                View History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Overview</CardTitle>
            <CardDescription>
              Your hydration progress over the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dateString = date.toDateString();
                const dayEntries = waterEntries.filter(entry => 
                  new Date(entry.timestamp).toDateString() === dateString
                );
                const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.amount, 0);
                const dayProgress = Math.min((dayTotal / waterGoal.target) * 100, 100);
                
                return (
                  <div key={i} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">
                      {date.toLocaleDateString([], { weekday: 'short' })}
                    </div>
                    <div className="h-20 bg-gray-100 rounded-lg flex items-end justify-center p-1">
                      <div 
                        className="bg-blue-500 rounded w-full transition-all duration-300"
                        style={{ height: `${dayProgress}%` }}
                      />
                    </div>
                    <div className="text-xs mt-1">{dayTotal}ml</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 