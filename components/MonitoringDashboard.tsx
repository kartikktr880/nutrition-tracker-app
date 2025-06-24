import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MonitoringData {
  timestamp: string;
  health: {
    status: string;
    uptime: number;
    environment: string;
  };
  security: {
    securityScore: number;
    vulnerabilities: Array<{
      type: string;
      name: string;
      severity: string;
      description: string;
      recommendation: string;
    }>;
  };
  performance: {
    fps: number;
    loadTime: number;
    memoryUsage: number;
  };
  memory: {
    warnings: Array<{
      timestamp: string;
      type: string;
      message: string;
    }>;
    leaks: Array<{
      timestamp: string;
      type: string;
      message: string;
    }>;
  };
}

export default function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/monitoring?type=dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch monitoring data');
        }
        const monitoringData = await response.json();
        setData(monitoringData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 bg-gray-50 text-gray-700 rounded-lg">
        Loading monitoring data...
      </div>
    );
  }

  const securityScoreData = {
    labels: data.security.scoreHistory?.map(entry => 
      new Date(entry.timestamp).toLocaleTimeString()
    ) || [],
    datasets: [
      {
        label: 'Security Score',
        data: data.security.scoreHistory?.map(entry => entry.score) || [],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">System Monitoring Dashboard</h1>
      
      {/* Health Status */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="font-medium">Status: {data.health.status}</p>
            <p className="text-sm text-gray-600">Uptime: {Math.floor(data.health.uptime / 3600)}h {Math.floor((data.health.uptime % 3600) / 60)}m</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="font-medium">Environment: {data.health.environment}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="font-medium">Security Score: {data.security.securityScore}%</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="font-medium">FPS: {data.performance.fps}</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg">
            <p className="font-medium">Memory Usage: {(data.performance.memoryUsage / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <div className="p-4 bg-pink-50 rounded-lg">
            <p className="font-medium">Load Time: {data.performance.loadTime}ms</p>
          </div>
        </div>
      </div>

      {/* Security Score Chart */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Security Score Trend</h2>
        <div className="h-64">
          <Line data={securityScoreData} options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
              },
            },
          }} />
        </div>
      </div>

      {/* Warnings and Issues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-3">Memory Warnings</h2>
          <div className="space-y-2">
            {data.memory.warnings.map((warning, index) => (
              <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                <p className="font-medium">{warning.type}</p>
                <p className="text-sm text-gray-600">{warning.message}</p>
                <p className="text-xs text-gray-500">{new Date(warning.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-3">Memory Leaks</h2>
          <div className="space-y-2">
            {data.memory.leaks.map((leak, index) => (
              <div key={index} className="p-3 bg-red-50 rounded-lg">
                <p className="font-medium">{leak.type}</p>
                <p className="text-sm text-gray-600">{leak.message}</p>
                <p className="text-xs text-gray-500">{new Date(leak.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 