import React from 'react';
import { SearchService } from '@/services/searchService';
import { motion } from 'framer-motion';

export const SearchAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = React.useState<ReturnType<typeof SearchService.prototype.getSearchAnalytics> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const searchService = SearchService.getInstance();
    try {
      const data = searchService.getSearchAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading search analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Search Analytics
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Searches */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
        >
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Total Searches (30 days)
          </h4>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.totalSearches}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Avg. {analytics.averageSearchesPerDay.toFixed(1)} per day
          </p>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
        >
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Recent Activity
          </h4>
          <div className="flex justify-between items-end h-24">
            {analytics.recentActivity.map(({ date, count }, index) => (
              <div key={date} className="flex flex-col items-center">
                <div
                  className="w-8 bg-blue-500 dark:bg-blue-600 rounded-t"
                  style={{ height: `${(count / Math.max(...analytics.recentActivity.map(a => a.count))) * 80}px` }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(date).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Searches by Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
        >
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Searches by Type
          </h4>
          <div className="space-y-2">
            {Object.entries(analytics.searchesByType).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Popular Tags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
        >
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Popular Tags
          </h4>
          <div className="flex flex-wrap gap-2">
            {analytics.popularTags.map(({ tag, count }) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              >
                {tag} ({count})
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}; 