import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Mock data - replace with actual notification fetching
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'info',
        message: 'System maintenance completed',
        timestamp: new Date(Date.now() - 3600000),
        read: true
      },
      {
        id: '2',
        type: 'warning',
        message: 'High CPU usage detected',
        timestamp: new Date(Date.now() - 1800000),
        read: false
      }
    ];
    setNotifications(mockNotifications);
  }, []);

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        No notifications
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`p-3 rounded-lg border ${getNotificationColor(notification.type)} ${
            !notification.read ? 'ring-2 ring-blue-200' : ''
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium">{notification.message}</p>
              <p className="text-sm text-gray-600">
                {notification.timestamp.toLocaleString()}
              </p>
            </div>
            {!notification.read && (
              <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                New
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 