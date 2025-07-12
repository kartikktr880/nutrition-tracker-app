import React, { useState, useEffect } from 'react';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export default function PerformanceAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Mock data - replace with actual alert fetching
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'warning',
        message: 'High memory usage detected',
        timestamp: new Date(),
        resolved: false
      }
    ];
    setAlerts(mockAlerts);
  }, []);

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        No active alerts
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{alert.message}</p>
              <p className="text-sm opacity-75">
                {alert.timestamp.toLocaleTimeString()}
              </p>
            </div>
            {!alert.resolved && (
              <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                Active
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 