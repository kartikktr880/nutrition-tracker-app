import React, { useState, useEffect, useCallback, useRef } from 'react';
import { exportService } from '../../lib/export-service';
import ExportHistory from './ExportHistory';
import { ExportSchedule, ExportTemplate } from '../../lib/export-service';
import JSZip from 'jszip';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
  title?: string;
  duration?: number;
}

// Add proper error type
interface ExportError extends Error {
  code?: string;
  details?: string;
}

// Add format validation and compression utilities
const formatValidators = {
  json: (data: any) => {
    try {
      const jsonStr = JSON.stringify(data);
      if (jsonStr.length > 10 * 1024 * 1024) {
        throw new Error('JSON data exceeds 10MB limit');
      }
      return jsonStr;
    } catch (error) {
      throw new Error(`Invalid JSON data: ${error.message}`);
    }
  },
  csv: (data: any) => {
    if (!Array.isArray(data)) {
      throw new Error('CSV export requires array data');
    }
    if (data.length === 0) {
      throw new Error('No data to export');
    }
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  },
  pdf: (data: any) => {
    if (typeof data !== 'object') {
      throw new Error('PDF export requires object data');
    }
    return JSON.stringify(data);
  },
  excel: (data: any) => {
    if (!Array.isArray(data)) {
      throw new Error('Excel export requires array data');
    }
    return JSON.stringify(data);
  }
};

// Add compression utilities
const compressionUtils = {
  compress: async (data: string, format: string) => {
    if (format === 'json' || format === 'csv') {
      const encoder = new TextEncoder();
      const compressed = await compress(encoder.encode(data));
      return compressed;
    }
    return data;
  },
  decompress: async (data: any, format: string) => {
    if (format === 'json' || format === 'csv') {
      const decoder = new TextDecoder();
      const decompressed = await decompress(data);
      return decoder.decode(decompressed);
    }
    return data;
  }
};

// Add data integrity verification utilities
const integrityUtils = {
  generateChecksum: (data: string): string => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  },

  verifyDataIntegrity: (originalData: any, exportedData: string, format: string): boolean => {
    try {
      let parsedData;
      switch (format) {
        case 'json':
          parsedData = JSON.parse(exportedData);
          return JSON.stringify(parsedData) === JSON.stringify(originalData);
        case 'csv':
          // For CSV, we verify the structure and content
          const rows = exportedData.split('\n');
          const headers = rows[0].split(',');
          return rows.length > 1 && headers.length > 0;
        default:
          return true; // For other formats, we trust the export service
      }
    } catch (error) {
      console.error('Data integrity verification failed:', error);
      return false;
    }
  }
};

// Add data validation and sanitization utilities
const validationUtils = {
  sanitizeString: (str: string): string => {
    return str
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/[&]/g, '&amp;') // Escape ampersands
      .replace(/["]/g, '&quot;') // Escape quotes
      .trim();
  },

  validateNutritionalData: (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Validate required fields
    const requiredFields = ['calories', 'protein', 'carbs', 'fat'];
    if (!requiredFields.every(field => typeof data[field] === 'number' && data[field] >= 0)) {
      return false;
    }

    // Validate numeric ranges
    if (data.calories > 10000 || data.protein > 500 || data.carbs > 1000 || data.fat > 500) {
      return false;
    }

    return true;
  },

  sanitizeExportData: (data: any, format: string): any => {
    if (!data) return data;

    switch (format) {
      case 'json':
        return JSON.parse(JSON.stringify(data, (key, value) => {
          if (typeof value === 'string') {
            return validationUtils.sanitizeString(value);
          }
          return value;
        }));
      
      case 'csv':
        if (Array.isArray(data)) {
          return data.map(row => {
            const sanitizedRow: any = {};
            Object.entries(row).forEach(([key, value]) => {
              sanitizedRow[validationUtils.sanitizeString(key)] = 
                typeof value === 'string' ? validationUtils.sanitizeString(value) : value;
            });
            return sanitizedRow;
          });
        }
        return data;

      default:
        return data;
    }
  }
};

const ExportManager: React.FC = () => {
  const [schedules, setSchedules] = useState<ExportSchedule[]>([]);
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'schedules' | 'templates'>('schedules');
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    frequency: 'daily' as const,
    time: '00:00',
    format: 'json' as const,
    emailRecipients: [''],
    sections: {
      barcodeHistory: true,
      barcodeFavorites: true,
      mealPlans: true,
      nutritionalGoals: true,
      goalProgress: true,
      dietaryPreferences: true,
      groceryList: true,
      mealPrepTemplates: true
    }
  });
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    format: 'json' as const,
    sections: {
      barcodeHistory: true,
      barcodeFavorites: true,
      mealPlans: true,
      nutritionalGoals: true,
      goalProgress: true,
      dietaryPreferences: true,
      groceryList: true,
      mealPrepTemplates: true
    }
  });
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    [key: string]: string;
  }>({});
  const [quickExport, setQuickExport] = useState({
    format: 'json' as const,
    sections: {
      barcodeHistory: true,
      barcodeFavorites: true,
      mealPlans: true,
      nutritionalGoals: true,
      goalProgress: true,
      dietaryPreferences: true,
      groceryList: true,
      mealPrepTemplates: true
    }
  });
  const [showQuickExportModal, setShowQuickExportModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkExportModal, setShowBulkExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Add operation lock to prevent race conditions
  const [isOperationLocked, setIsOperationLocked] = useState(false);
  const operationLockRef = useRef<boolean>(false);

  // Move createdUrls to component level
  const createdUrlsRef = useRef<string[]>([]);

  // Add preview state management
  const previewStateRef = useRef<{
    isGenerating: boolean;
    currentId: string | null;
  }>({
    isGenerating: false,
    currentId: null
  });

  // Add export progress tracking
  const exportProgressRef = useRef<{
    total: number;
    completed: number;
    failed: number;
    currentBatch: number;
    lastSavedState: string | null;
  }>({
    total: 0,
    completed: 0,
    failed: 0,
    currentBatch: 0,
    lastSavedState: null
  });

  // Add format validation state
  const [formatValidation, setFormatValidation] = useState<{
    isValid: boolean;
    errors: string[];
  }>({
    isValid: true,
    errors: []
  });

  // Add performance monitoring
  const performanceMetrics = useRef<{
    startTime: number;
    endTime: number;
    memoryUsage: number;
    compressionRatio: number;
  }>({
    startTime: 0,
    endTime: 0,
    memoryUsage: 0,
    compressionRatio: 0
  });

  // Add export recovery function
  const recoverExportState = useCallback(() => {
    try {
      const savedState = localStorage.getItem('exportProgress');
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.timestamp && Date.now() - state.timestamp < 3600000) { // 1 hour validity
          return state;
        }
      }
    } catch (error) {
      console.error('Error recovering export state:', error);
    }
    return null;
  }, []);

  // Add export state persistence
  const persistExportState = useCallback((state: any) => {
    try {
      localStorage.setItem('exportProgress', JSON.stringify({
        ...state,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error persisting export state:', error);
    }
  }, []);

  // Add integrity verification state
  const [integrityStatus, setIntegrityStatus] = useState<{
    verified: boolean;
    checksum: string | null;
    timestamp: string | null;
  }>({
    verified: false,
    checksum: null,
    timestamp: null
  });

  // Add validation state
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>({
    isValid: true,
    errors: [],
    warnings: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setSchedules(exportService.getAllSchedules());
    setTemplates(exportService.getAllTemplates());
  };

  const showToast = (message: string, type: 'success' | 'error', title?: string, duration: number = 3000) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, title, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  };

  const validateSchedule = (schedule: typeof newSchedule) => {
    const errors: { [key: string]: string } = {};
    
    if (!schedule.name.trim()) {
      errors.name = 'Name is required';
    } else if (schedule.name.length < 3) {
      errors.name = 'Name must be at least 3 characters';
    }

    if (!schedule.time) {
      errors.time = 'Time is required';
    }

    if (schedule.emailRecipients.length === 0) {
      errors.emailRecipients = 'At least one recipient is required';
    } else {
      schedule.emailRecipients.forEach((email, index) => {
        if (!email.trim()) {
          errors[`email-${index}`] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors[`email-${index}`] = 'Invalid email format';
        }
      });
    }

    return errors;
  };

  const validateTemplate = (template: typeof newTemplate) => {
    const errors: { [key: string]: string } = {};
    
    if (!template.name.trim()) {
      errors.name = 'Name is required';
    } else if (template.name.length < 3) {
      errors.name = 'Name must be at least 3 characters';
    }

    if (!template.description.trim()) {
      errors.description = 'Description is required';
    }

    return errors;
  };

  // Enhance cleanup function
  const cleanupResources = useCallback(() => {
    createdUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error revoking URL:', error);
      }
    });
    createdUrlsRef.current = [];
  }, []);

  // Reset selection when changing tabs
  useEffect(() => {
    setSelectedItems(new Set());
  }, [activeTab]);

  // Add cleanup for preview data
  useEffect(() => {
    return () => {
      setPreviewData(null);
    };
  }, []);

  // Enhance export validation
  const validateExportData = useCallback((data: any, format: string) => {
    try {
      const validator = formatValidators[format];
      if (!validator) {
        throw new Error(`Unsupported format: ${format}`);
      }
      return validator(data);
    } catch (error) {
      setFormatValidation({
        isValid: false,
        errors: [error.message]
      });
      throw error;
    }
  }, []);

  const handleCreateSchedule = async () => {
    const errors = validateSchedule(newSchedule);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast('Please fix the validation errors', 'error');
      return;
    }

    setIsLoading(true);
    setOperationInProgress('Creating schedule');
    setValidationErrors([]);
    try {
      await exportService.createSchedule(newSchedule);
      setNewSchedule({
        name: '',
        frequency: 'daily',
        time: '00:00',
        format: 'json',
        emailRecipients: [''],
        sections: {
          barcodeHistory: true,
          barcodeFavorites: true,
          mealPlans: true,
          nutritionalGoals: true,
          goalProgress: true,
          dietaryPreferences: true,
          groceryList: true,
          mealPrepTemplates: true
        }
      });
      setFieldErrors({});
      loadData();
      showToast('Schedule created successfully', 'success');
    } catch (error) {
      console.error('Error creating schedule:', error);
      const exportError = error as ExportError;
      const errorMessage = exportError.details || 
        (exportError.message.includes(': ') 
          ? exportError.message.split(': ')[1] 
          : exportError.message);
      setValidationErrors([errorMessage]);
      showToast(`Failed to create schedule: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
      setOperationInProgress(null);
    }
  };

  const handleCreateTemplate = async () => {
    const errors = validateTemplate(newTemplate);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast('Please fix the validation errors', 'error', 'Validation Failed');
      return;
    }

    setIsLoading(true);
    setOperationInProgress('Creating template');
    setValidationErrors([]);
    try {
      await exportService.createTemplate(newTemplate);
      setNewTemplate({
        name: '',
        description: '',
        format: 'json',
        sections: {
          barcodeHistory: true,
          barcodeFavorites: true,
          mealPlans: true,
          nutritionalGoals: true,
          goalProgress: true,
          dietaryPreferences: true,
          groceryList: true,
          mealPrepTemplates: true
        }
      });
      setFieldErrors({});
      loadData();
      showToast('Template created successfully', 'success', 'Success', 5000);
    } catch (error) {
      console.error('Error creating template:', error);
      if (error instanceof Error) {
        setValidationErrors(error.message.split(': ')[1].split(', '));
        showToast('Failed to create template', 'error', 'Error');
      }
    } finally {
      setIsLoading(false);
      setOperationInProgress(null);
    }
  };

  const handleDeleteSchedule = (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    if (window.confirm(`Are you sure you want to delete the schedule "${schedule.name}"? This action cannot be undone.`)) {
      setIsLoading(true);
      setOperationInProgress('Deleting schedule');
      try {
        exportService.deleteSchedule(id);
        loadData();
        showToast('Schedule deleted successfully', 'success', 'Success', 5000);
      } catch (error) {
        console.error('Error deleting schedule:', error);
        if (error instanceof Error) {
          setValidationErrors([error.message]);
          showToast('Failed to delete schedule', 'error', 'Error');
        }
      } finally {
        setIsLoading(false);
        setOperationInProgress(null);
      }
    }
  };

  const handleDeleteTemplate = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;

    if (window.confirm(`Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`)) {
      setIsLoading(true);
      setOperationInProgress('Deleting template');
      try {
        exportService.deleteTemplate(id);
        loadData();
        showToast('Template deleted successfully', 'success', 'Success', 5000);
      } catch (error) {
        console.error('Error deleting template:', error);
        if (error instanceof Error) {
          setValidationErrors([error.message]);
          showToast('Failed to delete template', 'error', 'Error');
        }
      } finally {
        setIsLoading(false);
        setOperationInProgress(null);
      }
    }
  };

  const handleToggleSchedule = (id: string, active: boolean) => {
    try {
      setValidationErrors([]);
      exportService.updateSchedule(id, { active });
      loadData();
    } catch (error) {
      console.error('Error updating schedule:', error);
      if (error instanceof Error) {
        setValidationErrors(error.message.split(': ')[1].split(', '));
      }
    }
  };

  // Enhance preview handling
  const handlePreviewSchedule = async (schedule: ExportSchedule) => {
    if (isPreviewLoading || operationLockRef.current || 
        (previewStateRef.current.isGenerating && previewStateRef.current.currentId === schedule.id)) {
      return;
    }
    
    setIsPreviewLoading(true);
    operationLockRef.current = true;
    previewStateRef.current = {
      isGenerating: true,
      currentId: schedule.id
    };
    setValidationErrors([]);
    
    try {
      const data = await exportService.previewExport(schedule);
      if (previewStateRef.current.currentId === schedule.id) {
        setPreviewData(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      if (error instanceof Error) {
        setValidationErrors(error.message.split(': ')[1].split(', '));
      }
      if (previewStateRef.current.currentId === schedule.id) {
        setPreviewData('Error generating preview');
      }
    } finally {
      if (previewStateRef.current.currentId === schedule.id) {
        setIsPreviewLoading(false);
        operationLockRef.current = false;
        previewStateRef.current = {
          isGenerating: false,
          currentId: null
        };
      }
    }
  };

  const handlePreviewTemplate = async (template: ExportTemplate) => {
    setIsPreviewLoading(true);
    setValidationErrors([]);
    try {
      const data = await exportService.previewExport(template);
      setPreviewData(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error generating preview:', error);
      if (error instanceof Error) {
        setValidationErrors(error.message.split(': ')[1].split(', '));
      }
      setPreviewData('Error generating preview');
    }
    setIsPreviewLoading(false);
  };

  // Enhance quick export with proper cleanup
  const handleQuickExport = async () => {
    if (isOperationLocked || operationLockRef.current) {
      showToast('Another operation is in progress', 'error');
      return;
    }

    setIsOperationLocked(true);
    operationLockRef.current = true;
    setIsLoading(true);
    setOperationInProgress('Preparing export');
    
    let url: string | null = null;
    
    try {
      const data = await exportService.exportData(quickExport);
      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], 
        { type: 'application/json' });
      url = URL.createObjectURL(blob);
      createdUrlsRef.current.push(url);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrition-export-${new Date().toISOString()}.${quickExport.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      showToast('Export completed successfully', 'success');
    } catch (error) {
      console.error('Error performing quick export:', error);
      if (error instanceof Error) {
        const errorMessage = error.message.includes(': ') 
          ? error.message.split(': ')[1] 
          : error.message;
        showToast(`Failed to export: ${errorMessage}`, 'error');
      }
    } finally {
      if (url) {
        URL.revokeObjectURL(url);
        createdUrlsRef.current = createdUrlsRef.current.filter(u => u !== url);
      }
      setIsLoading(false);
      setOperationInProgress(null);
      setIsOperationLocked(false);
      operationLockRef.current = false;
    }
  };

  // Enhance bulk export with validation
  const handleBulkExport = async () => {
    if (isOperationLocked || operationLockRef.current) {
      showToast('Another operation is in progress', 'error');
      return;
    }

    if (selectedItems.size === 0) {
      showToast('Please select at least one item to export', 'error');
      return;
    }

    const MAX_ITEMS = 50;
    if (selectedItems.size > MAX_ITEMS) {
      showToast(`Cannot export more than ${MAX_ITEMS} items at once`, 'error');
      return;
    }

    // Check for recovery state
    const recoveryState = recoverExportState();
    if (recoveryState) {
      const shouldRecover = window.confirm(
        'A previous export was interrupted. Would you like to continue from where it left off?'
      );
      if (shouldRecover) {
        exportProgressRef.current = recoveryState;
      } else {
        localStorage.removeItem('exportProgress');
      }
    }

    setIsOperationLocked(true);
    operationLockRef.current = true;
    setIsExporting(true);
    setExportProgress(0);
    setOperationInProgress('Preparing bulk export');
    
    performanceMetrics.current.startTime = performance.now();
    performanceMetrics.current.memoryUsage = performance.memory?.usedJSHeapSize || 0;
    
    try {
      const items = activeTab === 'schedules' 
        ? schedules.filter(s => selectedItems.has(s.id))
        : templates.filter(t => selectedItems.has(t.id));

      const zip = new JSZip();
      const totalItems = items.length;
      processedItemsRef.current = 0;
      failedItemsRef.current = [];

      // Add validation report to manifest
      const manifest = {
        timestamp: new Date().toISOString(),
        totalItems,
        items: [] as Array<{
          name: string;
          format: string;
          checksum: string;
          size: number;
          validation: {
            isValid: boolean;
            errors: string[];
            warnings: string[];
          };
        }>
      };

      exportProgressRef.current = {
        total: totalItems,
        completed: 0,
        failed: 0,
        currentBatch: 0,
        lastSavedState: null
      };

      const batchSize = 5;
      const timeout = 30000;

      for (let i = 0; i < items.length; i += batchSize) {
        if (!operationLockRef.current) {
          throw new Error('Export cancelled');
        }

        const batch = items.slice(i, i + batchSize);
        exportProgressRef.current.currentBatch = i / batchSize;

        const batchPromises = batch.map(async (item) => {
          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Export timeout')), timeout);
            });

            const data = await Promise.race([
              exportService.exportData(item),
              timeoutPromise
            ]);

            // Validate and sanitize data
            const sanitizedData = validationUtils.sanitizeExportData(data, item.format);
            
            // Validate nutritional data if present
            const validationErrors: string[] = [];
            const validationWarnings: string[] = [];
            
            if (sanitizedData.nutritionalData) {
              if (!validationUtils.validateNutritionalData(sanitizedData.nutritionalData)) {
                validationErrors.push('Invalid nutritional data detected');
              }
            }

            // Check for potential data issues
            if (typeof sanitizedData === 'object') {
              Object.entries(sanitizedData).forEach(([key, value]) => {
                if (value === null || value === undefined) {
                  validationWarnings.push(`Missing value for field: ${key}`);
                }
              });
            }

            // Validate and format data
            const formattedData = validateExportData(sanitizedData, item.format);
            
            // Generate checksum for integrity verification
            const checksum = integrityUtils.generateChecksum(formattedData);
            
            // Verify data integrity
            const isIntegrityValid = integrityUtils.verifyDataIntegrity(sanitizedData, formattedData, item.format);
            if (!isIntegrityValid) {
              throw new Error('Data integrity verification failed');
            }
            
            // Compress data if needed
            const compressedData = await compressionUtils.compress(formattedData, item.format);
            
            const fileName = `${item.name}-${new Date().toISOString()}.${item.format}`;
            zip.file(fileName, compressedData);
            
            // Add to manifest with validation results
            manifest.items.push({
              name: fileName,
              format: item.format,
              checksum,
              size: compressedData.length,
              validation: {
                isValid: validationErrors.length === 0,
                errors: validationErrors,
                warnings: validationWarnings
              }
            });
            
            processedItemsRef.current++;
            exportProgressRef.current.completed++;
            setExportProgress(Math.round((processedItemsRef.current / totalItems) * 100));

            // Update validation status
            setValidationStatus({
              isValid: validationErrors.length === 0,
              errors: validationErrors,
              warnings: validationWarnings
            });

            // Update performance metrics
            performanceMetrics.current.memoryUsage = Math.max(
              performanceMetrics.current.memoryUsage,
              performance.memory?.usedJSHeapSize || 0
            );

            // Persist progress
            persistExportState(exportProgressRef.current);
          } catch (error) {
            console.error(`Error exporting ${item.name}:`, error);
            failedItemsRef.current.push(item.name);
            exportProgressRef.current.failed++;
            throw error;
          }
        });

        try {
          await Promise.all(batchPromises);
        } catch (error) {
          console.error('Batch export error:', error);
          // Continue with next batch
        }
      }

      if (processedItemsRef.current === 0) {
        throw new Error('No items were successfully exported');
      }

      // Add manifest to zip
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Calculate final performance metrics
      performanceMetrics.current.endTime = performance.now();
      performanceMetrics.current.compressionRatio = 
        (zipBlob.size / (performanceMetrics.current.memoryUsage - performance.memory?.usedJSHeapSize || 0)) * 100;

      if (zipBlob.size > 100 * 1024 * 1024) {
        throw new Error('Total export size exceeds 100MB limit');
      }

      const url = URL.createObjectURL(zipBlob);
      createdUrlsRef.current.push(url);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrition-export-${new Date().toISOString()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Update integrity status
      setIntegrityStatus({
        verified: true,
        checksum: integrityUtils.generateChecksum(JSON.stringify(manifest)),
        timestamp: new Date().toISOString()
      });

      // Log export with performance metrics, integrity information, and validation results
      await exportService.logExport({
        type: 'bulk',
        items: items.map(item => item.name),
        timestamp: new Date().toISOString(),
        status: 'success',
        failedItems: failedItemsRef.current.length > 0 ? failedItemsRef.current : undefined,
        processedCount: processedItemsRef.current,
        totalCount: totalItems,
        performance: {
          duration: performanceMetrics.current.endTime - performanceMetrics.current.startTime,
          memoryUsage: performanceMetrics.current.memoryUsage,
          compressionRatio: performanceMetrics.current.compressionRatio
        },
        integrity: {
          verified: true,
          checksum: integrityStatus.checksum,
          timestamp: integrityStatus.timestamp
        },
        validation: validationStatus
      });

      // Clear progress state on success
      localStorage.removeItem('exportProgress');

      // Show appropriate success message based on validation results
      if (validationStatus.warnings.length > 0) {
        showToast(
          `Export completed with ${validationStatus.warnings.length} warnings`,
          'success',
          'Export Complete with Warnings'
        );
      } else if (failedItemsRef.current.length > 0) {
        showToast(
          `Exported ${processedItemsRef.current} items with ${failedItemsRef.current.length} failures`,
          'success',
          'Partial Export Complete'
        );
      } else {
        showToast(`Successfully exported ${processedItemsRef.current} items`, 'success');
      }

      setSelectedItems(new Set());
      setShowBulkExportModal(false);
    } catch (error) {
      console.error('Error performing bulk export:', error);
      const exportError = error as ExportError;
      const errorMessage = exportError.details || 
        (exportError.message.includes(': ') 
          ? exportError.message.split(': ')[1] 
          : exportError.message);
      showToast(`Failed to export: ${errorMessage}`, 'error');
      
      // Update integrity status on failure
      setIntegrityStatus({
        verified: false,
        checksum: null,
        timestamp: new Date().toISOString()
      });

      // Update validation status on failure
      setValidationStatus({
        isValid: false,
        errors: [errorMessage],
        warnings: []
      });
    } finally {
      cleanupResources();
      setIsExporting(false);
      setExportProgress(0);
      setOperationInProgress(null);
      setIsOperationLocked(false);
      operationLockRef.current = false;
    }
  };

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const items = activeTab === 'schedules' ? schedules : templates;
    setSelectedItems(prev => {
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map(item => item.id));
    });
  }, [activeTab, schedules, templates]);

  const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
            <div className="w-12 h-12 border-4 border-blue-500 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
          </div>
          <div className="text-center">
            <p className="text-gray-700 font-medium">{message}</p>
            <p className="text-sm text-gray-500 mt-1">Please wait while we process your request...</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
      setPreviewData(null);
      setIsOperationLocked(false);
      operationLockRef.current = false;
      previewStateRef.current = {
        isGenerating: false,
        currentId: null
      };
    };
  }, [cleanupResources]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-4">
          <button
            className={`px-4 py-2 rounded ${
              activeTab === 'schedules'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setActiveTab('schedules')}
          >
            Schedules
          </button>
          <button
            className={`px-4 py-2 rounded ${
              activeTab === 'templates'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowHistory(true)}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            View History
          </button>
          {selectedItems.size > 0 && (
            <button
              onClick={() => setShowBulkExportModal(true)}
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
              disabled={isExporting}
            >
              Export Selected ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      {activeTab === 'schedules' ? (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-medium mb-3">Create New Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newSchedule.name}
                  onChange={(e) => {
                    setNewSchedule({ ...newSchedule, name: e.target.value });
                    setFieldErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="Enter a descriptive name for your schedule"
                  className={`w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.name ? 'border-red-500' : ''
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">A unique name to identify this schedule</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Frequency</label>
                <select
                  value={newSchedule.frequency}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                    })
                  }
                  className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">How often should the export run?</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input
                  type="time"
                  value={newSchedule.time}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, time: e.target.value })
                  }
                  className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {fieldErrors.time && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.time}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">When should the export run?</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Format</label>
                <select
                  value={newSchedule.format}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      format: e.target.value as 'json' | 'csv' | 'pdf' | 'excel'
                    })
                  }
                  className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Choose your preferred export format</p>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Email Recipients
              </label>
              {newSchedule.emailRecipients.map((email, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const newRecipients = [...newSchedule.emailRecipients];
                        newRecipients[index] = e.target.value;
                        setNewSchedule({
                          ...newSchedule,
                          emailRecipients: newRecipients
                        });
                        setFieldErrors(prev => ({ ...prev, [`email-${index}`]: '' }));
                      }}
                      placeholder="Enter recipient email address"
                      className={`w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors[`email-${index}`] ? 'border-red-500' : ''
                      }`}
                    />
                    {fieldErrors[`email-${index}`] && (
                      <p className="text-xs text-red-500 mt-1">
                        {fieldErrors[`email-${index}`]}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const newRecipients = newSchedule.emailRecipients.filter(
                        (_, i) => i !== index
                      );
                      setNewSchedule({
                        ...newSchedule,
                        emailRecipients: newRecipients
                      });
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors[`email-${index}`];
                        return newErrors;
                      });
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setNewSchedule({
                    ...newSchedule,
                    emailRecipients: [...newSchedule.emailRecipients, '']
                  })
                }
                className="text-blue-500 hover:text-blue-700"
              >
                Add Recipient
              </button>
              <p className="text-xs text-gray-500 mt-1">Add email addresses to receive the exported data</p>
            </div>
            <div className="mt-4">
              <button
                onClick={handleCreateSchedule}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Schedule
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Scheduled Exports</h3>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                {selectedItems.size === schedules.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="border rounded p-4 flex justify-between items-center"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(schedule.id)}
                      onChange={() => toggleItemSelection(schedule.id)}
                      className="rounded"
                    />
                    <div>
                      <h4 className="font-medium">{schedule.name}</h4>
                      <p className="text-sm text-gray-600">
                        {schedule.frequency} at {schedule.time}
                      </p>
                      <p className="text-sm text-gray-600">
                        Format: {schedule.format}
                      </p>
                      <p className="text-sm text-gray-600">
                        Recipients: {schedule.emailRecipients.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePreviewSchedule(schedule)}
                      className="text-blue-500"
                      disabled={isPreviewLoading}
                    >
                      {isPreviewLoading ? 'Loading...' : 'Preview'}
                    </button>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={schedule.active}
                        onChange={(e) =>
                          handleToggleSchedule(schedule.id, e.target.checked)
                        }
                        className="rounded"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-medium mb-3">Create New Template</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => {
                    setNewTemplate({ ...newTemplate, name: e.target.value });
                    setFieldErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="Enter a descriptive name for your template"
                  className={`w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.name ? 'border-red-500' : ''
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">A unique name to identify this template</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={newTemplate.description}
                  onChange={(e) => {
                    setNewTemplate({
                      ...newTemplate,
                      description: e.target.value
                    });
                    setFieldErrors(prev => ({ ...prev, description: '' }));
                  }}
                  placeholder="Describe the purpose of this template"
                  className={`w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.description ? 'border-red-500' : ''
                  }`}
                />
                {fieldErrors.description && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Brief description of what this template is for</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Format</label>
                <select
                  value={newTemplate.format}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      format: e.target.value as 'json' | 'csv' | 'pdf' | 'excel'
                    })
                  }
                  className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Choose your preferred export format</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleCreateTemplate}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Template
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Export Templates</h3>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                {selectedItems.size === templates.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded p-4 flex justify-between items-center"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(template.id)}
                      onChange={() => toggleItemSelection(template.id)}
                      className="rounded"
                    />
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-gray-600">
                        {template.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        Format: {template.format}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePreviewTemplate(template)}
                      className="text-blue-500"
                      disabled={isPreviewLoading}
                    >
                      {isPreviewLoading ? 'Loading...' : 'Preview'}
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4 preview-header">
              <h3 className="font-medium">Export Preview</h3>
              <div className="flex items-center space-x-2">
                <select
                  className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => {
                    const format = e.target.value;
                    const data = previewData;
                    let formattedData = data;
                    
                    if (format === 'json') {
                      formattedData = JSON.stringify(JSON.parse(data), null, 2);
                    } else if (format === 'csv') {
                      // Basic CSV conversion
                      const jsonData = JSON.parse(data);
                      const headers = Object.keys(jsonData[0] || {});
                      const csvRows = [
                        headers.join(','),
                        ...jsonData.map((row: any) => 
                          headers.map(header => JSON.stringify(row[header])).join(',')
                        )
                      ];
                      formattedData = csvRows.join('\n');
                    }
                    
                    setPreviewData(formattedData);
                  }}
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
                <button
                  onClick={() => {
                    const blob = new Blob([previewData], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `export-preview-${new Date().toISOString()}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded"
                >
                  Download
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Export Preview',
                        text: 'Check out this export preview',
                        files: [new File([previewData], 'export-preview.txt', { type: 'text/plain' })]
                      }).catch(console.error);
                    } else {
                      navigator.clipboard.writeText(previewData)
                        .then(() => {
                          const button = document.createElement('div');
                          button.textContent = 'Copied to clipboard!';
                          button.className = 'text-green-600 text-sm';
                          const container = document.querySelector('.preview-header');
                          if (container) {
                            container.appendChild(button);
                            setTimeout(() => button.remove(), 2000);
                          }
                        })
                        .catch(console.error);
                    }
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  {navigator.share ? 'Share' : 'Copy'}
                </button>
                <button
                  onClick={() => setPreviewData(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {previewData}
            </pre>
          </div>
        </div>
      )}

      {showHistory && (
        <ExportHistory onClose={() => setShowHistory(false)} />
      )}

      {isLoading && (
        <LoadingOverlay message={operationInProgress || 'Processing...'} />
      )}

      {validationErrors.length > 0 && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">Validation Errors</h4>
              <ul className="list-disc list-inside mt-2">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setValidationErrors([])}
              className="text-red-700 hover:text-red-900 ml-4"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Toast Notifications */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out ${
              toast.type === 'success'
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {toast.title && (
                  <h4 className="font-medium mb-1">{toast.title}</h4>
                )}
                <p className="text-sm">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-4 text-current hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Export Modal */}
      {showQuickExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Quick Export</h3>
              <button
                onClick={() => setShowQuickExportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Format</label>
                <select
                  value={quickExport.format}
                  onChange={(e) =>
                    setQuickExport({
                      ...quickExport,
                      format: e.target.value as 'json' | 'csv' | 'pdf' | 'excel'
                    })
                  }
                  className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sections to Export</label>
                <div className="space-y-2">
                  {Object.entries(quickExport.sections).map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          setQuickExport({
                            ...quickExport,
                            sections: {
                              ...quickExport.sections,
                              [key]: e.target.checked
                            }
                          })
                        }
                        className="rounded"
                      />
                      <span className="text-sm">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowQuickExportModal(false)}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickExport}
                  className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                  disabled={isLoading}
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Export Modal */}
      {showBulkExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Bulk Export</h3>
              <button
                onClick={() => setShowBulkExportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You are about to export {selectedItems.size} {activeTab === 'schedules' ? 'schedules' : 'templates'}.
                Each item will be exported in its original format.
              </p>
              {isExporting && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Exporting... {exportProgress}%
                  </p>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowBulkExportModal(false)}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                  disabled={isExporting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkExport}
                  className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportManager; 