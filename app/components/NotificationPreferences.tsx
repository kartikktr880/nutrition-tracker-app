import React, { useState } from 'react';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  channels: string[];
}

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: false,
    sms: false,
    channels: ['email']
  });

  const handleToggle = (type: keyof Pick<NotificationPreferences, 'email' | 'push' | 'sms'>) => {
    setPreferences(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const _handleToggleEnabled = async () => {
    if (!preferences) return;
    
    try {
      const newPreferences = {
        ...preferences
      };
      setPreferences(newPreferences);
    } catch (err) {
      // Handle error silently
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Notification Preferences</h3>
      <div className="space-y-3">
        {Object.entries({ email: preferences.email, push: preferences.push, sms: preferences.sms }).map(([type, enabled]) => (
          <div key={type} className="flex items-center justify-between">
            <span className="capitalize">{type} Notifications</span>
            <button
              onClick={() => handleToggle(type as keyof Pick<NotificationPreferences, 'email' | 'push' | 'sms'>)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 