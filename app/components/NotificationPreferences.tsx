import { useEffect, useState } from 'react';
import { notificationService } from '@/lib/notification-service';

type NotificationChannel = 'browser' | 'email' | 'webhook';
type NotificationPriority = 'low' | 'medium' | 'high';

interface NotificationPreferences {
  channels: NotificationChannel[];
  priority: NotificationPriority;
  enabled: boolean;
}

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = notificationService.getPreferences();
        setPreferences(prefs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      }
    };

    loadPreferences();
  }, []);

  const handleToggleEnabled = async () => {
    if (!preferences) return;
    
    setIsSaving(true);
    try {
      const newPreferences = {
        ...preferences,
        enabled: !preferences.enabled
      };
      notificationService.updatePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChannelToggle = async (channel: NotificationChannel) => {
    if (!preferences) return;

    setIsSaving(true);
    try {
      const newChannels = preferences.channels.includes(channel)
        ? preferences.channels.filter(c => c !== channel)
        : [...preferences.channels, channel];

      const newPreferences = {
        ...preferences,
        channels: newChannels
      };
      notificationService.updatePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update channels');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePriorityChange = async (priority: NotificationPriority) => {
    if (!preferences) return;

    setIsSaving(true);
    try {
      const newPreferences = {
        ...preferences,
        priority
      };
      notificationService.updatePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update priority');
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="p-4 bg-gray-50 text-gray-700 rounded-lg">
        Loading notification preferences...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Notification Preferences</h3>
        <button
          onClick={handleToggleEnabled}
          disabled={isSaving}
          className={`px-4 py-2 rounded-md ${
            preferences.enabled
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {preferences.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Notification Channels</h4>
          <div className="space-y-2">
            {(['browser', 'email', 'webhook'] as NotificationChannel[]).map(channel => (
              <label key={channel} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.channels.includes(channel)}
                  onChange={() => handleChannelToggle(channel)}
                  disabled={isSaving || !preferences.enabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 capitalize">{channel}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Notification Priority</h4>
          <div className="space-y-2">
            {(['low', 'medium', 'high'] as NotificationPriority[]).map(priority => (
              <label key={priority} className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={preferences.priority === priority}
                  onChange={() => handlePriorityChange(priority)}
                  disabled={isSaving || !preferences.enabled}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 capitalize">{priority}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {isSaving && (
        <div className="text-sm text-gray-500">
          Saving preferences...
        </div>
      )}
    </div>
  );
} 