import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { getPerformanceMetrics, getPerformanceTrends, type EnhancedPerformanceMetric, type PerformanceInsight } from '../utils/enhanced-performance';
import { logError, logWarn as _logWarn, logInfo as _logInfo, logDebug as _logDebug } from '../utils/logger';
import { recoveryManager } from '../utils/recovery';

interface RecoveryHistoryItem {
  timestamp: string;
  type: string;
  success: boolean;
  error?: string;
}

interface DashboardProps {
  refreshInterval?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const PerformanceDashboard: React.FC<DashboardProps> = ({
  refreshInterval = 5000
}) => {
  const [metrics, setMetrics] = useState<EnhancedPerformanceMetric[]>([]);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryHistoryItem[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h'>('1h');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const enhancedMetrics = await getPerformanceMetrics();
        const performanceInsights = await getPerformanceTrends();
        const recoveryHistoryData = recoveryManager.getRecoveryHistory();

        setMetrics(enhancedMetrics);
        setInsights(performanceInsights);
        setRecoveryHistory(recoveryHistoryData);
      } catch (error) {
        logError();
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const filterDataByTimeRange = <T extends { timestamp: string }>(data: T[]): T[] => {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };

    return data.filter(item => {
      const timestamp = new Date(item.timestamp).getTime();
      return now - timestamp <= ranges[selectedTimeRange];
    });
  };

  const renderMetricChart = (metricName: string, data: EnhancedPerformanceMetric[]) => {
    const filteredData = filterDataByTimeRange(data.map(item => ({
      ...item,
      timestamp: typeof item.timestamp === 'string' ? item.timestamp : new Date(item.timestamp ?? Date.now()).toISOString()
    })));
    const chartData = filteredData.map(item => ({
      timestamp: item.timestamp,
      value: item[metricName as keyof EnhancedPerformanceMetric] ?? 0,
      prediction: typeof item.prediction === 'number' ? item.prediction : undefined
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            name={metricName}
          />
          <Line
            type="monotone"
            dataKey="prediction"
            stroke="#82ca9d"
            strokeDasharray="5 5"
            name={`${metricName} (Predicted)`}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderInsightsChart = (insights: PerformanceInsight[]) => {
    const filteredInsights = filterDataByTimeRange(insights);
    const insightTypes = filteredInsights.reduce((acc: Record<string, number>, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(insightTypes).map(([type, count]) => ({
      name: type,
      value: count
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderRecoveryHistory = (history: RecoveryHistoryItem[]) => {
    const filteredHistory = filterDataByTimeRange(history.map(item => ({
      ...item,
      timestamp: typeof item.timestamp === 'string' ? item.timestamp : new Date(item.timestamp ?? Date.now()).toISOString()
    })));
    // If 'success' property does not exist, default to 0
    const successCount = filteredHistory.filter(item => item.success).length;
    const failureCount = filteredHistory.filter(item => !item.success).length;

    const barData = [
      { name: 'Successful', value: successCount },
      { name: 'Failed', value: failureCount }
    ];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Performance Analytics Dashboard</h1>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded ${
              selectedTimeRange === '1h' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setSelectedTimeRange('1h')}
          >
            1 Hour
          </button>
          <button
            className={`px-4 py-2 rounded ${
              selectedTimeRange === '6h' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setSelectedTimeRange('6h')}
          >
            6 Hours
          </button>
          <button
            className={`px-4 py-2 rounded ${
              selectedTimeRange === '24h' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setSelectedTimeRange('24h')}
          >
            24 Hours
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Memory Usage</h2>
          {renderMetricChart('memoryUsage', metrics)}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">CPU Usage</h2>
          {renderMetricChart('cpuUsage', metrics)}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Network Latency</h2>
          {renderMetricChart('networkLatency', metrics)}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Frame Rate</h2>
          {renderMetricChart('frameRate', metrics)}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Performance Insights</h2>
          {renderInsightsChart(insights)}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recovery History</h2>
          {renderRecoveryHistory(recoveryHistory)}
        </div>
      </div>

      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Insights</h2>
        <div className="space-y-4">
          {filterDataByTimeRange(insights)
            .slice(-5)
            .reverse()
            .map((insight, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{insight.type}</h3>
                    <p className="text-gray-600">{insight.description}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(insight.timestamp).toLocaleString()}
                  </div>
                </div>
                {insight.recommendation && (
                  <div className="mt-2 text-sm text-blue-600">
                    Recommendation: {insight.recommendation}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard; 