import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from 'chart.js';
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';

import { performanceAlertService } from '@/lib/performance-alerts';

import NotificationHistory from './NotificationHistory';
import NotificationPreferences from './NotificationPreferences';
import PerformanceAlerts from './PerformanceAlerts';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PerformanceMetrics {
  timestamp: number;
  memory: {
    used: number;
    total: number;
    limit: number;
  };
  performance: {
    loadTime: number;
    responseTime: number;
    errorRate: number;
  };
  resources: {
    cpu: number;
    connections: number;
    activeUsers: number;
  };
  status: 'healthy' | 'degraded' | 'critical';
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  checks: { name: string; status: 'pass' | 'fail' }[];
  metrics: PerformanceMetrics;
  security: {
    activeSessions: number;
    lockedAccounts: number;
    lastCleanup: number;
  };
}

export default function PerformanceDashboard() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<PerformanceMetrics[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) throw new Error('Failed to fetch health status');
        const data = await response.json();
        setHealthStatus(data);
        setMetricsHistory((prev: PerformanceMetrics[]) => [...prev, data.metrics].slice(-60)); // Keep last 60 minutes

        // Check for performance alerts
        performanceAlertService.checkMetrics(data.metrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch health status');
      }
    };

    // Initial fetch
    fetchHealthStatus();

    // Update every minute
    const interval = setInterval(fetchHealthStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    return `${value.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const chartData = {
    labels: metricsHistory.map((m: PerformanceMetrics) => formatTimestamp(m.timestamp)),
    datasets: [
      {
        label: 'Memory Usage',
        data: metricsHistory.map((m: PerformanceMetrics) => m.memory.used),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
      {
        label: 'Response Time',
        data: metricsHistory.map((m: PerformanceMetrics) => m.performance.responseTime),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      },
      {
        label: 'Error Rate',
        data: metricsHistory.map((m: PerformanceMetrics) => m.performance.errorRate * 100),
        borderColor: 'rgb(255, 159, 64)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (!healthStatus) {
    return (
      <div className="p-4 bg-gray-50 text-gray-700 rounded-lg">
        Loading performance metrics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className={`text-xl font-bold ${getStatusColor(healthStatus.status)}`}>
            {healthStatus.status.toUpperCase()}
          </div>
        </div>

        {/* Health Checks */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Health Checks</h2>
          <div className="grid grid-cols-2 gap-4">
            {healthStatus.checks.map((check: { name: string; status: 'pass' | 'fail' }) => (
              <div key={check?.name} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  check.status === 'pass' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>{check?.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Metrics */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Current Metrics</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Memory Usage</div>
              <div className="text-xl font-bold">
                {formatBytes(healthStatus.metrics.memory.used)} / {formatBytes(healthStatus.metrics.memory.limit)}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Response Time</div>
              <div className="text-xl font-bold">
                {healthStatus.metrics.performance.responseTime.toFixed(2)}ms
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Error Rate</div>
              <div className="text-xl font-bold">
                {(healthStatus.metrics.performance.errorRate * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Security Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Security Status</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Active Sessions</div>
              <div className="text-xl font-bold">{healthStatus.security.activeSessions}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Locked Accounts</div>
              <div className="text-xl font-bold">{healthStatus.security.lockedAccounts}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Last Cleanup</div>
              <div className="text-xl font-bold">
                {new Date(healthStatus.security.lastCleanup).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Performance History</h2>
          {error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Active Alerts</h2>
            <PerformanceAlerts />
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <NotificationPreferences />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Notification History</h2>
        <NotificationHistory />
      </div>
    </div>
  );
} 


