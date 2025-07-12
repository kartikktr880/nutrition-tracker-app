'use client';

import { motion } from 'framer-motion';
import React, { useEffect, useState, useCallback } from 'react';
import { LineChart, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';

import { useExerciseForm } from '@/lib/hooks/useExerciseForm';
import { ExerciseFormCheck } from '@/types/exercise';

interface ExerciseFormHistoryProps {
  exerciseId: string;
}

export function ExerciseFormHistory({ exerciseId }: ExerciseFormHistoryProps) {
  const [formChecks, setFormChecks] = useState<ExerciseFormCheck[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const {
    loading,
    error,
    getFormChecks,
  } = useExerciseForm();

  const loadFormChecks = useCallback(async () => {
    const startDate = getStartDate(timeRange);
    const checks = await getFormChecks(exerciseId, startDate, new Date());
    setFormChecks(checks);
  }, [exerciseId, timeRange, getFormChecks]);

  useEffect(() => {
    loadFormChecks();
  }, [loadFormChecks]);

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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateAverageScore = () => {
    if (formChecks.length === 0) return 0;
    const sum = formChecks.reduce((acc, check) => acc + (check.score || 0), 0);
    return Math.round(sum / formChecks.length);
  };

  const prepareChartData = () => {
    return formChecks.map(check => ({
      date: formatDate(check.date),
      score: check.score,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Form History</h2>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg ${
                timeRange === range
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Total Checks</h3>
          <p className="text-3xl font-bold text-primary mt-2">{formChecks.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Average Score</h3>
          <p className="text-3xl font-bold text-primary mt-2">{calculateAverageScore()}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Latest Check</h3>
          <p className="text-3xl font-bold text-primary mt-2">
            {formChecks.length > 0 ? formatDate(formChecks[0].date) : 'N/A'}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Score Progress</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={prepareChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={{ fill: '#4F46E5' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Form Checks</h3>
        <div className="space-y-4">
          {formChecks.slice(0, 5).map((check) => (
            <motion.div
              key={check.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600">{formatDate(check.date)}</p>
                  <div className="mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      check.score >= 80 ? 'bg-green-100 text-green-800' :
                      check.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      Score: {check.score}%
                    </span>
                  </div>
                </div>
                {check.videoUrl && (
                  <a
                    href={check.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark"
                  >
                    View Video
                  </a>
                )}
              </div>
              {check.feedback && (
                <p className="mt-4 text-gray-600">{check.feedback}</p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
} 