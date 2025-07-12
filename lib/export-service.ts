import { logError, logInfo } from '../utils/logger';

import { dataManagementService } from './data-management-service';

export interface ExportSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  format: 'json' | 'csv' | 'pdf' | 'excel';
  emailRecipients: string[];
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
  active: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'json' | 'csv' | 'pdf' | 'excel';
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
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface ExportHistory {
  id: string;
  scheduleId?: string;
  templateId?: string;
  timestamp: number;
  status: 'success' | 'failed';
  format: 'json' | 'csv' | 'pdf' | 'excel';
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
  error?: string;
  fileSize?: number;
  recipients?: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface ExportValidationRules {
  maxFileSize?: number; // in bytes
  maxRecipients?: number;
  allowedFormats?: ('json' | 'csv' | 'pdf' | 'excel')[];
  requiredSections?: (keyof ExportSchedule['sections'])[];
  maxSections?: number;
}

interface ExportResult {
  success: boolean;
  error?: string;
}

class ExportService {
  private static instance: ExportService;
  private schedules: Map<string, ExportSchedule>;
  private templates: Map<string, ExportTemplate>;
  private history: Map<string, ExportHistory>;
  private readonly STORAGE_KEY_SCHEDULES = 'export_schedules';
  private readonly STORAGE_KEY_TEMPLATES = 'export_templates';
  private readonly STORAGE_KEY_HISTORY = 'export_history';
  private readonly MAX_HISTORY_ITEMS = 100;
  private readonly DEFAULT_VALIDATION_RULES: ExportValidationRules = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxRecipients: 10,
    allowedFormats: ['json', 'csv', 'pdf', 'excel'],
    requiredSections: ['barcodeHistory'],
    maxSections: 8
  };

  private constructor() {
    this.schedules = new Map();
    this.templates = new Map();
    this.history = new Map();
    this.loadFromStorage();
  }

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  private loadFromStorage(): void {
    try {
      const schedulesData = localStorage.getItem(this.STORAGE_KEY_SCHEDULES);
      const templatesData = localStorage.getItem(this.STORAGE_KEY_TEMPLATES);
      const historyData = localStorage.getItem(this.STORAGE_KEY_HISTORY);

      if (schedulesData) {
        const schedules = JSON.parse(schedulesData);
        this.schedules = new Map(Object.entries(schedules));
      }

      if (templatesData) {
        const templates = JSON.parse(templatesData);
        this.templates = new Map(Object.entries(templates));
      }

      if (historyData) {
        const history = JSON.parse(historyData);
        this.history = new Map(Object.entries(history));
      }
    } catch (error: unknown) {
      logError('Error loading export data:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEY_SCHEDULES,
        JSON.stringify(Object.fromEntries(this.schedules))
      );
      localStorage.setItem(
        this.STORAGE_KEY_TEMPLATES,
        JSON.stringify(Object.fromEntries(this.templates))
      );
      localStorage.setItem(
        this.STORAGE_KEY_HISTORY,
        JSON.stringify(Object.fromEntries(this.history))
      );
    } catch (error: unknown) {
      logError('Error saving export data:', error);
    }
  }

  private validateSchedule(schedule: ExportSchedule): ValidationResult {
    const errors: string[] = [];
    const rules = this.DEFAULT_VALIDATION_RULES;

    // Validate name
    if (!schedule.name.trim()) {
      errors.push('Schedule name is required');
    }

    // Validate frequency
    if (!['daily', 'weekly', 'monthly'].includes(schedule.frequency)) {
      errors.push('Invalid frequency');
    }

    // Validate time format
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)) {
      errors.push('Invalid time format (use HH:MM)');
    }

    // Validate format
    if (!rules.allowedFormats?.includes(schedule.format)) {
      errors.push(`Format must be one of: ${rules.allowedFormats?.join(', ')}`);
    }

    // Validate email recipients
    if (schedule.emailRecipients.length === 0) {
      errors.push('At least one email recipient is required');
    } else if (schedule.emailRecipients.length > (rules.maxRecipients || 10)) {
      errors.push(`Maximum ${rules.maxRecipients} recipients allowed`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    schedule.emailRecipients.forEach((email, index) => {
      if (!emailRegex.test(email)) {
        errors.push(`Invalid email format at position ${index + 1}`);
      }
    });

    // Validate sections
    const enabledSections = Object.entries(schedule.sections)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);

    if (enabledSections.length === 0) {
      errors.push('At least one section must be enabled');
    }

    if (enabledSections.length > (rules.maxSections || 8)) {
      errors.push(`Maximum ${rules.maxSections} sections allowed`);
    }

    // Validate required sections
    rules.requiredSections?.forEach(section => {
      if (!schedule.sections[section]) {
        errors.push(`Section "${section}" is required`);
      }
    });

    // Add date range validation for schedules
    if (schedule.lastRun && schedule.nextRun) {
      if (schedule.lastRun > schedule.nextRun) {
        errors.push('Last run time cannot be after next run time');
      }
      if (schedule.nextRun && schedule.nextRun.getTime() < Date.now()) {
        errors.push('Next run time cannot be in the past');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public validateTemplate(template: ExportTemplate): ValidationResult;
  public validateTemplate(template: Omit<ExportTemplate, 'id'>): ValidationResult;
  public validateTemplate(template: ExportTemplate | Omit<ExportTemplate, 'id'>): ValidationResult {
    const templateWithId = 'id' in template ? template : { ...template, id: 'temp' };
    
    const errors: string[] = [];
    const rules = this.DEFAULT_VALIDATION_RULES;

    // Validate name
    if (!templateWithId.name.trim()) {
      errors.push('Template name is required');
    }

    // Validate format
    if (!rules.allowedFormats?.includes(templateWithId.format)) {
      errors.push(`Format must be one of: ${rules.allowedFormats?.join(', ')}`);
    }

    // Validate sections
    const enabledSections = Object.entries(templateWithId.sections)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);

    if (enabledSections.length === 0) {
      errors.push('At least one section must be enabled');
    }

    if (enabledSections.length > (rules.maxSections || 8)) {
      errors.push(`Maximum ${rules.maxSections} sections allowed`);
    }

    // Validate required sections
    rules.requiredSections?.forEach(section => {
      if (!templateWithId.sections[section]) {
        errors.push(`Section "${section}" is required`);
      }
    });

    // Validate date range if present
    if (templateWithId.dateRange) {
      const { start, end } = templateWithId.dateRange;
      if (start > end) {
        errors.push('Start date must be before end date');
      }
      if (end && end.getTime() > Date.now()) {
        errors.push('End date cannot be in the future');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public createSchedule(schedule: Omit<ExportSchedule, 'id' | 'lastRun' | 'nextRun'>): ExportSchedule {
    const validation = this.validateSchedule({ ...schedule, id: 'temp' });
    if (!validation.isValid) {
      throw new Error(`Invalid schedule configuration: ${validation.errors.join(', ')}`);
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const nextRun = this.calculateNextRun(now, schedule.frequency, schedule.time);

    const newSchedule: ExportSchedule = {
      ...schedule,
      id,
      lastRun: undefined,
      nextRun: new Date(nextRun),
      active: true
    };

    this.schedules.set(id, newSchedule);
    this.saveToStorage();
    return newSchedule;
  }

  public updateSchedule(id: string, updates: Partial<ExportSchedule>): ExportSchedule | null {
    const schedule = this.schedules.get(id);
    if (!schedule) return null;

    const updatedSchedule = { ...schedule, ...updates };
    
    // Validate the updated schedule
    const validation = this.validateSchedule(updatedSchedule);
    if (!validation.isValid) {
      throw new Error(`Invalid schedule configuration: ${validation.errors.join(', ')}`);
    }

    if (updates.frequency || updates.time) {
      updatedSchedule.nextRun = this.calculateNextRun(
        Date.now(),
        updatedSchedule.frequency,
        updatedSchedule.time
      );
    }

    this.schedules.set(id, updatedSchedule);
    this.saveToStorage();
    return updatedSchedule;
  }

  public deleteSchedule(id: string): boolean {
    const result = this.schedules.delete(id);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  public getSchedule(id: string): ExportSchedule | null {
    return this.schedules.get(id) || null;
  }

  public getAllSchedules(): ExportSchedule[] {
    return Array.from(this.schedules.values());
  }

  public createTemplate(template: Omit<ExportTemplate, 'id'>): ExportTemplate {
    const validation = this.validateTemplate(template);
    if (!validation.isValid) {
      throw new Error(`Invalid template configuration: ${validation.errors.join(', ')}`);
    }

    const id = crypto.randomUUID();
    const newTemplate: ExportTemplate = {
      ...template,
      id
    };

    this.templates.set(id, newTemplate);
    this.saveToStorage();
    return newTemplate;
  }

  public updateTemplate(id: string, updates: Partial<ExportTemplate>): ExportTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const updatedTemplate = { ...template, ...updates };
    
    // Validate the updated template
    const validation = this.validateTemplate(updatedTemplate);
    if (!validation.isValid) {
      throw new Error(`Invalid template configuration: ${validation.errors.join(', ')}`);
    }

    this.templates.set(id, updatedTemplate);
    this.saveToStorage();
    return updatedTemplate;
  }

  public deleteTemplate(id: string): boolean {
    const result = this.templates.delete(id);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  public getTemplate(id: string): ExportTemplate | null {
    return this.templates.get(id) || null;
  }

  public getAllTemplates(): ExportTemplate[] {
    return Array.from(this.templates.values());
  }

  private calculateNextRun(now: number, frequency: string, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    if (nextRun.getTime() <= now) {
      switch (frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
      }
    }

    return nextRun;
  }

  public async executeScheduledExports(): Promise<void> {
    const now = new Date();
    const schedules = this.getAllSchedules().filter(schedule => 
      schedule.active && schedule.nextRun && schedule.nextRun <= now
    );

    for (const schedule of schedules) {
      try {
        await this.executeExport(schedule);
        
        // Update schedule
        const nextRun = this.calculateNextRun(now.getTime(), schedule.frequency, schedule.time);
        this.updateSchedule(schedule.id, {
          lastRun: now,
          nextRun: nextRun
        });
      } catch (error) {
        logError(`Error executing scheduled export ${schedule.id}:`, error);
      }
    }
  }

  private addToHistory(historyItem: Omit<ExportHistory, 'id'>): ExportHistory {
    const id = crypto.randomUUID();
    const newHistoryItem: ExportHistory = {
      ...historyItem,
      id
    };

    this.history.set(id, newHistoryItem);

    // Maintain history size limit
    if (this.history.size > this.MAX_HISTORY_ITEMS) {
      const oldestKey = Array.from(this.history.keys())[0];
      this.history.delete(oldestKey);
    }

    this.saveToStorage();
    return newHistoryItem;
  }

  public getExportHistory(): ExportHistory[] {
    return Array.from(this.history.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public clearExportHistory(): void {
    this.history.clear();
    this.saveToStorage();
  }

  private async executeExport(schedule: ExportSchedule): Promise<void> {
    const exportOptions = {
      format: (schedule.format === 'excel' ? 'csv' : schedule.format) as 'json' | 'csv' | 'pdf',
      includeMetadata: true,
      sections: schedule.sections
    };

    try {
      const data = dataManagementService.exportDataWithOptions(exportOptions);
      
      // Add to history
      this.addToHistory({
        scheduleId: schedule.id,
        timestamp: Date.now(),
        status: 'success',
        format: schedule.format,
        sections: schedule.sections,
        fileSize: typeof data === 'string' ? data.length : data.size,
        recipients: schedule.emailRecipients
      });

      // TODO: Implement email delivery
      logInfo(`Export executed for schedule ${schedule.id}`);
      logInfo(`Recipients: ${schedule.emailRecipients.join(', ')}`);
    } catch (error) {
      // Add failed export to history
      this.addToHistory({
        scheduleId: schedule.id,
        timestamp: Date.now(),
        status: 'failed',
        format: schedule.format,
        sections: schedule.sections,
        error: error instanceof Error ? error.message : 'Unknown error',
        recipients: schedule.emailRecipients
      });
      throw error;
    }
  }

  public async exportWithTemplate(templateId: string): Promise<string | Blob> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const exportOptions = {
      format: (template.format === 'excel' ? 'csv' : template.format) as 'json' | 'csv' | 'pdf',
      includeMetadata: true,
      sections: template.sections,
      dateRange: template.dateRange ? {
        start: template.dateRange.start.getTime(),
        end: template.dateRange.end.getTime()
      } : undefined
    };

    try {
      const data = dataManagementService.exportDataWithOptions(exportOptions);
      
      // Add to history
      this.addToHistory({
        templateId: template.id,
        timestamp: Date.now(),
        status: 'success',
        format: template.format,
        sections: template.sections,
        fileSize: typeof data === 'string' ? data.length : data.size
      });

      return data;
    } catch (error) {
      // Add failed export to history
      this.addToHistory({
        templateId: template.id,
        timestamp: Date.now(),
        status: 'failed',
        format: template.format,
        sections: template.sections,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public async previewExport(scheduleOrTemplate: ExportSchedule | ExportTemplate): Promise<string | Blob> {
    // Validate before preview
    const validation = 'frequency' in scheduleOrTemplate 
      ? this.validateSchedule(scheduleOrTemplate)
      : this.validateTemplate(scheduleOrTemplate);

    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    // Handle excel format separately since ExportOptions doesn't support it
    let format = scheduleOrTemplate.format;
    if (format === 'excel') {
      logInfo(`Excel export not supported for preview, using CSV instead`);
      format = 'csv';
    }

    const exportOptions: unknown = {
      format: format as 'json' | 'csv' | 'pdf',
      includeMetadata: true,
      sections: scheduleOrTemplate.sections,
      preview: true
    };

    if ('dateRange' in scheduleOrTemplate && scheduleOrTemplate.dateRange) {
      (exportOptions as import('./data-management-service').ExportOptions).dateRange = {
        start: scheduleOrTemplate.dateRange.start.getTime(),
        end: scheduleOrTemplate.dateRange.end.getTime()
      };
    }

    return dataManagementService.exportDataWithOptions(exportOptions as import('./data-management-service').ExportOptions);
  }

  public async exportData(format: 'json' | 'csv' | 'pdf' | 'excel', data: unknown): Promise<ExportResult> {
    switch (format) {
      case 'json':
        return this.exportToJSON(data);
      case 'csv':
        return this.exportToCSV(data);
      case 'pdf':
        return this.exportToPDF(data);
      case 'excel':
        return this.exportToExcel(data);
      default:
        return { success: false, error: 'Unsupported export format' };
    }
  }

  private exportToJSON(_data: unknown): ExportResult {
    try {
      const _json = JSON.stringify(_data);
      return { success: true };
    } catch (error: unknown) {
      logError('Error exporting to JSON:', error);
      return { success: false, error: 'Failed to export to JSON' };
    }
  }

  private exportToCSV(_data: unknown): ExportResult {
    try {
      // Implement CSV export logic here
      return { success: true };
    } catch (error: unknown) {
      logError('Error exporting to CSV:', error);
      return { success: false, error: 'Failed to export to CSV' };
    }
  }

  private exportToPDF(_data: unknown): ExportResult {
    try {
      // Implement PDF export logic here
      return { success: true };
    } catch (error: unknown) {
      logError('Error exporting to PDF:', error);
      return { success: false, error: 'Failed to export to PDF' };
    }
  }

  private exportToExcel(_data: unknown): ExportResult {
    try {
      // Implement Excel export logic here
      return { success: true };
    } catch (error: unknown) {
      logError('Error exporting to Excel:', error);
      return { success: false, error: 'Failed to export to Excel' };
    }
  }

  public async logExport(logData: unknown): Promise<void> {
    try {
      // Implement logging logic here
      logInfo('Export log:', logData);
    } catch (error: unknown) {
      logError('Error logging export:', error);
    }
  }
}

export const exportService = ExportService.getInstance(); 