import { NextApiRequest, NextApiResponse } from 'next';
// import { v8 } from 'v8';
import OfflineService from '@/services/offline';

interface ExportData {
  nutrition: {
    daily: Array<{
      date: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      water: number;
    }>;
  };
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  };
  streaks: {
    current: number;
    longest: number;
    type: 'calories' | 'water' | 'protein';
  };
}

class DataPortabilityService {
  private static instance: DataPortabilityService;
  private offlineService: OfflineService;

  private constructor() {
    this.offlineService = OfflineService.getInstance();
  }

  public static getInstance(): DataPortabilityService {
    if (!DataPortabilityService.instance) {
      DataPortabilityService.instance = new DataPortabilityService();
    }
    return DataPortabilityService.instance;
  }

  public async exportData(userId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const data = await this.fetchUserData(userId);
      const validatedData = this.validateExportData(data);

      if (format === 'csv') {
        return this.convertToCSV(validatedData);
      }

      return JSON.stringify(validatedData, null, 2);
    } catch (error) {
      console.error('Export error:', error);
      throw new Error('Failed to export data');
    }
  }

  public async importData(userId: string, data: string, format: 'json' | 'csv' = 'json'): Promise<void> {
    try {
      let parsedData: ExportData;

      if (format === 'csv') {
        parsedData = this.parseCSV(data);
      } else {
        parsedData = JSON.parse(data);
      }

      const validatedData = this.validateExportData(parsedData);
      await this.saveUserData(userId, validatedData);
    } catch (error) {
      console.error('Import error:', error);
      throw new Error('Failed to import data');
    }
  }

  private async fetchUserData(userId: string): Promise<ExportData> {
    if (!this.offlineService.isOnlineStatus()) {
      throw new Error('Cannot fetch data while offline');
    }

    const response = await fetch(`/api/user/${userId}/data`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private async saveUserData(userId: string, data: ExportData): Promise<void> {
    if (!this.offlineService.isOnlineStatus()) {
      throw new Error('Cannot save data while offline');
    }

    const response = await fetch(`/api/user/${userId}/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  private validateExportData(data: any): ExportData {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data structure');
    }

    // Validate nutrition data
    if (!data.nutrition?.daily || !Array.isArray(data.nutrition.daily)) {
      throw new Error('Invalid nutrition data');
    }

    // Validate goals data
    if (!data.goals || typeof data.goals.calories !== 'number') {
      throw new Error('Invalid goals data');
    }

    // Validate streaks data
    if (!data.streaks || typeof data.streaks.current !== 'number') {
      throw new Error('Invalid streaks data');
    }

    return data as ExportData;
  }

  private convertToCSV(data: ExportData): string {
    const headers = ['date', 'calories', 'protein', 'carbs', 'fat', 'water'];
    const rows = data.nutrition.daily.map(day => [
      day.date,
      day.calories,
      day.protein,
      day.carbs,
      day.fat,
      day.water
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  private parseCSV(csv: string): ExportData {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        date: values[0],
        calories: Number(values[1]),
        protein: Number(values[2]),
        carbs: Number(values[3]),
        fat: Number(values[4]),
        water: Number(values[5])
      };
    });

    return {
      nutrition: { daily: rows },
      goals: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        water: 0
      },
      streaks: {
        current: 0,
        longest: 0,
        type: 'calories'
      }
    };
  }

  public async handleApiRequest(req: NextApiRequest, res: NextApiResponse) {
    const { action, format } = req.query;
    const userId = req.headers['user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    try {
      switch (action) {
        case 'export': {
          const exportData = await this.exportData(userId, format as 'json' | 'csv');
          res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename=nutrition-data.${format}`);
          return res.send(exportData);
        }
        case 'import': {
          if (!req.body) {
            return res.status(400).json({ error: 'No data provided' });
          }
          await this.importData(userId, req.body, format as 'json' | 'csv');
          return res.json({ message: 'Data imported successfully' });
        }
        default: {
          return res.status(400).json({ error: 'Invalid action' });
        }
      }
    } catch (error) {
      console.error('Data portability error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default DataPortabilityService; 