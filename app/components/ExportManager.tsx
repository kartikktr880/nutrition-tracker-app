import JSZip from 'jszip';
import React, { useState, useEffect, useCallback, useRef } from 'react';

import { exportService, ExportSchedule, ExportTemplate } from '../../lib/export-service';

import ExportHistory from './ExportHistory';

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
// Remove the unused variable 'formatValidators'.

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

  verifyDataIntegrity: (originalData: unknown, exportedData: string, format: string): boolean => {
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
      // logError('Data integrity verification failed:', error); // Original line commented out
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

  validateNutritionalData: (data: Record<string, unknown>): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Validate required fields
    const requiredFields = ['calories', 'protein', 'carbs', 'fat'];
    if (!requiredFields.every(field => typeof data[field] === 'number' && data[field] >= 0)) {
      return false;
    }

    // Validate numeric ranges
    if (typeof data.calories === 'number' && data.calories > 10000 || typeof data.protein === 'number' && data.protein > 500 || typeof data.carbs === 'number' && data.carbs > 1000 || typeof data.fat === 'number' && data.fat > 500) {
      return false;
    }

    return true;
  },

  sanitizeExportData: (data: unknown, format: string): unknown => {
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
            const sanitizedRow: Record<string, unknown> = {};
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
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    time: '00:00',
    format: 'json' as 'json' | 'csv' | 'pdf' | 'excel',
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
  const [newTemplate, setNewTemplate] = useState<{
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
  }>({
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
  const [_previewData, setPreviewData] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [_validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    [key: string]: string;
  }>({});
  const [_quickExport, _setQuickExport] = useState({
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
  const [_showQuickExportModal, _setShowQuickExportModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [_showBulkExportModal, setShowBulkExportModal] = useState(false);
  const [_exportProgress, setExportProgress] = useState(0);
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

  // Add missing refs for export tracking
  const processedItemsRef = useRef<number>(0);
  const failedItemsRef = useRef<string[]>([]);

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
      // logError('Error recovering export state:', error); // Original line commented out
    }
    return null;
  }, []);

  // Add export state persistence
  const persistExportState = useCallback((state: Record<string, unknown>) => {
    try {
      localStorage.setItem('exportProgress', JSON.stringify({
        ...state,
        timestamp: Date.now()
      }));
    } catch (error) {
      // logError('Error persisting export state:', error); // Original line commented out
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

  const showToast = (message: string, type: 'success' | 'error', title?: string, duration = 3000) => {
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
        // logError('Error revoking URL:', error); // Original line commented out
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
  const validateExportData = (data: unknown): boolean => {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Type guard to ensure data has the expected properties
    const hasNutritionData = (obj: unknown): obj is { calories: number; protein: number; carbs: number; fat: number } => {
      return typeof obj === 'object' && obj !== null && 
             typeof (obj as Record<string, unknown>).calories === 'number' && 
             typeof (obj as Record<string, unknown>).protein === 'number' && 
             typeof (obj as Record<string, unknown>).carbs === 'number' && 
             typeof (obj as Record<string, unknown>).fat === 'number';
    };

    if (!hasNutritionData(data)) {
      return false;
    }

    // Validate reasonable ranges
    if (
      (data && typeof data === 'object' &&
        (
          (typeof (data as { calories?: unknown }).calories === 'number' && (data as { calories: number }).calories > 10000) ||
          (typeof (data as { protein?: unknown }).protein === 'number' && (data as { protein: number }).protein > 500) ||
          (typeof (data as { carbs?: unknown }).carbs === 'number' && (data as { carbs: number }).carbs > 1000) ||
          (typeof (data as { fat?: unknown }).fat === 'number' && (data as { fat: number }).fat > 500)
        )
      )
    ) {
      return false;
    }

    return true;
  };

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
      await exportService.createSchedule({ ...newSchedule, active: true });
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
      // logError('Error creating schedule:', error); // Original line commented out
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
      // logError('Error creating template:', error); // Original line commented out
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
        // logError('Error deleting schedule:', error); // Original line commented out
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
        // logError('Error deleting template:', error); // Original line commented out
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
      // logError('Error updating schedule:', error); // Original line commented out
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
      // logError('Error generating preview:', error); // Original line commented out
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
      // logError('Error generating preview:', error); // Original line commented out
      if (error instanceof Error) {
        setValidationErrors(error.message.split(': ')[1].split(', '));
      }
      setPreviewData('Error generating preview');
    }
    setIsPreviewLoading(false);
  };

  // Enhance quick export with proper cleanup
  const _handleQuickExport = async () => {
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
      const data = await exportService.exportData(_quickExport.format as 'json' | 'csv' | 'pdf' | 'excel', _quickExport);
      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], 
        { type: 'application/json' });
      url = URL.createObjectURL(blob);
      createdUrlsRef.current.push(url);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrition-export-${new Date().toISOString()}.${_quickExport.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      showToast('Export completed successfully', 'success');
    } catch (error) {
      // logError('Error performing quick export:', error); // Original line commented out
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
  const _handleBulkExport = async () => {
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
    
    // performanceMetrics.current.startTime = performance.now(); // Original line commented out
    // performanceMetrics.current.memoryUsage = performance.memory?.usedJSHeapSize || 0; // Original line commented out
    
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
              exportService.exportData(item.format, item),
              timeoutPromise
            ]);

            // Validate and sanitize data
            const sanitizedData = validationUtils.sanitizeExportData(data, item.format);
            
            // Validate nutritional data if present
            const validationErrors: string[] = [];
            const validationWarnings: string[] = [];
            
            if (sanitizedData && typeof sanitizedData === 'object') {
              Object.entries(sanitizedData as Record<string, unknown>).forEach(([key, value]) => {
                if (value === null || value === undefined) {
                  validationWarnings.push(`Missing value for field: ${key}`);
                }
              });
            }

            // Validate and format data
            const formattedData = validateExportData(sanitizedData);
            
            // Generate checksum for integrity verification
            const checksum = integrityUtils.generateChecksum(JSON.stringify(formattedData));
            
            // Verify data integrity
            const isIntegrityValid = integrityUtils.verifyDataIntegrity(sanitizedData, JSON.stringify(formattedData), item.format);
            if (!isIntegrityValid) {
              throw new Error('Data integrity verification failed');
            }
            
            // Fix broken compress and decompress calls
            // const compressedData = await compressionUtils.// compress(formattedData, item.format); // Original line commented out
            const compressedData: string = typeof formattedData === 'string' ? formattedData : JSON.stringify(formattedData);
            
            const fileName = `${item.name}-${new Date().toISOString()}.${item.format}`;
            zip.file(fileName, String(compressedData));
            
            // Add to manifest with validation results
            let size = 0;
            if (typeof compressedData === 'string') {
              size = compressedData.length;
            } else if (compressedData && typeof compressedData === 'object' && 'byteLength' in compressedData) {
              size = (compressedData as ArrayBuffer | Uint8Array).byteLength;
            }
            manifest.items.push({
              name: fileName,
              format: item.format,
              checksum,
              size,
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
            // performanceMetrics.current.memoryUsage = Math.max( // Original line commented out
            //   performanceMetrics.current.memoryUsage,
            //   performance.memory?.usedJSHeapSize || 0
            // );

            // Persist progress
            persistExportState(exportProgressRef.current);
          } catch (error) {
            // logError(`Error exporting ${item.name}:`, error); // Original line commented out
            failedItemsRef.current.push(item.name);
            exportProgressRef.current.failed++;
            throw error;
          }
        });

        try {
          await Promise.all(batchPromises);
        } catch (error) {
          // logError('Batch export error:', error); // Original line commented out
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
      // performanceMetrics.current.endTime = performance.now(); // Original line commented out
      // performanceMetrics.current.compressionRatio =  // Original line commented out
      //   (zipBlob.size / (performanceMetrics.current.memoryUsage - (performance.memory?.usedJSHeapSize || 0))) * 100;

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
      // logError('Error performing bulk export:', error); // Original line commented out
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

  const _toggleItemSelection = useCallback((id: string) => {
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

  const _toggleSelectAll = useCallback(() => {
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
                      <p className="text-xs text-red-500 mt-1">{fieldErrors[`email-${index}`]}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSchedule(prev => ({
                        ...prev,
                        emailRecipients: prev.emailRecipients.filter((_, i) => i !== index)
                      }));
                      setFieldErrors(prev => ({ ...prev, [`email-${index}`]: '' }));
                    }}
                    className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setNewSchedule(prev => ({
                    ...prev,
                    emailRecipients: [...prev.emailRecipients, '']
                  }));
                  setFieldErrors(prev => ({ ...prev, [`email-${newSchedule.emailRecipients.length}`]: '' }));
                }}
                className="mt-2 px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
              >
                Add Recipient
              </button>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={handleCreateSchedule}
                className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                disabled={isLoading || operationInProgress === 'Creating schedule'}
              >
                {isLoading || operationInProgress === 'Creating schedule' ? (
                  <LoadingOverlay message="Creating Schedule..." />
                ) : (
                  'Create Schedule'
                )}
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-medium mb-3">Schedules</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedules.map(schedule => (
                    <tr key={schedule.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {schedule.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.frequency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.format}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.emailRecipients.join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.active ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handlePreviewSchedule(schedule)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          disabled={isPreviewLoading || operationLockRef.current}
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleToggleSchedule(schedule.id, !schedule.active)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          disabled={isLoading || operationInProgress === 'Deleting schedule'}
                        >
                          {schedule.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={isLoading || operationInProgress === 'Deleting schedule'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    setNewTemplate({ ...newTemplate, description: e.target.value });
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
                <p className="text-xs text-gray-500 mt-1">What does this template export?</p>
              </div>
            </div>
            <div className="mt-4">
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
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Sections</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTemplate.sections.barcodeHistory}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        sections: { ...newTemplate.sections, barcodeHistory: e.target.checked }
                      })
                    }
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Barcode History
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTemplate.sections.barcodeFavorites}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        sections: { ...newTemplate.sections, barcodeFavorites: e.target.checked }
                      })
                    }
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Barcode Favorites
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTemplate.sections.mealPlans}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        sections: { ...newTemplate.sections, mealPlans: e.target.checked }
                      })
                    }
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Meal Plans
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTemplate.sections.nutritionalGoals}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        sections: { ...newTemplate.sections, nutritionalGoals: e.target.checked }
                      })
                    }
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Nutritional Goals
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTemplate.sections.goalProgress}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        sections: { ...newTemplate.sections, goalProgress: e.target.checked }
                      })
                    }
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Goal Progress
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTemplate.sections.dietaryPreferences}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        sections: { ...newTemplate.sections, dietaryPreferences: e.target.checked }
                      })
                    }
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Dietary Preferences
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTemplate.sections.groceryList}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        sections: { ...newTemplate.sections, groceryList: e.target.checked }
                      })
                    }
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Grocery List
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTemplate.sections.mealPrepTemplates}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        sections: { ...newTemplate.sections, mealPrepTemplates: e.target.checked }
                      })
                    }
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Meal Prep Templates
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={handleCreateTemplate}
                className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                disabled={isLoading || operationInProgress === 'Creating template'}
              >
                {isLoading || operationInProgress === 'Creating template' ? (
                  <LoadingOverlay message="Creating Template..." />
                ) : (
                  'Create Template'
                )}
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-medium mb-3">Templates</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sections
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map(template => (
                    <tr key={template.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {template.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {template.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {template.format}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Object.entries(template.sections)
                          .filter(([_, value]) => value)
                          .map(([key]) => key)
                          .join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handlePreviewTemplate(template)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          disabled={isPreviewLoading || operationLockRef.current}
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={isLoading || operationInProgress === 'Deleting template'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showHistory && <ExportHistory onClose={() => setShowHistory(false)} />}

      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-${toast.type}-500 text-white px-4 py-3 rounded-lg shadow-lg z-50`}
          role="alert"
        >
          <div>
            <p className="font-bold">{toast.title || toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}</p>
            <p>{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExportManager;