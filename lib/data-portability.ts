import { z } from 'zod';
import { useAppStore } from '@/lib/store';

// Data export formats
export type ExportFormat = 'json' | 'csv' | 'xml' | 'pdf';

// Data import formats
export type ImportFormat = 'json' | 'csv';

// Derive types from Zod schemas
export type FoodEntry = z.infer<typeof FoodEntrySchema>;
export type WaterEntry = z.infer<typeof WaterEntrySchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;

// Export data structure
export interface ExportData {
  version: string;
  exportedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  data: {
    foodEntries: FoodEntry[];
    waterEntries: WaterEntry[];
    goals: Goal[];
    achievements: Achievement[];
    settings: unknown;
    preferences: unknown;
  };
  metadata?: {
    totalFoodEntries: number;
    totalWaterEntries: number;
    totalGoals: number;
    totalAchievements: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

// Import data structure
export interface ImportData {
  version: string;
  exportedAt: string;
  data: {
    foodEntries: FoodEntry[];
    waterEntries: WaterEntry[];
    goals: Goal[];
    achievements: Achievement[];
    settings?: unknown;
    preferences?: unknown;
  };
}

// Validation schemas
const FoodEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    fiber: z.number(),
    sugar: z.number(),
    sodium: z.number(),
  }),
  servingSize: z.number(),
  servingUnit: z.string(),
  timestamp: z.string(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  barcode: z.string().optional(),
  brand: z.string().optional(),
});

const WaterEntrySchema = z.object({
  id: z.string(),
  amount: z.number(),
  timestamp: z.string(),
});

const GoalSchema = z.object({
  id: z.string(),
  type: z.enum(['calories', 'protein', 'carbs', 'fat', 'water', 'weight']),
  target: z.number(),
  current: z.number(),
  unit: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isActive: z.boolean(),
});

const AchievementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  unlockedAt: z.string(),
  category: z.enum(['nutrition', 'water', 'streak', 'goal', 'social']),
});

const ImportDataSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  data: z.object({
    foodEntries: z.array(FoodEntrySchema),
    waterEntries: z.array(WaterEntrySchema),
    goals: z.array(GoalSchema),
    achievements: z.array(AchievementSchema),
    settings: z.unknown().optional(),
    preferences: z.unknown().optional(),
  }),
});

// Data portability class
export class DataPortability {
  private static readonly VERSION = '1.0.0';

  // Export data in specified format
  static async exportData(format: ExportFormat, options: {
    includeMetadata?: boolean;
    dateRange?: { start: Date; end: Date };
    compress?: boolean;
  } = {}): Promise<string | Blob> {
    const {
      includeMetadata = true,
      dateRange,
      compress = false,
    } = options;

    // Get data from store
    const store = useAppStore.getState();
    const user = store.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Filter data by date range if specified
    let foodEntries = store.foodEntries;
    let waterEntries = store.waterEntries;

    if (dateRange) {
      foodEntries = foodEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= dateRange.start && entryDate <= dateRange.end;
      });

      waterEntries = waterEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= dateRange.start && entryDate <= dateRange.end;
      });
    }

    // Prepare export data
    const exportData: ExportData = {
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      data: {
        foodEntries: foodEntries.map(entry => ({
          ...entry,
          timestamp: entry.timestamp.toISOString(),
        })),
        waterEntries: waterEntries.map(entry => ({
          ...entry,
          timestamp: entry.timestamp.toISOString(),
        })),
        goals: store.goals.map(goal => ({
          ...goal,
          startDate: goal.startDate.toISOString(),
          endDate: goal.endDate?.toISOString(),
        })),
        achievements: store.achievements.map(achievement => ({
          ...achievement,
          unlockedAt: achievement.unlockedAt.toISOString(),
        })),
        settings: store.settings,
        preferences: user.preferences,
      },
      metadata: includeMetadata ? {
        totalFoodEntries: foodEntries.length,
        totalWaterEntries: waterEntries.length,
        totalGoals: store.goals.length,
        totalAchievements: store.achievements.length,
        dateRange: {
          start: dateRange?.start.toISOString() || new Date(0).toISOString(),
          end: dateRange?.end.toISOString() || new Date().toISOString(),
        },
      } : undefined,
    };

    // Export in specified format
    switch (format) {
      case 'json':
        return this.exportAsJSON(exportData, compress);
      case 'csv':
        return this.exportAsCSV(exportData);
      case 'xml':
        return this.exportAsXML(exportData);
      case 'pdf':
        return this.exportAsPDF(exportData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Export as JSON
  private static exportAsJSON(data: ExportData, compress: boolean): string {
    const jsonString = JSON.stringify(data, null, compress ? 0 : 2);
    return jsonString;
  }

  // Export as CSV
  private static exportAsCSV(data: ExportData): string {
    const csvLines: string[] = [];

    // Add metadata
    if (data.metadata) {
      csvLines.push('Metadata');
      csvLines.push(`Total Food Entries,${data.metadata.totalFoodEntries}`);
      csvLines.push(`Total Water Entries,${data.metadata.totalWaterEntries}`);
      csvLines.push(`Total Goals,${data.metadata.totalGoals}`);
      csvLines.push(`Total Achievements,${data.metadata.totalAchievements}`);
      csvLines.push(`Date Range Start,${data.metadata.dateRange.start}`);
      csvLines.push(`Date Range End,${data.metadata.dateRange.end}`);
      csvLines.push('');
    }

    // Add food entries
    if (data.data.foodEntries.length > 0) {
      csvLines.push('Food Entries');
      csvLines.push('Name,Calories,Protein,Carbs,Fat,Fiber,Sugar,Sodium,Serving Size,Serving Unit,Meal Type,Timestamp,Brand');
      
      data.data.foodEntries.forEach((entry: FoodEntry) => {
        csvLines.push([
          `"${entry.name}"`,
          entry.nutrition.calories,
          entry.nutrition.protein,
          entry.nutrition.carbs,
          entry.nutrition.fat,
          entry.nutrition.fiber,
          entry.nutrition.sugar,
          entry.nutrition.sodium,
          entry.servingSize,
          entry.servingUnit,
          entry.mealType,
          entry.timestamp,
          entry.brand || '',
        ].join(','));
      });
      csvLines.push('');
    }

    // Add water entries
    if (data.data.waterEntries.length > 0) {
      csvLines.push('');
      csvLines.push('Water Entries');
      csvLines.push('Amount,Timestamp');
      
      data.data.waterEntries.forEach((entry: WaterEntry) => {
        csvLines.push([
          entry.amount,
          entry.timestamp,
        ].join(','));
      });
    }

    // Add goals
    if (data.data.goals.length > 0) {
      csvLines.push('');
      csvLines.push('Goals');
      csvLines.push('Type,Target,Current,Unit,Start Date,End Date,Is Active');
      
      data.data.goals.forEach((goal: Goal) => {
        csvLines.push([
          goal.type,
          goal.target,
          goal.current,
          goal.unit,
          goal.startDate,
          goal.endDate || '',
          goal.isActive,
        ].join(','));
      });
    }

    // Add achievements
    if (data.data.achievements.length > 0) {
      csvLines.push('');
      csvLines.push('Achievements');
      csvLines.push('Title,Description,Category,Unlocked At');
      
      data.data.achievements.forEach((achievement: Achievement) => {
        csvLines.push([
          `"${achievement.title}"`,
          `"${achievement.description}"`,
          achievement.category,
          achievement.unlockedAt,
        ].join(','));
      });
    }

    return csvLines.join('\n');
  }

  // Export as XML
  private static exportAsXML(data: ExportData): string {
    const xmlLines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<nutritionData>'];

    // Add food entries
    xmlLines.push('  <foodEntries>');
    data.data.foodEntries.forEach((entry: FoodEntry) => {
      xmlLines.push('    <entry>');
      xmlLines.push(`      <name>${this.escapeXML(entry.name)}</name>`);
      xmlLines.push(`      <calories>${entry.nutrition.calories}</calories>`);
      xmlLines.push(`      <protein>${entry.nutrition.protein}</protein>`);
      xmlLines.push(`      <carbs>${entry.nutrition.carbs}</carbs>`);
      xmlLines.push(`      <fat>${entry.nutrition.fat}</fat>`);
      xmlLines.push(`      <timestamp>${entry.timestamp}</timestamp>`);
      xmlLines.push(`      <meal-type>${entry.mealType}</meal-type>`);
      xmlLines.push('    </entry>');
    });
    xmlLines.push('  </foodEntries>');

    // Add water entries
    xmlLines.push('  <waterEntries>');
    data.data.waterEntries.forEach((entry: WaterEntry) => {
      xmlLines.push('    <entry>');
      xmlLines.push(`      <amount>${entry.amount}</amount>`);
      xmlLines.push(`      <timestamp>${entry.timestamp}</timestamp>`);
      xmlLines.push('    </entry>');
    });
    xmlLines.push('  </waterEntries>');

    xmlLines.push('</nutritionData>');
    return xmlLines.join('\n');
  }

  // Export as PDF (simplified - in real app would use a PDF library)
  private static async exportAsPDF(data: ExportData): Promise<Blob> {
    // This is a simplified implementation
    // In a real app, you would use a library like jsPDF or puppeteer
    const content = `Nutrition Tracker Data Export
    
Version: ${data.version}
Exported: ${data.exportedAt}
User: ${data.user.name} (${data.user.email})

Food Entries: ${data.data.foodEntries.length}
Water Entries: ${data.data.waterEntries.length}
Goals: ${data.data.goals.length}
Achievements: ${data.data.achievements.length}

This is a simplified PDF export. In a real implementation, 
this would include formatted tables and charts.`;

    return new Blob([content], { type: 'application/pdf' });
  }

  private static escapeXML(text: string): string {
    return text.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
  
  static async importData(file: File, format: ImportFormat): Promise<{
    success: boolean;
    imported: number;
    errors: string[];
    warnings: string[];
  }> {
    const store = useAppStore.getState();
    const importedData = await this.parseData(file, format);

    if (!importedData) {
      return { success: false, imported: 0, errors: ['Failed to parse file'], warnings: [] };
    }

    const validation = ImportDataSchema.safeParse(importedData);
    if (!validation.success) {
      return { success: false, imported: 0, errors: validation.error.errors.map(e => e.message), warnings: [] };
    }

    const { data } = validation.data;
    let importedCount = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    data.foodEntries.forEach(entry => {
      store.addFoodEntry({
        ...entry,
        timestamp: new Date(entry.timestamp),
      });
      importedCount++;
    });

    data.waterEntries.forEach(entry => {
      store.addWaterEntry({
        ...entry,
        timestamp: new Date(entry.timestamp),
      });
      importedCount++;
    });

    data.goals.forEach(goal => {
      const { endDate, ...goalWithoutEndDate } = goal;
      store.addGoal({
        ...goalWithoutEndDate,
        startDate: new Date(goal.startDate),
        endDate: endDate ? new Date(endDate) : undefined,
      });
      importedCount++;
    });

    data.achievements.forEach(achievement => {
      store.unlockAchievement(achievement);
      importedCount++;
    });

    return { success: true, imported: importedCount, errors, warnings };
  }

  private static async parseData(file: File, format: ImportFormat): Promise<ImportData | null> {
    try {
      if (format === 'json') {
        return await this.parseJSONFile(file);
      } else if (format === 'csv') {
        return await this.parseCSVFile(file);
      }
      return null;
    } catch (error) {
      console.error('Error parsing data file:', error);
      return null;
    }
  }

  private static async parseJSONFile(file: File): Promise<ImportData> {
    const content = await file.text();
    return JSON.parse(content);
  }

  private static async parseCSVFile(file: File): Promise<ImportData> {
    // Basic CSV parsing - in a real app, use a robust library like PapaParse
    const content = await file.text();
    const lines = content.split('\n');
    const foodEntries: FoodEntry[] = [];
    // ... implement CSV parsing logic for other data types
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        foodEntries,
        waterEntries: [],
        goals: [],
        achievements: [],
      },
    };
  }
  
  static getSupportedExportFormats(): ExportFormat[] {
    return ['json', 'csv', 'xml', 'pdf'];
  }

  // Get supported import formats
  static getSupportedImportFormats(): ImportFormat[] {
    return ['json', 'csv'];
  }

  // Validate file format
  static validateFileFormat(file: File, format: ImportFormat): boolean {
    const validExtensions = {
      json: ['.json'],
      csv: ['.csv'],
    };

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return validExtensions[format].includes(extension);
  }
} 