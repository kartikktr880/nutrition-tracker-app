import { create } from 'zustand';
import { z } from 'zod';

// Integration types
export interface Integration {
  id: string;
  name: string;
  type: 'fitness_tracker' | 'health_app' | 'nutrition_database' | 'social' | 'analytics';
  provider: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSync?: string;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  permissions: string[];
  dataTypes: string[];
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface IntegrationData {
  id: string;
  integrationId: string;
  type: 'activity' | 'nutrition' | 'health' | 'social';
  data: unknown;
  timestamp: string;
  source: string;
}

export interface SyncResult {
  success: boolean;
  dataCount: number;
  errors: string[];
  lastSync: string;
  data?: IntegrationData[];
}

// Integration schemas
export const FitbitIntegrationSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  userId: z.string(),
  expiresAt: z.string(),
});

export const AppleHealthIntegrationSchema = z.object({
  authorized: z.boolean(),
  permissions: z.array(z.string()),
  lastSync: z.string().optional(),
});

export const MyFitnessPalIntegrationSchema = z.object({
  username: z.string(),
  apiKey: z.string(),
  lastSync: z.string().optional(),
});

export const GoogleFitIntegrationSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  userId: z.string(),
  expiresAt: z.string(),
});

// Integration store interface
interface IntegrationStore {
  integrations: Integration[];
  integrationData: IntegrationData[];
  
  // Actions
  addIntegration: (integration: Integration) => void;
  removeIntegration: (id: string) => void;
  updateIntegration: (id: string, updates: Partial<Integration>) => void;
  connectIntegration: (id: string) => Promise<boolean>;
  disconnectIntegration: (id: string) => Promise<boolean>;
  syncIntegration: (id: string) => Promise<SyncResult>;
  syncAllIntegrations: () => Promise<SyncResult[]>;
  getIntegrationData: (integrationId: string, type?: string) => IntegrationData[];
  clearIntegrationData: (integrationId: string) => void;
}

// Integration store
export const useIntegrationStore = create<IntegrationStore>((set, get) => ({
  integrations: [],
  integrationData: [],

  addIntegration: (integration: Integration) => {
    set((state: IntegrationStore) => ({
      integrations: [...state.integrations, integration],
    }));
  },

  removeIntegration: (id: string) => {
    set((state: IntegrationStore) => ({
      integrations: state.integrations.filter((integration: Integration) => integration.id !== id),
      integrationData: state.integrationData.filter((data: IntegrationData) => data.integrationId !== id),
    }));
  },

  updateIntegration: (id: string, updates: Partial<Integration>) => {
    set((state: IntegrationStore) => ({
      integrations: state.integrations.map((integration: Integration) =>
        integration.id === id ? { ...integration, ...updates } : integration
      ),
    }));
  },

  connectIntegration: async (id: string) => {
    const integration = get().integrations.find((i: Integration) => i.id === id);
    if (!integration) return false;

    try {
      const result = await IntegrationUtils.connectIntegration(integration);
      if (result) {
        get().updateIntegration(id, { status: 'connected', lastSync: new Date().toISOString() });
      }
      return result;
    } catch (error) {
      // Failed to connect integration - handled by error boundary
      get().updateIntegration(id, { status: 'error' });
      return false;
    }
  },

  disconnectIntegration: async (id: string) => {
    const integration = get().integrations.find((i: Integration) => i.id === id);
    if (!integration) return false;

    try {
      const result = await IntegrationUtils.disconnectIntegration(integration);
      if (result) {
        get().updateIntegration(id, { status: 'disconnected' });
        get().clearIntegrationData(id);
      }
      return result;
    } catch (error) {
      // Failed to disconnect integration - handled by error boundary
      return false;
    }
  },

  syncIntegration: async (id: string) => {
    const integration = get().integrations.find((i: Integration) => i.id === id);
    if (!integration || integration.status !== 'connected') {
      return { success: false, dataCount: 0, errors: ['Integration not connected'], lastSync: new Date().toISOString() };
    }

    try {
      const result = await IntegrationUtils.syncIntegration(integration);
      if (result.success && result.data) {
        get().updateIntegration(id, { lastSync: result.lastSync });
        set((state: IntegrationStore) => ({
          integrationData: [...state.integrationData, ...(result.data || [])],
        }));
      }
      return result;
    } catch (error) {
      // Failed to sync integration - handled by error boundary
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      return { success: false, dataCount: 0, errors: [message], lastSync: new Date().toISOString() };
    }
  },

  syncAllIntegrations: async () => {
    const connectedIntegrations = get().integrations.filter((i: Integration) => i.status === 'connected');
    const results = await Promise.all(
      connectedIntegrations.map((integration: Integration) => get().syncIntegration(integration.id))
    );
    return results;
  },

  getIntegrationData: (integrationId: string, type?: string) => {
    const { integrationData } = get();
    return integrationData.filter((data: IntegrationData) => 
      data.integrationId === integrationId && (!type || data.type === type)
    );
  },

  clearIntegrationData: (integrationId: string) => {
    set((state: IntegrationStore) => ({
      integrationData: state.integrationData.filter((data: IntegrationData) => data.integrationId !== integrationId),
    }));
  },
}));

// Integration utilities
export class IntegrationUtils {
  // Available integrations
  static readonly AVAILABLE_INTEGRATIONS: Integration[] = [
    {
      id: 'fitbit',
      name: 'Fitbit',
      type: 'fitness_tracker',
      provider: 'Fitbit Inc.',
      description: 'Sync activity data, heart rate, and sleep from your Fitbit device',
      icon: '🩺',
      status: 'disconnected',
      syncFrequency: 'daily',
      permissions: ['activity', 'heart_rate', 'sleep', 'weight'],
      dataTypes: ['steps', 'calories_burned', 'heart_rate', 'sleep', 'weight'],
      config: {},
      enabled: true,
    },
    {
      id: 'apple-health',
      name: 'Apple Health',
      type: 'health_app',
      provider: 'Apple Inc.',
      description: 'Import health and fitness data from Apple Health app',
      icon: '🍎',
      status: 'disconnected',
      syncFrequency: 'daily',
      permissions: ['activity', 'nutrition', 'vitals', 'sleep'],
      dataTypes: ['steps', 'calories', 'heart_rate', 'sleep', 'nutrition'],
      config: {},
      enabled: true,
    },
    {
      id: 'google-fit',
      name: 'Google Fit',
      type: 'fitness_tracker',
      provider: 'Google LLC',
      description: 'Sync fitness data from Google Fit app',
      icon: '🏃',
      status: 'disconnected',
      syncFrequency: 'daily',
      permissions: ['activity', 'location', 'body'],
      dataTypes: ['steps', 'calories', 'distance', 'weight'],
      config: {},
      enabled: true,
    },
    {
      id: 'myfitnesspal',
      name: 'MyFitnessPal',
      type: 'nutrition_database',
      provider: 'Under Armour',
      description: 'Import nutrition data and food diary from MyFitnessPal',
      icon: '📱',
      status: 'disconnected',
      syncFrequency: 'daily',
      permissions: ['nutrition', 'diary'],
      dataTypes: ['calories', 'macros', 'food_log', 'water'],
      config: {},
      enabled: true,
    },
    {
      id: 'strava',
      name: 'Strava',
      type: 'fitness_tracker',
      provider: 'Strava Inc.',
      description: 'Import workout and activity data from Strava',
      icon: '🏃‍♂️',
      status: 'disconnected',
      syncFrequency: 'daily',
      permissions: ['activity', 'profile'],
      dataTypes: ['workouts', 'distance', 'calories', 'routes'],
      config: {},
      enabled: true,
    },
    {
      id: 'garmin',
      name: 'Garmin Connect',
      type: 'fitness_tracker',
      provider: 'Garmin Ltd.',
      description: 'Sync data from Garmin devices and Garmin Connect',
      icon: '⌚',
      status: 'disconnected',
      syncFrequency: 'daily',
      permissions: ['activity', 'health', 'location'],
      dataTypes: ['steps', 'heart_rate', 'sleep', 'workouts', 'stress'],
      config: {},
      enabled: true,
    },
  ];

  // Connect integration
  static async connectIntegration(integration: Integration): Promise<boolean> {
    try {
      switch (integration.id) {
        case 'fitbit':
          return await this.connectFitbit(integration);
        case 'apple-health':
          return await this.connectAppleHealth(integration);
        case 'google-fit':
          return await this.connectGoogleFit(integration);
        case 'myfitnesspal':
          return await this.connectMyFitnessPal(integration);
        case 'strava':
          return await this.connectStrava(integration);
        case 'garmin':
          return await this.connectGarmin(integration);
        default:
          throw new Error(`Unsupported integration: ${integration.id}`);
      }
    } catch (error) {
      // Failed to connect integration - handled by error boundary
      return false;
    }
  }

  // Disconnect integration
  static async disconnectIntegration(integration: Integration): Promise<boolean> {
    try {
      // Clear stored tokens/credentials
      localStorage.removeItem(`${integration.id}_token`);
      localStorage.removeItem(`${integration.id}_refresh_token`);
      localStorage.removeItem(`${integration.id}_config`);
      
      return true;
    } catch (error) {
      // Failed to disconnect integration - handled by error boundary
      return false;
    }
  }

  // Sync integration data
  static async syncIntegration(integration: Integration): Promise<SyncResult> {
    try {
      switch (integration.id) {
        case 'fitbit':
          return await this.syncFitbit(integration);
        case 'apple-health':
          return await this.syncAppleHealth(integration);
        case 'google-fit':
          return await this.syncGoogleFit(integration);
        case 'myfitnesspal':
          return await this.syncMyFitnessPal(integration);
        case 'strava':
          return await this.syncStrava(integration);
        case 'garmin':
          return await this.syncGarmin(integration);
        default:
          throw new Error(`Unsupported integration: ${integration.id}`);
      }
    } catch (error) {
      // Failed to sync integration
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        dataCount: 0,
        errors: [message],
        lastSync: new Date().toISOString(),
      };
    }
  }

  // Fitbit integration methods
  private static async connectFitbit(integration: Integration): Promise<boolean> {
    // This would typically use Fitbit OAuth
    const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/fitbit/callback`;
    
    const authUrl = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=activity%20heartrate%20sleep%20weight`;
    
    // Open OAuth popup
    const popup = window.open(authUrl, 'fitbit-auth', 'width=500,height=600');
    
    return new Promise((resolve) => {
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          resolve(false);
        }
      }, 1000);
    });
  }

  private static async syncFitbit(integration: Integration): Promise<SyncResult> {
    const token = localStorage.getItem('fitbit_token');
    if (!token) {
      throw new Error('Fitbit not connected');
    }

    // Fetch data from Fitbit API
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`/api/integrations/fitbit/sync?date=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to sync Fitbit data');
    }

    const data = await response.json();
    
    return {
      success: true,
      dataCount: data.length,
      errors: [],
      lastSync: new Date().toISOString(),
      data: data.map((item: Record<string, unknown>) => ({
        id: `fitbit-${item.id}`,
        integrationId: 'fitbit',
        type: typeof item.type === 'string' && ['activity','nutrition','health','social'].includes(item.type) ? item.type as IntegrationData['type'] : 'activity',
        data: item,
        timestamp: typeof item.dateTime === 'string' ? item.dateTime : new Date().toISOString(),
        source: 'fitbit',
      })),
    };
  }

  // Apple Health integration methods
  private static async connectAppleHealth(integration: Integration): Promise<boolean> {
    // Apple Health requires special handling on iOS
    if (!navigator.userAgent.includes('iPhone') && !navigator.userAgent.includes('iPad')) {
      throw new Error('Apple Health is only available on iOS devices');
    }

    // Request HealthKit permissions
    if ('HealthKit' in window) {
      try {
        // This would use the HealthKit API
        return true;
      } catch (error) {
        throw new Error('Failed to access HealthKit');
      }
    } else {
      throw new Error('HealthKit not available');
    }
  }

  private static async syncAppleHealth(integration: Integration): Promise<SyncResult> {
    // Sync data from HealthKit
    const data = await this.fetchHealthKitData();
    
    return {
      success: true,
      dataCount: data.length,
      errors: [],
      lastSync: new Date().toISOString(),
      data: (Array.isArray(data) ? data : []).filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null).map((item) => ({
        id: `apple-health-${item.id}`,
        integrationId: 'apple-health',
        type: typeof item.type === 'string' && ['activity','nutrition','health','social'].includes(item.type) ? item.type as IntegrationData['type'] : 'health',
        data: item,
        timestamp: typeof item.date === 'string' ? item.date : new Date().toISOString(),
        source: 'apple-health',
      })),
    };
  }

  // Google Fit integration methods
  private static async connectGoogleFit(integration: Integration): Promise<boolean> {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google-fit/callback`;
    
    const authUrl = `https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=https://www.googleapis.com/auth/fitness.activity.read%20https://www.googleapis.com/auth/fitness.body.read`;
    
    const popup = window.open(authUrl, 'google-fit-auth', 'width=500,height=600');
    
    return new Promise((resolve) => {
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          resolve(false);
        }
      }, 1000);
    });
  }

  private static async syncGoogleFit(integration: Integration): Promise<SyncResult> {
    const token = localStorage.getItem('google-fit_token');
    if (!token) {
      throw new Error('Google Fit not connected');
    }

    const response = await fetch('/api/integrations/google-fit/sync', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to sync Google Fit data');
    }

    const data = await response.json();
    
    return {
      success: true,
      dataCount: data.length,
      errors: [],
      lastSync: new Date().toISOString(),
      data: data.map((item: Record<string, unknown>) => ({
        id: `google-fit-${item.id}`,
        integrationId: 'google-fit',
        type: typeof item.type === 'string' && ['activity','nutrition','health','social'].includes(item.type) ? item.type as IntegrationData['type'] : 'activity',
        data: item,
        timestamp: typeof item.startTime === 'string' ? item.startTime : new Date().toISOString(),
        source: 'google-fit',
      })),
    };
  }

  // MyFitnessPal integration methods
  private static async connectMyFitnessPal(integration: Integration): Promise<boolean> {
    // MyFitnessPal uses API key authentication
    const apiKey = prompt('Enter your MyFitnessPal API key:');
    if (!apiKey) return false;

    localStorage.setItem('myfitnesspal_api_key', apiKey);
    return true;
  }

  private static async syncMyFitnessPal(integration: Integration): Promise<SyncResult> {
    // Placeholder
    return { success: true, dataCount: 0, errors: [], lastSync: new Date().toISOString(), data: [] };
  }

  // Strava integration methods
  private static async connectStrava(integration: Integration): Promise<boolean> {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/strava/callback`;
    
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=read,activity:read_all`;
    
    const popup = window.open(authUrl, 'strava-auth', 'width=500,height=600');
    
    return new Promise((resolve) => {
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          resolve(false);
        }
      }, 1000);
    });
  }

  private static async syncStrava(integration: Integration): Promise<SyncResult> {
    const token = localStorage.getItem('strava_token');
    if (!token) {
      throw new Error('Strava not connected');
    }

    const response = await fetch('/api/integrations/strava/sync', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to sync Strava data');
    }

    const data = await response.json();
    
    return {
      success: true,
      dataCount: data.length,
      errors: [],
      lastSync: new Date().toISOString(),
      data: data.map((item: Record<string, unknown>) => ({
        id: `strava-${item.id}`,
        integrationId: 'strava',
        type: 'activity',
        data: item,
        timestamp: item.start_date,
        source: 'strava',
      })),
    };
  }

  // Garmin integration methods
  private static async connectGarmin(integration: Integration): Promise<boolean> {
    const clientId = process.env.NEXT_PUBLIC_GARMIN_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/garmin/callback`;
    
    const authUrl = `https://connect.garmin.com/oauthConfirm?oauth_token=${clientId}&oauth_callback=${redirectUri}`;
    
    const popup = window.open(authUrl, 'garmin-auth', 'width=500,height=600');
    
    return new Promise((resolve) => {
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          resolve(false);
        }
      }, 1000);
    });
  }

  private static async syncGarmin(integration: Integration): Promise<SyncResult> {
    // Placeholder
    return { success: true, dataCount: 0, errors: [], lastSync: new Date().toISOString(), data: [] };
  }

  // Helper method for HealthKit data (placeholder)
  private static async fetchHealthKitData(): Promise<unknown[]> {
    // Placeholder for native module call
    return [];
  }

  // Get integration by ID
  static getIntegration(id: string): Integration | undefined {
    return this.AVAILABLE_INTEGRATIONS.find(integration => integration.id === id);
  }

  // Get integrations by type
  static getIntegrationsByType(type: Integration['type']): Integration[] {
    return this.AVAILABLE_INTEGRATIONS.filter(integration => integration.type === type);
  }

  // Validate integration configuration
  static validateIntegrationConfig(integration: Integration): boolean {
    // Add validation logic based on integration type
    switch (integration.id) {
      case 'fitbit':
        return !!localStorage.getItem('fitbit_token');
      case 'google-fit':
        return !!localStorage.getItem('google-fit_token');
      case 'myfitnesspal':
        return !!localStorage.getItem('myfitnesspal_api_key');
      case 'strava':
        return !!localStorage.getItem('strava_token');
      case 'garmin':
        return !!localStorage.getItem('garmin_token');
      case 'apple-health':
        return 'HealthKit' in window;
      default:
        return false;
    }
  }
}

// React hook for integrations
import { useEffect, useCallback } from 'react';

export function useIntegrations() {
  const store = useIntegrationStore();

  // Initialize available integrations
  useEffect(() => {
    if (store.integrations.length === 0) {
      IntegrationUtils.AVAILABLE_INTEGRATIONS.forEach(integration => {
        store.addIntegration(integration);
      });
    }
  }, []);

  // Auto-sync connected integrations
  useEffect(() => {
    const connectedIntegrations = store.integrations.filter(i => i.status === 'connected');
    
    const syncInterval = setInterval(() => {
      connectedIntegrations.forEach(integration => {
        if (integration.syncFrequency === 'daily') {
          const lastSync = integration.lastSync ? new Date(integration.lastSync) : new Date(0);
          const now = new Date();
          const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceLastSync >= 24) {
            store.syncIntegration(integration.id);
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(syncInterval);
  }, [store.integrations]);

  // Get connected integrations
  const getConnectedIntegrations = useCallback(() => {
    return store.integrations.filter(i => i.status === 'connected');
  }, [store.integrations]);

  // Get integration data by type
  const getDataByType = useCallback((type: string) => {
    return store.integrationData.filter(data => data.type === type);
  }, [store.integrationData]);

  return {
    ...store,
    getConnectedIntegrations,
    getDataByType,
    availableIntegrations: IntegrationUtils.AVAILABLE_INTEGRATIONS,
  };
}

// Export utilities
export const integrationUtils = {
  IntegrationUtils,
  useIntegrations,
}; 