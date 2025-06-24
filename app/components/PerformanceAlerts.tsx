import { useEffect, useState } from 'react';
import { performanceAlertService } from '@/lib/performance-alerts';

interface Alert {
  id: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
}

export default function PerformanceAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const activeAlerts = performanceAlertService.getActiveAlerts();
        setAlerts(activeAlerts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      }
    };

    // Initial fetch
    fetchAlerts();

    // Update every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = (alertId: string) => {
    try {
      performanceAlertService.acknowledgeAlert(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="p-4 bg-green-50 text-green-700 rounded-lg">
        No active performance alerts
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Active Alerts</h3>
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold">{alert.message}</div>
              <div className="text-sm mt-1">
                {new Date(alert.timestamp).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => handleAcknowledge(alert.id)}
              className="px-3 py-1 text-sm bg-white rounded-md shadow-sm hover:bg-gray-50"
            >
              Acknowledge
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 