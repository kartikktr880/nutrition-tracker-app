import { logError } from '../utils/logger';

import { barcodeService } from './barcode-service';

// Add missing type definitions
interface MealPrepStep {
  order: number;
  description: string;
  duration: number;
  equipment?: string[];
  tips?: string[];
}

interface MealPrepInstructions {
  totalTime: number;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  steps: MealPrepStep[];
  equipment: string[];
  storage: {
    refrigerator: number;
    freezer: number;
  };
  reheating: string[];
}

interface ExportData {
  [key: string]: unknown;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface BarcodeItem {
  id: string;
  barcode: string;
  name: string;
  category?: string;
  nutritionalInfo?: unknown;
  mealType?: string;
  tags?: string[];
  data: unknown;
}

interface MealPlanItem {
  id: string;
  barcode: string;
  name: string;
  mealType: string;
  plannedDate: number;
  data: unknown;
}

function isBarcodeItem(item: unknown): item is BarcodeItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'barcode' in item &&
    'data' in item
  );
}

function isMealPlanItem(item: unknown): item is MealPlanItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'barcode' in item &&
    'data' in item &&
    'mealType' in item &&
    'plannedDate' in item
  );
}

interface BarcodeHistoryItem {
  barcode: string;
  data: unknown;
  mealType?: string;
  tags?: string[];
}

function isBarcodeHistoryItem(item: unknown): item is BarcodeHistoryItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'barcode' in item &&
    'data' in item
  );
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeMetadata: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
  sections: {
    barcodeHistory: boolean;
    barcodeFavorites: boolean;
    mealPlans: boolean;
    nutritionalGoals: boolean;
    goalProgress: boolean;
    dietaryPreferences: boolean;
    groceryList: boolean;
    mealPrepTemplates: boolean;
  };
}

interface ChartData {
  type: 'line' | 'bar' | 'pie';
  title: string;
  data: unknown;
  options?: unknown;
}

interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface MigrationResult {
  success: boolean;
  migratedData: unknown;
  changes: string[];
}

interface PrivacySettings {
  dataRetentionDays: number;
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  encryptionEnabled: boolean;
  lastBackupDate?: number;
}

export interface AnalyticsData {
  totalScans: number;
  uniqueItems: number;
  mostScannedItems: Array<{ barcode: string; count: number; name: string }>;
  mealPlanStats: {
    totalPlans: number;
    completedPlans: number;
    upcomingPlans: number;
  };
  goalProgress: {
    currentProgress: number;
    averageProgress: number;
    streakDays: number;
  };
  dietaryPreferences: {
    preferences: string[];
    restrictions: string[];
  };
  dataSize: {
    totalSize: number;
    breakdown: Record<string, number>;
  };
}

interface FilterCriteria {
  dateRange?: {
    start: number;
    end: number;
  };
  categories?: string[];
  nutritionalValues?: {
    min?: number;
    max?: number;
    type?: string;
  };
  mealTypes?: string[];
  customTags?: string[];
}

export interface ReportConfig {
  name: string;
  description: string;
  filters: FilterCriteria;
  metrics: string[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  chartType?: 'line' | 'bar' | 'pie';
  timeInterval?: 'daily' | 'weekly' | 'monthly';
}

export interface ReportResult {
  data: unknown[];
  summary: {
    totalItems: number;
    dateRange: {
      start: string;
      end: string;
    };
    metrics: Record<string, number>;
  };
  chartData?: unknown;
}

// Move these outside the class
const validMealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = typeof validMealTypes[number];
function isValidMealType(type: unknown): type is MealType {
  return typeof type === 'string' && validMealTypes.includes(type as MealType);
}

class DataManagementService {
  private static instance: DataManagementService;
  private readonly CURRENT_VERSION = '1.0.0';
  private readonly VERSION_HISTORY: { [key: string]: { requiredFields: string[]; migrations: unknown[] } } = {
    '1.0.0': { requiredFields: ['version', 'timestamp', 'barcodeHistory', 'barcodeFavorites', 'mealPlans', 'nutritionalGoals', 'goalProgress', 'dietaryPreferences', 'groceryList', 'mealPrepTemplates'], migrations: [] }
  };

  private constructor() {
    this.initializePrivacySettings();
  }

  private initializePrivacySettings(): void {
    const defaultSettings: PrivacySettings = {
      dataRetentionDays: 90,
      autoBackupEnabled: true,
      backupFrequency: 'weekly',
      encryptionEnabled: true
    };

    if (!localStorage.getItem('privacySettings')) {
      localStorage.setItem('privacySettings', JSON.stringify(defaultSettings));
    }
  }

  public getPrivacySettings(): PrivacySettings {
    const settings = localStorage.getItem('privacySettings');
    if (settings) {
      return JSON.parse(settings);
    }
    // Return default if not set
    return {
      dataRetentionDays: 90,
      autoBackupEnabled: true,
      backupFrequency: 'weekly',
      encryptionEnabled: true
    };
  }

  public updatePrivacySettings(settings: Partial<PrivacySettings>): void {
    const currentSettings = this.getPrivacySettings();
    const updatedSettings = { ...currentSettings, ...settings };
    localStorage.setItem('privacySettings', JSON.stringify(updatedSettings));
  }

  public async cleanupOldData(): Promise<void> {
    const settings = this.getPrivacySettings();
    if (!settings) return;

    const retentionDate = Date.now() - (settings.dataRetentionDays * 24 * 60 * 60 * 1000);
    
    // Cleanup barcode history
    const history = barcodeService.getHistory();
    const filteredHistory = history.filter(item => item.timestamp > retentionDate);
    barcodeService.clearHistory();
    filteredHistory.forEach(item => barcodeService.addToHistory(item.barcode, item.data));

    // Cleanup goal progress
    const progress = barcodeService.getGoalProgressHistory();
    const filteredProgress = progress.filter(item => item.date > retentionDate);
    localStorage.setItem('goalProgress', JSON.stringify(filteredProgress));
  }

  public async performAutoBackup(): Promise<void> {
    const settings = this.getPrivacySettings();
    if (!settings || !settings.autoBackupEnabled) return;

    const now = Date.now();
    const lastBackup = settings.lastBackupDate || 0;
    const backupInterval = this.getBackupInterval(settings.backupFrequency);

    if (now - lastBackup >= backupInterval) {
      try {
        const data = this.exportData();
        const backupKey = `auto_backup_${now}`;
        localStorage.setItem(backupKey, data);
        
        // Update last backup date
        this.updatePrivacySettings({ lastBackupDate: now });

        // Cleanup old backups (keep last 5)
        this.cleanupOldBackups();
      } catch (error) {
        logError('Auto backup failed:', error);
      }
    }
  }

  private getBackupInterval(frequency: 'daily' | 'weekly' | 'monthly'): number {
    switch (frequency) {
      case 'daily':
        return 24 * 60 * 60 * 1000;
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000;
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private cleanupOldBackups(): void {
    const backupKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('auto_backup_'))
      .sort()
      .reverse();

    // Keep only the last 5 backups
    if (backupKeys.length > 5) {
      backupKeys.slice(5).forEach(key => localStorage.removeItem(key));
    }
  }

  public exportData(): string {
    try {
      const exportData: ExportData = {
        version: this.CURRENT_VERSION,
        timestamp: Date.now(),
        barcodeHistory: barcodeService.getHistory(),
        barcodeFavorites: barcodeService.getFavorites(),
        mealPlans: barcodeService.getMealPlans(Date.now()),
        nutritionalGoals: barcodeService.getNutritionalGoals(),
        goalProgress: barcodeService.getGoalProgressHistory(),
        dietaryPreferences: barcodeService.getDietaryPreferences(),
        groceryList: barcodeService.getGroceryList(),
        mealPrepTemplates: barcodeService.getMealPrepTemplates()
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logError('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  public async importData(jsonData: string): Promise<void> {
    try {
      const data: ExportData = JSON.parse(jsonData);
      // Version check
      if (data.version !== this.CURRENT_VERSION) {
        throw new Error('Incompatible data version');
      }
      // Validate data structure
      if (!this.validateImportData(data)) {
        throw new Error('Invalid data structure');
      }
      // Import data with type checks
      if (Array.isArray(data.barcodeHistory)) {
        await this.importBarcodeHistory(data.barcodeHistory);
      }
      if (Array.isArray(data.barcodeFavorites)) {
        await this.importBarcodeFavorites(data.barcodeFavorites);
      }
      if (Array.isArray(data.mealPlans)) {
        await this.importMealPlans(data.mealPlans);
      }
      if (typeof data.nutritionalGoals === 'object' && data.nutritionalGoals !== null) {
        await this.importNutritionalGoals(data.nutritionalGoals);
      }
      if (Array.isArray(data.goalProgress)) {
        await this.importGoalProgress(data.goalProgress);
      }
      if (typeof data.dietaryPreferences === 'object' && data.dietaryPreferences !== null) {
        await this.importDietaryPreferences(data.dietaryPreferences);
      }
      if (Array.isArray(data.groceryList)) {
        await this.importGroceryList(data.groceryList);
      }
      if (typeof data.mealPrepTemplates === 'object' && data.mealPrepTemplates !== null) {
        await this.importMealPrepTemplates(data.mealPrepTemplates);
      }
    } catch (error) {
      logError('Error importing data:', error);
      throw new Error('Failed to import data');
    }
  }

  private validateImportData(data: ExportData): boolean {
    return (
      data &&
      typeof data === 'object' &&
      Array.isArray(data.barcodeHistory) &&
      Array.isArray(data.barcodeFavorites) &&
      Array.isArray(data.mealPlans) &&
      typeof data.nutritionalGoals === 'object' &&
      Array.isArray(data.goalProgress) &&
      typeof data.dietaryPreferences === 'object' &&
      Array.isArray(data.groceryList) &&
      typeof data.mealPrepTemplates === 'object'
    );
  }

  private async importBarcodeHistory(history: unknown[]): Promise<void> {
    // Clear existing history
    barcodeService.clearHistory();
    
    // Import new history
    for (const item of history) {
      if (isBarcodeItem(item)) {
        if (item.barcode && item.data) {
          await barcodeService.lookupBarcode(item.barcode);
        }
      }
    }
  }

  private async importBarcodeFavorites(favorites: unknown[]): Promise<void> {
    // Clear existing favorites
    barcodeService.clearFavorites();
    
    // Import new favorites
    for (const item of favorites) {
      if (isBarcodeItem(item)) {
        if (item.barcode && item.data && typeof item.data === 'object' && item.data !== null && 'name' in item.data && 'brand' in item.data && 'nutrition' in item.data) {
          barcodeService.addToFavorites(item.barcode, item.data as { name: string; brand: string; nutrition: Record<string, number> });
        }
      }
    }
  }

  private async importMealPlans(mealPlans: unknown[]): Promise<void> {
    // Clear existing meal plans
    localStorage.removeItem('barcodeMealPlans');
    // Import new meal plans
    for (const plan of mealPlans) {
      if (isMealPlanItem(plan)) {
        if (
          plan.barcode &&
          plan.data &&
          typeof plan.data === 'object' &&
          plan.data !== null &&
          'name' in plan.data &&
          'brand' in plan.data &&
          'nutrition' in plan.data &&
          isValidMealType(plan.mealType)
        ) {
          barcodeService.addToMealPlan(
            plan.barcode,
            plan.data as { name: string; brand: string; nutrition: Record<string, number> },
            plan.mealType as MealType,
            plan.plannedDate
          );
        }
      }
    }
  }

  private async importNutritionalGoals(goals: unknown): Promise<void> {
    // Map flat NutritionalGoal to nested structure if needed
    if (isNutritionalGoal(goals)) {
      const mappedGoals = {
        calories: { target: goals.calories, min: 0, max: goals.calories },
        protein: { target: goals.protein, min: 0, max: goals.protein },
        carbs: { target: goals.carbs, min: 0, max: goals.carbs },
        fat: { target: goals.fat, min: 0, max: goals.fat },
      };
      barcodeService.setNutritionalGoals(mappedGoals);
    }
  }

  private async importGoalProgress(progress: unknown[]): Promise<void> {
    // Clear existing progress
    localStorage.removeItem('goalProgress');
    
    // Import new progress
    for (const item of progress) {
      if (item && typeof item === 'object' && 'date' in item && 'actual' in item && 'goal' in item) {
        const progressItem = item as { date: number; actual: { calories: number }; goal: { calories: number } };
        if (progressItem.date && progressItem.actual && progressItem.goal) {
          barcodeService.updateGoalProgress(progressItem.date);
        }
      }
    }
  }

  private async importDietaryPreferences(preferences: unknown): Promise<void> {
    // Map to expected shape if needed
    if (isDietaryPreference(preferences)) {
      const mappedPreferences = {
        restrictions: preferences.restrictions,
        allergies: preferences.allergies,
        culturalPreferences: preferences.culturalPreferences,
        seasonalPreferences: Array.isArray(preferences.seasonalPreferences) ? false : preferences.seasonalPreferences,
      };
      barcodeService.setDietaryPreferences(mappedPreferences);
    }
  }

  private async importGroceryList(list: unknown[]): Promise<void> {
    // Clear existing grocery list
    localStorage.removeItem('groceryList');
    
    // Import new grocery list
    for (const item of list) {
      if (item && typeof item === 'object' && 'barcode' in item && 'name' in item) {
        const groceryItem = item as BarcodeItem;
        if (groceryItem.barcode && groceryItem.name) {
          barcodeService.updateGroceryItem(groceryItem.barcode, groceryItem);
        }
      }
    }
  }

  private async importMealPrepTemplates(templates: unknown): Promise<void> {
    if (templates && typeof templates === 'object') {
      for (const [_id, template] of Object.entries(templates)) {
        if (isMealPrepTemplate(template)) {
          // Convert string instructions to MealPrepInstructions object
          let instructions: MealPrepInstructions;
          if (typeof template.instructions === 'string') {
            instructions = {
              totalTime: 0,
              prepTime: 0,
              cookTime: 0,
              servings: 1,
              difficulty: 'easy',
              steps: [
                {
                  order: 1,
                  description: template.instructions,
                  duration: 0,
                },
              ],
              equipment: [],
              storage: { refrigerator: 0, freezer: 0 },
              reheating: [],
            };
          } else {
            // Assume it's already a MealPrepInstructions object
            instructions = template.instructions as MealPrepInstructions;
          }
          
          // Convert string array ingredients to object array
          let ingredients: { name: string; amount: number; unit: string }[];
          if (Array.isArray(template.ingredients) && typeof template.ingredients[0] === 'string') {
            ingredients = template.ingredients.map((name: string) => ({ name, amount: 1, unit: '' }));
          } else {
            ingredients = template.ingredients as unknown as { name: string; amount: number; unit: string }[];
          }
          
          // Ensure nutrition object has proper structure
          let nutrition: { calories: number; protein: number; carbs: number; fat: number };
          if (!template.nutrition || typeof template.nutrition !== 'object') {
            nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
          } else {
            nutrition = {
              calories: typeof template.nutrition.calories === 'number' ? template.nutrition.calories : 0,
              protein: typeof template.nutrition.protein === 'number' ? template.nutrition.protein : 0,
              carbs: typeof template.nutrition.carbs === 'number' ? template.nutrition.carbs : 0,
              fat: typeof template.nutrition.fat === 'number' ? template.nutrition.fat : 0,
            };
          }
          
          const mappedTemplate = {
            id: (_id as string) || '',
            name: typeof template.name === 'string' ? template.name : '',
            instructions,
            ingredients,
            nutrition,
          };
          barcodeService.addMealPrepTemplate(mappedTemplate);
        }
      }
    }
  }

  public validateData(_data: ExportData): DataValidationResult {
    const result: DataValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check for required fields
    const requiredFields = ['version', 'timestamp', 'barcodeHistory', 'barcodeFavorites', 'mealPlans', 'nutritionalGoals', 'goalProgress', 'dietaryPreferences', 'groceryList', 'mealPrepTemplates'];
    for (const field of requiredFields) {
      if (!(field in _data)) {
        result.isValid = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate version
    if (_data.version && _data.version !== this.CURRENT_VERSION) {
      result.warnings.push(`Data version (${_data.version}) differs from current version (${this.CURRENT_VERSION})`);
    }

    // Validate timestamp
    if (_data.timestamp && typeof _data.timestamp !== 'number') {
      result.errors.push('Invalid timestamp format');
    }

    // Validate arrays
    const arrayFields = ['barcodeHistory', 'barcodeFavorites', 'mealPlans', 'goalProgress', 'groceryList'];
    for (const field of arrayFields) {
      if (_data[field] && !Array.isArray(_data[field])) {
        // Type guard for data access
        const fieldValue = _data[field];
        if (typeof fieldValue === 'object' && fieldValue !== null) {
          // Process object field
        }
      }
    }

    // Validate objects
    const objectFields = ['nutritionalGoals', 'dietaryPreferences', 'mealPrepTemplates'];
    for (const field of objectFields) {
      if (_data[field] && typeof _data[field] !== 'object') {
        result.errors.push(`Invalid format for ${field}: expected object`);
      }
    }

    return result;
  }

  public async recoverData(_data: ExportData): Promise<void> {
    try {
      // Create backup of current data
      const currentData = this.exportData();
      localStorage.setItem('data_backup', currentData);

      // Attempt to recover data
      const validationResult = this.validateData(_data);
      if (!validationResult.isValid) {
        throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Import the data
      await this.importData(JSON.stringify(_data));

      // If successful, remove backup
      localStorage.removeItem('data_backup');
    } catch (error) {
      // Restore from backup if recovery fails
      const backup = localStorage.getItem('data_backup');
      if (backup) {
        await this.importData(backup);
        localStorage.removeItem('data_backup');
      }
      throw error;
    }
  }

  private async migrateData(_data: ExportData, fromVersion: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedData: { ..._data },
      changes: []
    };

    try {
      // Get version history
      const versions = Object.keys(this.VERSION_HISTORY).sort();
      const fromIndex = versions.indexOf(fromVersion);
      const toIndex = versions.indexOf(this.CURRENT_VERSION);

      if (fromIndex === -1 || toIndex === -1) {
        throw new Error('Invalid version number');
      }

      // Apply migrations in sequence
      for (let i = fromIndex; i < toIndex; i++) {
        const _currentVersion = versions[i];
        const nextVersion = versions[i + 1];
        const migrations = this.VERSION_HISTORY[nextVersion].migrations;

        for (const migration of migrations) {
          if (typeof migration === 'function') {
            const migrationResult = await migration(result.migratedData);
            if (migrationResult) {
              result.migratedData = migrationResult;
              result.changes.push(`Migration applied: ${migration.name}`);
            }
          }
        }
      }

      // Update version
      if (result.migratedData && typeof result.migratedData === 'object' && result.migratedData !== null) {
        (result.migratedData as { [key: string]: unknown }).version = this.CURRENT_VERSION;
      }
      result.changes.push(`Updated version from ${fromVersion} to ${this.CURRENT_VERSION}`);

      return result;
    } catch (error) {
      result.success = false;
      result.changes.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  public getVersionInfo(): { currentVersion: string; supportedVersions: string[] } {
    return {
      currentVersion: this.CURRENT_VERSION,
      supportedVersions: Object.keys(this.VERSION_HISTORY)
    };
  }

  public getAnalyticsData(): AnalyticsData {
    const barcodeHistory = barcodeService.getHistory();
    const barcodeFavorites = barcodeService.getFavorites();
    const mealPlans = barcodeService.getMealPlans(Date.now());
    const nutritionalGoals = barcodeService.getNutritionalGoals();
    const goalProgress = barcodeService.getGoalProgressHistory();
    const dietaryPreferences = barcodeService.getDietaryPreferences();

    // Calculate most scanned items
    const itemCounts = new Map<string, { count: number; name: string }>();
    barcodeHistory.forEach(item => {
      const key = item.barcode;
      if (itemCounts.has(key)) {
        const itemCount = itemCounts.get(key);
        if (itemCount) itemCount.count++;
      } else {
        const name = isBarcodeItem(item.data) ? item.data.name : 'Unknown';
        itemCounts.set(key, { count: 1, name });
      }
    });

    const mostScannedItems = Array.from(itemCounts.entries())
      .map(([barcode, data]) => ({ barcode, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate meal plan statistics
    const now = Date.now();
    const mealPlanStats = {
      totalPlans: mealPlans.length,
      completedPlans: mealPlans.filter(plan => isMealPlanItem(plan) && typeof plan.plannedDate === 'number' && plan.plannedDate < now).length,
      upcomingPlans: mealPlans.filter(plan => isMealPlanItem(plan) && typeof plan.plannedDate === 'number' && plan.plannedDate >= now).length
    };

    // Calculate goal progress
    const currentProgress = goalProgress.length > 0 ? (goalProgress[goalProgress.length - 1].actual as { calories: number }).calories : 0;
    const averageProgress = goalProgress.length > 0
      ? goalProgress.reduce((sum, item) => sum + (item.actual as { calories: number }).calories, 0) / goalProgress.length
      : 0;

    // Calculate streak
    let streakDays = 0;
    const today = new Date().setHours(0, 0, 0, 0);
    for (let i = goalProgress.length - 1; i >= 0; i--) {
      const progressDate = new Date((goalProgress[i].date as number)).setHours(0, 0, 0, 0);
      if (progressDate === today - streakDays * 24 * 60 * 60 * 1000) {
        streakDays++;
      } else {
        break;
      }
    }

    // Calculate data size
    const dataSize = {
      totalSize: 0,
      breakdown: {
        barcodeHistory: 0,
        barcodeFavorites: 0,
        mealPlans: 0,
        nutritionalGoals: 0,
        goalProgress: 0,
        dietaryPreferences: 0
      }
    };

    // Calculate sizes
    dataSize.breakdown.barcodeHistory = new Blob([JSON.stringify(barcodeHistory)]).size;
    dataSize.breakdown.barcodeFavorites = new Blob([JSON.stringify(barcodeFavorites)]).size;
    dataSize.breakdown.mealPlans = new Blob([JSON.stringify(mealPlans)]).size;
    dataSize.breakdown.nutritionalGoals = new Blob([JSON.stringify(nutritionalGoals)]).size;
    dataSize.breakdown.goalProgress = new Blob([JSON.stringify(goalProgress)]).size;
    dataSize.breakdown.dietaryPreferences = new Blob([JSON.stringify(dietaryPreferences)]).size;

    dataSize.totalSize = Object.values(dataSize.breakdown).reduce((sum, size) => sum + size, 0);

    return {
      totalScans: barcodeHistory.length,
      uniqueItems: itemCounts.size,
      mostScannedItems,
      mealPlanStats,
      goalProgress: {
        currentProgress,
        averageProgress,
        streakDays
      },
      dietaryPreferences: {
        preferences: Array.isArray(dietaryPreferences?.culturalPreferences) ? dietaryPreferences.culturalPreferences : [],
        restrictions: Array.isArray(dietaryPreferences?.restrictions) ? dietaryPreferences.restrictions : []
      },
      dataSize
    };
  }

  public exportDataWithOptions(options: ExportOptions): string | Blob {
    try {
      const data = this.getFilteredData(options);
      
      switch (options.format) {
        case 'csv':
          return this.convertToCSV(data);
        case 'pdf':
          return this.convertToPDF(data);
        default:
          return JSON.stringify(data, null, 2);
      }
    } catch (error) {
      logError('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  private getFilteredData(options: ExportOptions): { [key: string]: unknown } {
    const data: { [key: string]: unknown } = {
      version: this.CURRENT_VERSION,
      timestamp: Date.now()
    };

    if (options.includeMetadata) {
      data.metadata = {
        exportDate: new Date().toISOString(),
        format: options.format,
        sections: Object.entries(options.sections)
          .filter(([_, included]) => included)
          .map(([section]) => section)
      };
    }

    if (options.sections.barcodeHistory) {
      data.barcodeHistory = this.filterByDateRange(
        barcodeService.getHistory(),
        options.dateRange
      );
    }

    if (options.sections.barcodeFavorites) {
      data.barcodeFavorites = barcodeService.getFavorites();
    }

    if (options.sections.mealPlans) {
      data.mealPlans = this.filterByDateRange(
        barcodeService.getMealPlans(Date.now()),
        options.dateRange
      );
    }

    if (options.sections.nutritionalGoals) {
      data.nutritionalGoals = barcodeService.getNutritionalGoals();
    }

    if (options.sections.goalProgress) {
      data.goalProgress = this.filterByDateRange(
        barcodeService.getGoalProgressHistory(),
        options.dateRange
      );
    }

    if (options.sections.dietaryPreferences) {
      data.dietaryPreferences = barcodeService.getDietaryPreferences();
    }

    if (options.sections.groceryList) {
      data.groceryList = barcodeService.getGroceryList();
    }

    if (options.sections.mealPrepTemplates) {
      data.mealPrepTemplates = barcodeService.getMealPrepTemplates();
    }

    return data;
  }

  private filterByDateRange(data: unknown[], dateRange?: { start: number; end: number }): unknown[] {
    if (!dateRange) return data;
    return data.filter(item => {
      // Use timestamp if available, otherwise fallback to 0
      const timestamp = typeof item === 'object' && item !== null && 'timestamp' in item && typeof (item as { timestamp: number }).timestamp === 'number' ? (item as { timestamp: number }).timestamp : 0;
      return timestamp >= dateRange.start && timestamp <= dateRange.end;
    });
  }

  private convertToCSV(data: unknown): Blob {
    if (typeof data !== 'object' || data === null) {
      return new Blob(['Invalid data'], { type: 'text/csv' });
    }
    const sections = Object.entries(data)
      .filter(([key]) => key !== 'version' && key !== 'timestamp' && key !== 'metadata');

    const csvRows: string[] = [];

    // Add metadata if present
    if ('metadata' in data && typeof data.metadata === 'object' && data.metadata !== null) {
      csvRows.push('Metadata');
      Object.entries(data.metadata as Record<string, unknown>).forEach(([key, value]) => {
        csvRows.push(`${key},${value}`);
      });
      csvRows.push('');
    }

    // Process each section
    sections.forEach(([section, items]) => {
      if (Array.isArray(items)) {
        if (items.length > 0) {
          csvRows.push(section);
          const headers = Object.keys(items[0]);
          csvRows.push(headers.join(','));
          items.forEach(item => {
            csvRows.push(Object.values(item).join(','));
          });
          csvRows.push('');
        }
      }
    });

    return new Blob([csvRows.join('\n')], { type: 'text/csv' });
  }

  private convertToPDF(_data: unknown): Blob {
    // This is a placeholder for PDF conversion
    // In a real implementation, you would use a PDF library like jsPDF
    return new Blob(['PDF conversion not implemented'], { type: 'application/pdf' });
  }

  public getChartData(type: 'barcode' | 'mealPlan' | 'goalProgress'): ChartData {
    switch (type) {
      case 'barcode':
        return this.getBarcodeChartData();
      case 'mealPlan':
        return this.getMealPlanChartData();
      case 'goalProgress':
        return this.getGoalProgressChartData();
      default:
        throw new Error('Invalid chart type');
    }
  }

  private getBarcodeChartData(): ChartData {
    const history = barcodeService.getHistory();
    const dailyScans = new Map<string, number>();

    history.forEach(item => {
      const date = new Date(typeof item === 'object' && item !== null && 'timestamp' in item && typeof (item as { timestamp: number }).timestamp === 'number' ? (item as { timestamp: number }).timestamp : 0).toLocaleDateString();
      dailyScans.set(date, (dailyScans.get(date) || 0) + 1);
    });

    return {
      type: 'line',
      title: 'Daily Barcode Scans',
      data: {
        labels: Array.from(dailyScans.keys()),
        datasets: [{
          label: 'Scans',
          data: Array.from(dailyScans.values())
        }]
      }
    };
  }

  private getMealPlanChartData(): ChartData {
    const mealPlans = barcodeService.getMealPlans(Date.now());
    const mealTypes = new Map<string, number>();

    mealPlans.forEach(plan => {
      let mealType = '';
      if (typeof plan === 'object' && plan !== null && 'mealType' in plan && typeof (plan as { mealType?: unknown }).mealType === 'string') {
        mealType = (plan as { mealType: string }).mealType;
      }
      mealTypes.set(mealType, (mealTypes.get(mealType) || 0) + 1);
    });

    return {
      type: 'pie',
      title: 'Meal Plan Distribution',
      data: {
        labels: Array.from(mealTypes.keys()),
        datasets: [{
          data: Array.from(mealTypes.values())
        }]
      }
    };
  }

  private getGoalProgressChartData(): ChartData {
    const progress = barcodeService.getGoalProgressHistory();
    const dates = progress.map(item => new Date(typeof item === 'object' && item !== null && 'date' in item && typeof (item as { date: number }).date === 'number' ? (item as { date: number }).date : 0).toLocaleDateString());
    const values = progress.map(item => (typeof item === 'object' && item !== null && 'actual' in item && typeof (item as { actual: { calories: number } }).actual === 'object' ? (item as { actual: { calories: number } }).actual.calories : 0));

    return {
      type: 'bar',
      title: 'Goal Progress',
      data: {
        labels: dates,
        datasets: [{
          label: 'Calories',
          data: values
        }]
      }
    };
  }

  public generateCustomReport(config: ReportConfig): ReportResult {
    try {
      const filteredData = this.applyFilters(config.filters);
      const processedData = this.processData(filteredData, config);
      const summary = this.generateSummary(processedData, config);
      const chartData = config.chartType ? this.generateChartData(processedData, config) : undefined;

      return {
        data: processedData,
        summary,
        chartData
      };
    } catch (error) {
      logError('Error generating report:', error);
      throw new Error('Failed to generate report');
    }
  }

  private applyFilters(filters: FilterCriteria): unknown[] {
    let data = [...barcodeService.getHistory()];

    if (filters.dateRange) {
      data = data.filter(item => {
        const timestamp = typeof item === 'object' && item !== null && 'timestamp' in item && typeof (item as { timestamp: number }).timestamp === 'number'
          ? (item as { timestamp: number }).timestamp
          : 0;
        if (!filters.dateRange) return false;
        return timestamp >= filters.dateRange.start && timestamp <= filters.dateRange.end;
      });
    }

    if (filters.categories) {
      data = data.filter(item => {
        let category = '';
        if (isBarcodeItem(item) && typeof item.data === 'object' && item.data !== null && 'category' in item.data && typeof (item.data as { category?: string }).category === 'string') {
          category = (item.data as { category: string }).category;
        }
        return Array.isArray(filters.categories) && filters.categories.includes(category);
      });
    }

    if (filters.nutritionalValues) {
      data = data.filter(item => {
        let nutritionalInfo: Record<string, unknown> | undefined;
        if (isBarcodeItem(item) && typeof item.data === 'object' && item.data !== null && 'nutritionalInfo' in item.data && typeof (item.data as { nutritionalInfo?: Record<string, unknown> }).nutritionalInfo === 'object') {
          nutritionalInfo = (item.data as { nutritionalInfo: Record<string, unknown> }).nutritionalInfo;
        }
        const value = nutritionalInfo && filters.nutritionalValues && filters.nutritionalValues.type ? nutritionalInfo[filters.nutritionalValues.type] : undefined;
        if (typeof value !== 'number') return false;
        if (filters.nutritionalValues && filters.nutritionalValues.min !== undefined && value < filters.nutritionalValues.min) return false;
        if (filters.nutritionalValues && filters.nutritionalValues.max !== undefined && value > filters.nutritionalValues.max) return false;
        return true;
      });
    }

    if (filters.mealTypes) {
      data = data.filter(item => {
        let mealType = '';
        if (isBarcodeItem(item) && typeof item.mealType === 'string') {
          mealType = item.mealType;
        }
        return Array.isArray(filters.mealTypes) && filters.mealTypes.includes(mealType);
      });
    }

    if (filters.customTags) {
      data = data.filter(item => {
        let tags: string[] = [];
        if (isBarcodeItem(item) && Array.isArray(item.tags)) {
          tags = item.tags;
        }
        return Array.isArray(filters.customTags) && tags.some(tag => filters.customTags?.includes(tag));
      });
    }

    return data;
  }

  private processData(data: unknown[], config: ReportConfig): unknown[] {
    let processed = [...data];

    // Group data if specified
    if (config.groupBy) {
      const groups = new Map();
      processed.forEach(item => {
        let key = '';
        if (typeof item === 'object' && item !== null && typeof config.groupBy === 'string' && config.groupBy in item) {
          key = String((item as { [key: string]: unknown })[config.groupBy]);
        }
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(item);
      });
      processed = Array.from(groups.entries()).map(([key, items]) => ({
        [config.groupBy ?? '']: key,
        items,
        count: items.length
      }));
    }

    // Sort data if specified
    if (config.sortBy) {
      processed.sort((a, b) => {
        let aValue: unknown = '';
        let bValue: unknown = '';
        if (typeof a === 'object' && a !== null && typeof config.sortBy === 'string' && config.sortBy in a) {
          aValue = (a as { [key: string]: unknown })[config.sortBy];
        }
        if (typeof b === 'object' && b !== null && typeof config.sortBy === 'string' && config.sortBy in b) {
          bValue = (b as { [key: string]: unknown })[config.sortBy];
        }
        const order = config.sortOrder === 'desc' ? -1 : 1;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue) * order;
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue < bValue ? -1 : aValue > bValue ? 1 : 0) * order;
        }
        return 0;
      });
    }

    return processed;
  }

  private generateSummary(data: unknown[], config: ReportConfig): ReportResult['summary'] {
    // Extract all possible date values
    const dateValues: number[] = data.map(item => {
      if (typeof item === 'object' && item !== null) {
        if ('timestamp' in item && typeof (item as { timestamp: number }).timestamp === 'number') {
          return (item as { timestamp: number }).timestamp;
        }
        if ('date' in item && typeof (item as { date: number }).date === 'number') {
          return (item as { date: number }).date;
        }
        if ('plannedDate' in item && typeof (item as { plannedDate: number }).plannedDate === 'number') {
          return (item as { plannedDate: number }).plannedDate;
        }
      }
      return 0;
    });
    const minDate = new Date(Math.min(...dateValues)).toISOString();
    const maxDate = new Date(Math.max(...dateValues)).toISOString();

    const metrics: Record<string, number> = {};
    config.metrics.forEach(metric => {
      if (metric === 'averageCalories') {
        metrics.averageCalories = 0;
      }
      if (metric === 'totalScans') {
        metrics.totalScans = data.length;
      }
      if (metric === 'uniqueItems') {
        metrics.uniqueItems = new Set(data.map(item => (typeof item === 'object' && item !== null && 'barcode' in item && typeof (item as BarcodeItem).barcode === 'string' ? (item as BarcodeItem).barcode : ''))).size;
      }
    });

    return {
      totalItems: data.length,
      dateRange: {
        start: minDate,
        end: maxDate
      },
      metrics
    };
  }

  private generateChartData(data: unknown[], config: ReportConfig): unknown {
    switch (config.chartType) {
      case 'line':
        return this.generateLineChartData(data, config);
      case 'bar':
        return this.generateBarChartData(data, config);
      case 'pie':
        return this.generatePieChartData(data, config);
      default:
        return undefined;
    }
  }

  private generateLineChartData(data: unknown[], config: ReportConfig): unknown {
    const timeData = new Map();
    const interval = this.getTimeInterval(config.timeInterval || 'daily');

    data.forEach(item => {
      const date = new Date(
        typeof item === 'object' && item !== null && 'timestamp' in item && typeof (item as { timestamp: number }).timestamp === 'number'
          ? (item as { timestamp: number }).timestamp
          : typeof item === 'object' && item !== null && 'date' in item && typeof (item as { date: number }).date === 'number'
          ? (item as { date: number }).date
          : typeof item === 'object' && item !== null && 'plannedDate' in item && typeof (item as { plannedDate: number }).plannedDate === 'number'
          ? (item as { plannedDate: number }).plannedDate
          : 0
      );
      const key = this.formatDateByInterval(date, interval);
      timeData.set(key, (timeData.get(key) || 0) + 1);
    });

    return {
      type: 'line',
      data: {
        labels: Array.from(timeData.keys()),
        datasets: [
          {
            label: 'Count',
            data: Array.from(timeData.values()),
          },
        ],
      },
    };
  }

  private generateBarChartData(data: unknown[], config: ReportConfig): ChartData {
    const groupedData = new Map<string, number>();
    data.forEach(item => {
      const key = typeof item === 'object' && item !== null && config.groupBy && config.groupBy in item
        ? String((item as { [key: string]: unknown })[config.groupBy ?? ''])
        : '';
      groupedData.set(key, (groupedData.get(key) || 0) + 1);
    });
    return {
      type: 'bar',
      title: config.name,
      data: {
        labels: Array.from(groupedData.keys()),
        datasets: [
          {
            label: 'Count',
            data: Array.from(groupedData.values()),
          },
        ],
      },
    };
  }

  private generatePieChartData(data: unknown[], config: ReportConfig): ChartData {
    const groupedData = new Map<string, number>();
    data.forEach(item => {
      const key = typeof item === 'object' && item !== null && config.groupBy && config.groupBy in item
        ? String((item as { [key: string]: unknown })[config.groupBy ?? ''])
        : '';
      groupedData.set(key, (groupedData.get(key) || 0) + 1);
    });
    return {
      type: 'pie',
      title: config.name,
      data: {
        labels: Array.from(groupedData.keys()),
        datasets: [
          {
            data: Array.from(groupedData.values()),
          },
        ],
      },
    };
  }

  private getTimeInterval(interval: 'daily' | 'weekly' | 'monthly'): number {
    switch (interval) {
      case 'daily':
        return 24 * 60 * 60 * 1000;
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000;
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  private formatDateByInterval(date: Date, interval: number): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (interval >= 30 * 24 * 60 * 60 * 1000) {
      return `${year}-${month}`;
    } else if (interval >= 7 * 24 * 60 * 60 * 1000) {
      const week = Math.ceil(day / 7);
      return `${year}-W${week}`;
    } else {
      return `${year}-${month}-${day}`;
    }
  }

  // Refactored logic for processing barcode history items
  private processBarcodeHistoryItem(
    item: unknown,
    filters: { customTags?: string[] } = {}
  ): void {
    if (!isBarcodeHistoryItem(item)) return;
    let tags: string[] = [];
    // Tags
    if (Array.isArray(item.tags)) {
      tags = item.tags as string[];
    }
    // Filtering by customTags
    if (Array.isArray(filters.customTags) && tags.some(tag => filters.customTags?.includes(tag))) {
      // ... filtering logic ...
    }
    // Grouping
    // (Removed unused 'key' assignment and 'config' parameter)
    // Sorting
    // ... sorting logic ...
  }

  public static getInstance(): DataManagementService {
    if (!DataManagementService.instance) {
      DataManagementService.instance = new DataManagementService();
    }
    return DataManagementService.instance;
  }
}

// Add type guards at the top
interface NutritionalGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
function isNutritionalGoal(goal: unknown): goal is NutritionalGoal {
  return (
    typeof goal === 'object' &&
    goal !== null &&
    'calories' in goal && typeof (goal as { calories: unknown }).calories === 'number' &&
    'protein' in goal && typeof (goal as { protein: unknown }).protein === 'number' &&
    'carbs' in goal && typeof (goal as { carbs: unknown }).carbs === 'number' &&
    'fat' in goal && typeof (goal as { fat: unknown }).fat === 'number'
  );
}

interface DietaryPreference {
  restrictions: string[];
  allergies: string[];
  culturalPreferences: string[];
  seasonalPreferences: string[];
}
function isDietaryPreference(pref: unknown): pref is DietaryPreference {
  return (
    typeof pref === 'object' &&
    pref !== null &&
    Array.isArray((pref as { restrictions?: unknown }).restrictions) &&
    Array.isArray((pref as { allergies?: unknown }).allergies) &&
    Array.isArray((pref as { culturalPreferences?: unknown }).culturalPreferences) &&
    Array.isArray((pref as { seasonalPreferences?: unknown }).seasonalPreferences)
  );
}

interface MealPrepTemplate {
  name?: string;
  instructions: string;
  ingredients: string[];
  nutrition: Record<string, number>;
}
function isMealPrepTemplate(template: unknown): template is MealPrepTemplate {
  return (
    typeof template === 'object' &&
    template !== null &&
    'instructions' in template && typeof (template as { instructions?: unknown }).instructions === 'string' &&
    'ingredients' in template && Array.isArray((template as { ingredients?: unknown }).ingredients) &&
    'nutrition' in template && typeof (template as { nutrition?: unknown }).nutrition === 'object'
  );
}

export const dataManagementService = DataManagementService.getInstance(); 