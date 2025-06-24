import { barcodeService } from './barcode-service';

interface ExportData {
  version: string;
  timestamp: number;
  barcodeHistory: any[];
  barcodeFavorites: any[];
  mealPlans: any[];
  nutritionalGoals: any;
  goalProgress: any[];
  dietaryPreferences: any;
  groceryList: any[];
  mealPrepTemplates: any;
}

interface ExportOptions {
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
  data: any;
  options?: any;
}

interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface MigrationResult {
  success: boolean;
  migratedData: any;
  changes: string[];
}

interface PrivacySettings {
  dataRetentionDays: number;
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  encryptionEnabled: boolean;
  lastBackupDate?: number;
}

interface AnalyticsData {
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

interface ReportConfig {
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

interface ReportResult {
  data: any[];
  summary: {
    totalItems: number;
    dateRange: {
      start: string;
      end: string;
    };
    metrics: Record<string, number>;
  };
  chartData?: any;
}

class DataManagementService {
  private static instance: DataManagementService;
  private readonly CURRENT_VERSION = '1.0.0';
  private readonly VERSION_HISTORY = {
    '1.0.0': {
      requiredFields: ['version', 'timestamp', 'barcodeHistory', 'barcodeFavorites', 'mealPlans', 'nutritionalGoals', 'goalProgress', 'dietaryPreferences', 'groceryList', 'mealPrepTemplates'],
      migrations: []
    }
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
    return settings ? JSON.parse(settings) : null;
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
    filteredHistory.forEach(item => barcodeService.addToHistory(item));

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
        console.error('Auto backup failed:', error);
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
      console.error('Error exporting data:', error);
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

      // Import data
      await this.importBarcodeHistory(data.barcodeHistory);
      await this.importBarcodeFavorites(data.barcodeFavorites);
      await this.importMealPlans(data.mealPlans);
      await this.importNutritionalGoals(data.nutritionalGoals);
      await this.importGoalProgress(data.goalProgress);
      await this.importDietaryPreferences(data.dietaryPreferences);
      await this.importGroceryList(data.groceryList);
      await this.importMealPrepTemplates(data.mealPrepTemplates);

    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Failed to import data');
    }
  }

  private validateImportData(data: any): boolean {
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

  private async importBarcodeHistory(history: any[]): Promise<void> {
    // Clear existing history
    barcodeService.clearHistory();
    
    // Import new history
    for (const item of history) {
      if (item.barcode && item.data) {
        await barcodeService.lookupBarcode(item.barcode);
      }
    }
  }

  private async importBarcodeFavorites(favorites: any[]): Promise<void> {
    // Clear existing favorites
    barcodeService.clearFavorites();
    
    // Import new favorites
    for (const item of favorites) {
      if (item.barcode && item.data) {
        barcodeService.addToFavorites(item.barcode, item.data);
      }
    }
  }

  private async importMealPlans(mealPlans: any[]): Promise<void> {
    // Clear existing meal plans
    localStorage.removeItem('barcodeMealPlans');
    
    // Import new meal plans
    for (const plan of mealPlans) {
      if (plan.barcode && plan.data && plan.mealType && plan.plannedDate) {
        barcodeService.addToMealPlan(
          plan.barcode,
          plan.data,
          plan.mealType,
          plan.plannedDate
        );
      }
    }
  }

  private async importNutritionalGoals(goals: any): Promise<void> {
    if (goals && typeof goals === 'object') {
      barcodeService.setNutritionalGoals(goals);
    }
  }

  private async importGoalProgress(progress: any[]): Promise<void> {
    // Clear existing progress
    localStorage.removeItem('goalProgress');
    
    // Import new progress
    for (const item of progress) {
      if (item.date && item.actual && item.goal) {
        barcodeService.updateGoalProgress(item.date);
      }
    }
  }

  private async importDietaryPreferences(preferences: any): Promise<void> {
    if (preferences && typeof preferences === 'object') {
      barcodeService.setDietaryPreferences(preferences);
    }
  }

  private async importGroceryList(list: any[]): Promise<void> {
    // Clear existing grocery list
    localStorage.removeItem('groceryList');
    
    // Import new grocery list
    for (const item of list) {
      if (item.barcode && item.name) {
        barcodeService.updateGroceryItem(item.barcode, item);
      }
    }
  }

  private async importMealPrepTemplates(templates: any): Promise<void> {
    // Clear existing templates
    localStorage.removeItem('mealPrepTemplates');
    
    // Import new templates
    for (const [id, template] of Object.entries(templates)) {
      if (template && typeof template === 'object') {
        barcodeService.addMealPrepTemplate(template as any);
      }
    }
  }

  public validateData(data: any): DataValidationResult {
    const result: DataValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check for required fields
    const requiredFields = ['version', 'timestamp', 'barcodeHistory', 'barcodeFavorites', 'mealPlans', 'nutritionalGoals', 'goalProgress', 'dietaryPreferences', 'groceryList', 'mealPrepTemplates'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        result.isValid = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate version
    if (data.version && data.version !== this.CURRENT_VERSION) {
      result.warnings.push(`Data version (${data.version}) differs from current version (${this.CURRENT_VERSION})`);
    }

    // Validate timestamp
    if (data.timestamp && typeof data.timestamp !== 'number') {
      result.errors.push('Invalid timestamp format');
    }

    // Validate arrays
    const arrayFields = ['barcodeHistory', 'barcodeFavorites', 'mealPlans', 'goalProgress', 'groceryList'];
    for (const field of arrayFields) {
      if (data[field] && !Array.isArray(data[field])) {
        result.errors.push(`Invalid format for ${field}: expected array`);
      }
    }

    // Validate objects
    const objectFields = ['nutritionalGoals', 'dietaryPreferences', 'mealPrepTemplates'];
    for (const field of objectFields) {
      if (data[field] && typeof data[field] !== 'object') {
        result.errors.push(`Invalid format for ${field}: expected object`);
      }
    }

    return result;
  }

  public async recoverData(data: any): Promise<void> {
    try {
      // Create backup of current data
      const currentData = this.exportData();
      localStorage.setItem('data_backup', currentData);

      // Attempt to recover data
      const validationResult = this.validateData(data);
      if (!validationResult.isValid) {
        throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Import the data
      await this.importData(JSON.stringify(data));

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

  private async migrateData(data: any, fromVersion: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedData: { ...data },
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
        const currentVersion = versions[i];
        const nextVersion = versions[i + 1];
        const migrations = this.VERSION_HISTORY[nextVersion].migrations;

        for (const migration of migrations) {
          const migrationResult = await migration(result.migratedData);
          result.migratedData = migrationResult.data;
          result.changes.push(...migrationResult.changes);
        }
      }

      // Update version
      result.migratedData.version = this.CURRENT_VERSION;
      result.changes.push(`Updated version from ${fromVersion} to ${this.CURRENT_VERSION}`);

      return result;
    } catch (error) {
      result.success = false;
      result.changes.push(`Migration failed: ${error.message}`);
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
        itemCounts.get(key)!.count++;
      } else {
        itemCounts.set(key, { count: 1, name: item.data?.name || 'Unknown' });
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
      completedPlans: mealPlans.filter(plan => plan.plannedDate < now).length,
      upcomingPlans: mealPlans.filter(plan => plan.plannedDate >= now).length
    };

    // Calculate goal progress
    const currentProgress = goalProgress.length > 0 ? goalProgress[goalProgress.length - 1].actual : 0;
    const averageProgress = goalProgress.length > 0
      ? goalProgress.reduce((sum, item) => sum + item.actual, 0) / goalProgress.length
      : 0;

    // Calculate streak
    let streakDays = 0;
    const today = new Date().setHours(0, 0, 0, 0);
    for (let i = goalProgress.length - 1; i >= 0; i--) {
      const progressDate = new Date(goalProgress[i].date).setHours(0, 0, 0, 0);
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
        preferences: dietaryPreferences.preferences || [],
        restrictions: dietaryPreferences.restrictions || []
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
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  private getFilteredData(options: ExportOptions): any {
    const data: any = {
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

  private filterByDateRange(data: any[], dateRange?: { start: number; end: number }): any[] {
    if (!dateRange) return data;
    return data.filter(item => {
      const timestamp = item.timestamp || item.date || item.plannedDate;
      return timestamp >= dateRange.start && timestamp <= dateRange.end;
    });
  }

  private convertToCSV(data: any): Blob {
    const sections = Object.entries(data)
      .filter(([key]) => key !== 'version' && key !== 'timestamp' && key !== 'metadata');

    const csvRows: string[] = [];

    // Add metadata if present
    if (data.metadata) {
      csvRows.push('Metadata');
      Object.entries(data.metadata).forEach(([key, value]) => {
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

  private convertToPDF(data: any): Blob {
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
      const date = new Date(item.timestamp).toLocaleDateString();
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
      mealTypes.set(plan.mealType, (mealTypes.get(plan.mealType) || 0) + 1);
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
    const dates = progress.map(item => new Date(item.date).toLocaleDateString());
    const values = progress.map(item => item.actual);

    return {
      type: 'bar',
      title: 'Goal Progress',
      data: {
        labels: dates,
        datasets: [{
          label: 'Progress',
          data: values
        }]
      }
    };
  }

  public generateCustomReport(config: ReportConfig): ReportResult {
    try {
      let filteredData = this.applyFilters(config.filters);
      let processedData = this.processData(filteredData, config);
      let summary = this.generateSummary(processedData, config);
      let chartData = config.chartType ? this.generateChartData(processedData, config) : undefined;

      return {
        data: processedData,
        summary,
        chartData
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error('Failed to generate report');
    }
  }

  private applyFilters(filters: FilterCriteria): any[] {
    let data = [...barcodeService.getHistory()];

    if (filters.dateRange) {
      data = data.filter(item => {
        const timestamp = item.timestamp || item.date;
        return timestamp >= filters.dateRange!.start && timestamp <= filters.dateRange!.end;
      });
    }

    if (filters.categories) {
      data = data.filter(item => 
        filters.categories!.includes(item.data?.category)
      );
    }

    if (filters.nutritionalValues) {
      data = data.filter(item => {
        const value = item.data?.nutritionalInfo?.[filters.nutritionalValues!.type!];
        return value >= (filters.nutritionalValues!.min || 0) && 
               value <= (filters.nutritionalValues!.max || Infinity);
      });
    }

    if (filters.mealTypes) {
      data = data.filter(item => 
        filters.mealTypes!.includes(item.mealType)
      );
    }

    if (filters.customTags) {
      data = data.filter(item => 
        filters.customTags!.some(tag => item.tags?.includes(tag))
      );
    }

    return data;
  }

  private processData(data: any[], config: ReportConfig): any[] {
    let processed = [...data];

    // Group data if specified
    if (config.groupBy) {
      const groups = new Map();
      processed.forEach(item => {
        const key = item[config.groupBy!];
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(item);
      });
      processed = Array.from(groups.entries()).map(([key, items]) => ({
        [config.groupBy!]: key,
        items,
        count: items.length
      }));
    }

    // Sort data if specified
    if (config.sortBy) {
      processed.sort((a, b) => {
        const aValue = a[config.sortBy!];
        const bValue = b[config.sortBy!];
        const order = config.sortOrder === 'desc' ? -1 : 1;
        return aValue < bValue ? -1 * order : aValue > bValue ? 1 * order : 0;
      });
    }

    return processed;
  }

  private generateSummary(data: any[], config: ReportConfig): any {
    const summary: any = {
      totalItems: data.length,
      dateRange: {
        start: new Date(Math.min(...data.map(item => item.timestamp || item.date))).toISOString(),
        end: new Date(Math.max(...data.map(item => item.timestamp || item.date))).toISOString()
      },
      metrics: {}
    };

    // Calculate metrics
    config.metrics.forEach(metric => {
      if (metric === 'averageCalories') {
        summary.metrics.averageCalories = data.reduce((sum, item) => 
          sum + (item.data?.nutritionalInfo?.calories || 0), 0) / data.length;
      }
      if (metric === 'totalScans') {
        summary.metrics.totalScans = data.length;
      }
      if (metric === 'uniqueItems') {
        summary.metrics.uniqueItems = new Set(data.map(item => item.barcode)).size;
      }
    });

    return summary;
  }

  private generateChartData(data: any[], config: ReportConfig): any {
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

  private generateLineChartData(data: any[], config: ReportConfig): any {
    const timeData = new Map();
    const interval = this.getTimeInterval(config.timeInterval || 'daily');

    data.forEach(item => {
      const date = new Date(item.timestamp || item.date);
      const key = this.formatDateByInterval(date, interval);
      timeData.set(key, (timeData.get(key) || 0) + 1);
    });

    return {
      type: 'line',
      data: {
        labels: Array.from(timeData.keys()),
        datasets: [{
          label: 'Count',
          data: Array.from(timeData.values())
        }]
      }
    };
  }

  private generateBarChartData(data: any[], config: ReportConfig): any {
    const groupedData = new Map();
    
    data.forEach(item => {
      const key = item[config.groupBy || 'category'];
      groupedData.set(key, (groupedData.get(key) || 0) + 1);
    });

    return {
      type: 'bar',
      data: {
        labels: Array.from(groupedData.keys()),
        datasets: [{
          label: 'Count',
          data: Array.from(groupedData.values())
        }]
      }
    };
  }

  private generatePieChartData(data: any[], config: ReportConfig): any {
    const groupedData = new Map();
    
    data.forEach(item => {
      const key = item[config.groupBy || 'category'];
      groupedData.set(key, (groupedData.get(key) || 0) + 1);
    });

    return {
      type: 'pie',
      data: {
        labels: Array.from(groupedData.keys()),
        datasets: [{
          data: Array.from(groupedData.values())
        }]
      }
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
}

export const dataManagementService = DataManagementService.getInstance(); 