import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { ExerciseSession, ExerciseProgress } from '@/types/exercise';
import { logError } from 'src/utils/logger';

interface ExerciseAnalyticsProps {
  timeRange: 'week' | 'month' | 'year';
}

export const ExerciseAnalytics: React.FC<ExerciseAnalyticsProps> = ({ timeRange }) => {
  const { data: _session } = useSession();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [_progress, setProgress] = useState<ExerciseProgress[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalDuration: 0,
    totalCaloriesBurned: 0,
    averageIntensity: 0,
  });

  useEffect(() => {
    const fetchExerciseData = async () => {
      setLoading(true);
      try {
        const startDate = getStartDate(timeRange);
        const endDate = new Date();

        const [sessionsResponse, progressResponse] = await Promise.all([
          fetch(`/api/exercise/session?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
          fetch(`/api/exercise/progress?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
        ]);

        if (!sessionsResponse.ok || !progressResponse.ok) {
          throw new Error('Failed to fetch exercise data');
        }

        const [sessionsData, progressData] = await Promise.all([
          sessionsResponse.json(),
          progressResponse.json(),
        ]);

        setSessions(sessionsData);
        setProgress(progressData);
        calculateStats(sessionsData, progressData);
      } catch (error) {
        logError();
      } finally {
        setLoading(false);
      }
    };
    fetchExerciseData();
  }, [timeRange]);

  const getStartDate = (range: 'week' | 'month' | 'year'): Date => {
    const date = new Date();
    switch (range) {
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - 1);
        break;
    }
    return date;
  };

  const calculateStats = (sessions: ExerciseSession[], progress: ExerciseProgress[]) => {
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
    const totalCaloriesBurned = sessions.reduce((sum, session) => sum + session.caloriesBurned, 0);
    const averageIntensity = progress.reduce((sum, p) => sum + Number(p.intensity), 0) / progress.length || 0;

    setStats({
      totalSessions,
      totalDuration,
      totalCaloriesBurned,
      averageIntensity,
    });
  };

  const prepareChartData = () => {
    return sessions.map(session => ({
      date: new Date(session.startTime).toLocaleDateString(),
      duration: session.duration,
      calories: session.caloriesBurned,
    }));
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-lg shadow-lg"
    >
      <h2 className="text-2xl font-bold mb-6">Exercise Analytics</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Total Sessions</h3>
          <p className="text-2xl font-bold">{stats.totalSessions}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Total Duration</h3>
          <p className="text-2xl font-bold">{stats.totalDuration} min</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Calories Burned</h3>
          <p className="text-2xl font-bold">{stats.totalCaloriesBurned.toFixed(0)} kcal</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Average Intensity</h3>
          <p className="text-2xl font-bold">{stats.averageIntensity.toFixed(1)}</p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={prepareChartData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="duration"
              stroke="#8884d8"
              name="Duration (min)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="calories"
              stroke="#82ca9d"
              name="Calories"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}; 