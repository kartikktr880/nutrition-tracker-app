import { useEffect, useState, useMemo, useCallback } from 'react';
import { notificationService } from '@/lib/notification-service';

interface Notification {
  id: string;
  timestamp: number;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  channel: 'browser' | 'email' | 'webhook';
  status: 'pending' | 'sent' | 'failed';
  metadata?: Record<string, unknown>;
}

type SortField = 'timestamp' | 'priority' | 'status';
type SortOrder = 'asc' | 'desc';
type TimeGroup = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'older';

interface GroupedNotifications {
  [key: string]: Notification[];
}

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterStatus, setFilterStatus] = useState<Notification['status'] | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Notification['priority'] | 'all'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['today']));
  const [loadingGroups, setLoadingGroups] = useState<Set<string>>(new Set());

  const getTimeGroup = useCallback((timestamp: number): TimeGroup => {
    try {
      const now = new Date();
      const date = new Date(timestamp);
      
      // Validate timestamp
      if (isNaN(date.getTime())) {
        console.error('Invalid timestamp:', timestamp);
        return 'older';
      }

      // Use UTC to avoid timezone issues
      const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      const diffDays = Math.floor((nowUTC - dateUTC) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'today';
      if (diffDays === 1) return 'yesterday';
      if (diffDays <= 7) return 'this_week';
      if (diffDays <= 30) return 'this_month';
      return 'older';
    } catch (error) {
      console.error('Error in getTimeGroup:', error);
      return 'older';
    }
  }, []);

  const getGroupTitle = useCallback((group: TimeGroup): string => {
    switch (group) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'this_week': return 'This Week';
      case 'this_month': return 'This Month';
      case 'older': return 'Older';
      default: return group;
    }
  }, []);

  const getPriorityColor = useCallback((priority: Notification['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }, []);

  const getStatusColor = useCallback((status: Notification['status']) => {
    switch (status) {
      case 'sent': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }, []);

  const sortNotifications = useCallback((notifications: Notification[]) => {
    return [...notifications].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [sortField, sortOrder]);

  const filterNotifications = useCallback((notifications: Notification[]) => {
    return notifications.filter(notification => {
      const statusMatch = filterStatus === 'all' || notification.status === filterStatus;
      const priorityMatch = filterPriority === 'all' || notification.priority === filterPriority;
      return statusMatch && priorityMatch;
    });
  }, [filterStatus, filterPriority]);

  const groupedNotifications = useMemo(() => {
    const filtered = filterNotifications(notifications);
    const sorted = sortNotifications(filtered);
    return sorted.reduce((groups: GroupedNotifications, notification) => {
      const group = getTimeGroup(notification.timestamp);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(notification);
      return groups;
    }, {});
  }, [notifications, filterNotifications, sortNotifications, getTimeGroup]);

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }, [sortField, sortOrder]);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const history = notificationService.getNotificationHistory();
        setNotifications(history);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notification history');
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 text-gray-700 rounded-lg">
        Loading notification history...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as Notification['status'] | 'all')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as Notification['priority'] | 'all')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedNotifications).map(([group, notifications]) => (
          <div key={group} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGroup(group)}
              className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
            >
              <span className="font-medium">{getGroupTitle(group as TimeGroup)}</span>
              <span className="text-sm text-gray-500">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </span>
            </button>

            {expandedGroups.has(group) && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('timestamp')}
                      >
                        Time {sortField === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('priority')}
                      >
                        Priority {sortField === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('status')}
                      >
                        Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Channel
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {notifications.map((notification) => (
                      <tr key={notification.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {notification.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-medium ${getPriorityColor(notification.priority)}`}>
                            {notification.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-medium ${getStatusColor(notification.status)}`}>
                            {notification.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {notification.channel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {Object.keys(groupedNotifications).length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No notifications found
        </div>
      )}
    </div>
  );
} 