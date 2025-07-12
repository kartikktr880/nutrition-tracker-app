import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';

import { SearchService } from '@/services/searchService';

import { logError, logInfo } from '../../utils/logger';

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'recommendation':
      return '💡';
    case 'pattern':
      return '📊';
    case 'trend':
      return '📈';
    case 'suggestion':
      return '💭';
    default:
      return 'ℹ️';
  }
};

const getInsightColor = (type: string) => {
  switch (type) {
    case 'recommendation':
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    case 'pattern':
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    case 'trend':
      return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
    case 'suggestion':
      return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    default:
      return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
  }
};

export const SearchInsights: React.FC = () => {
  const [_insights, setInsights] = useState<ReturnType<typeof SearchService.prototype.getSearchInsights> | null>(null);
  const [_isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      const searchService = SearchService.getInstance();
      try {
        const data = await searchService.getSearchInsights();
        setInsights(data);
      } catch (error) {
        logError('Error loading search insights:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (_isLoading) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4" role="status">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!_insights || _insights.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Search Insights
      </h3>

      <div className="space-y-4">
        {_insights.map((insight, index) => (
          <motion.div
            key={`${insight.type}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" role="img" aria-label={insight.type}>
                {getInsightIcon(insight.type)}
              </span>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {insight.description}
                </p>
                {insight.action && (
                  <button
                    onClick={() => {
                      // Handle action based on type
                      logInfo('Action:', insight.action);
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                  >
                    {insight.action.label}
                  </button>
                )}
              </div>
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {Math.round(insight.confidence * 100)}% confidence
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}; 