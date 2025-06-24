import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useTheme } from '@/hooks/useTheme';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsDashboardProps {
  userId: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userId }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const { data, loading, error, refresh } = useAnalytics({
    userId,
    period: selectedPeriod,
    autoRefresh: true
  });
  const { isDarkMode } = useTheme();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={refresh}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
      </div>
    );
  }

  const chartData = {
    labels: data.nutrition[selectedPeriod].map((item: any) => item.date),
    datasets: [
      {
        label: 'Calories',
        data: data.nutrition[selectedPeriod].map((item: any) => item.calories),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
      {
        label: 'Protein',
        data: data.nutrition[selectedPeriod].map((item: any) => item.protein),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      },
      {
        label: 'Carbs',
        data: data.nutrition[selectedPeriod].map((item: any) => item.carbs),
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1
      },
      {
        label: 'Fat',
        data: data.nutrition[selectedPeriod].map((item: any) => item.fat),
        borderColor: 'rgb(255, 206, 86)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: isDarkMode ? '#fff' : '#000'
        }
      },
      title: {
        display: true,
        text: 'Nutrition Trends',
        color: isDarkMode ? '#fff' : '#000'
      }
    },
    scales: {
      y: {
        ticks: {
          color: isDarkMode ? '#fff' : '#000'
        },
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        ticks: {
          color: isDarkMode ? '#fff' : '#000'
        },
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end space-x-2">
        <button
          onClick={() => setSelectedPeriod('daily')}
          className={`px-4 py-2 rounded ${
            selectedPeriod === 'daily'
              ? 'bg-primary text-white'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Daily
        </button>
        <button
          onClick={() => setSelectedPeriod('weekly')}
          className={`px-4 py-2 rounded ${
            selectedPeriod === 'weekly'
              ? 'bg-primary text-white'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setSelectedPeriod('monthly')}
          className={`px-4 py-2 rounded ${
            selectedPeriod === 'monthly'
              ? 'bg-primary text-white'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Monthly
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Weekly Average</h3>
          <p className="text-2xl font-bold">{data.nutrition.weekly.average.calories} cal</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Goals Achieved</h3>
          <p className="text-2xl font-bold">{data.goals.achieved}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Current Streak</h3>
          <p className="text-2xl font-bold">{data.streaks.current} days</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Goals Progress */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Goals Progress</h3>
        <div className="space-y-4">
          {Object.entries(data.goals.progress).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="capitalize">{key}</span>
                <span>{value}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 