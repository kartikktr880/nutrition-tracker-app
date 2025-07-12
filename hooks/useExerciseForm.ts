import { useState } from 'react';

interface ExerciseFormData {
  [key: string]: any;
}

interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

interface UseExerciseFormReturn {
  formData: ExerciseFormData;
  setFormData: (data: ExerciseFormData) => void;
  submitting: boolean;
  submitted: boolean;
  validationErrors: string[];
  error: string | null;
  submitForm: () => Promise<void>;
  validateForm: () => Promise<boolean>;
  resetForm: () => void;
}

export const useExerciseForm = (initialData: ExerciseFormData, exerciseFormService: any): UseExerciseFormReturn => {
  const [formData, setFormData] = useState<ExerciseFormData>(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateForm = async (): Promise<boolean> => {
    try {
      const validationResult: ValidationResult = await exerciseFormService.validateForm(formData);
      setValidationErrors(validationResult.errors || []);
      return validationResult.isValid;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Validation failed');
      return false;
    }
  };

  const submitForm = async (): Promise<void> => {
    try {
      setSubmitting(true);
      const isValid = await validateForm();
      if (!isValid) return;
      await exerciseFormService.submitForm(formData);
      setSubmitted(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = (): void => {
    setFormData(initialData);
    setValidationErrors([]);
    setSubmitted(false);
    setError(null);
  };

  return {
    formData,
    setFormData,
    submitting,
    submitted,
    validationErrors,
    error,
    submitForm,
    validateForm,
    resetForm
  };
}; 