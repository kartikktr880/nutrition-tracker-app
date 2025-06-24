// Input Validation Module
// Centralized validation and sanitization for all user inputs

class Validation {
  constructor() {
    this.patterns = {
      email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      password: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
      displayName: /^[a-zA-Z0-9\s]{2,50}$/,
      date: /^\d{4}-\d{2}-\d{2}$/,
      number: /^\d+(\.\d{1,2})?$/
    };

    this.errorMessages = {
      email: 'Please enter a valid email address',
      password: 'Password must be at least 8 characters long and contain both letters and numbers',
      displayName: 'Display name must be 2-50 characters long and contain only letters, numbers, and spaces',
      date: 'Please enter a valid date in YYYY-MM-DD format',
      number: 'Please enter a valid number',
      required: 'This field is required',
      maxLength: 'Input exceeds maximum length',
      minLength: 'Input is too short',
      invalidFormat: 'Invalid format'
    };
  }

  // Validate email
  validateEmail(email) {
    if (!email) return { valid: false, error: this.errorMessages.required };
    return {
      valid: this.patterns.email.test(email),
      error: this.errorMessages.email
    };
  }

  // Validate password
  validatePassword(password) {
    if (!password) return { valid: false, error: this.errorMessages.required };
    return {
      valid: this.patterns.password.test(password),
      error: this.errorMessages.password
    };
  }

  // Validate display name
  validateDisplayName(name) {
    if (!name) return { valid: false, error: this.errorMessages.required };
    return {
      valid: this.patterns.displayName.test(name),
      error: this.errorMessages.displayName
    };
  }

  // Validate date
  validateDate(date) {
    if (!date) return { valid: false, error: this.errorMessages.required };
    if (!this.patterns.date.test(date)) {
      return { valid: false, error: this.errorMessages.date };
    }
    
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    return {
      valid: dateObj.getFullYear() === year && 
             dateObj.getMonth() === month - 1 && 
             dateObj.getDate() === day,
      error: this.errorMessages.date
    };
  }

  // Validate number
  validateNumber(value, min = null, max = null) {
    if (!value) return { valid: false, error: this.errorMessages.required };
    if (!this.patterns.number.test(value)) {
      return { valid: false, error: this.errorMessages.number };
    }

    const num = parseFloat(value);
    if (min !== null && num < min) {
      return { valid: false, error: `Value must be at least ${min}` };
    }
    if (max !== null && num > max) {
      return { valid: false, error: `Value must be at most ${max}` };
    }

    return { valid: true };
  }

  // Sanitize string input
  sanitizeString(input) {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/[&]/g, '&amp;') // Encode ampersands
      .replace(/["]/g, '&quot;') // Encode quotes
      .replace(/[']/g, '&#x27;'); // Encode apostrophes
  }

  // Sanitize number input
  sanitizeNumber(input) {
    if (typeof input === 'number') return input;
    const num = parseFloat(input);
    return isNaN(num) ? 0 : num;
  }

  // Validate food log entry
  validateFoodLogEntry(entry) {
    if (!entry) return { valid: false, error: 'Food log entry is required' };

    const requiredFields = ['name', 'amount', 'unit'];
    const missingFields = requiredFields.filter(field => !entry[field]);
    
    if (missingFields.length > 0) {
      return {
        valid: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    // Validate amount
    const amountValidation = this.validateNumber(entry.amount, 0);
    if (!amountValidation.valid) {
      return amountValidation;
    }

    // Validate name length
    if (entry.name.length > 100) {
      return {
        valid: false,
        error: 'Food name is too long'
      };
    }

    return { valid: true };
  }

  // Validate user profile update
  validateProfileUpdate(profile) {
    if (!profile) return { valid: false, error: 'Profile data is required' };

    const validations = {
      displayName: this.validateDisplayName(profile.displayName),
      calorieGoal: this.validateNumber(profile.calorieGoal, 0, 10000),
      proteinGoal: this.validateNumber(profile.proteinGoal, 0, 1000),
      carbsGoal: this.validateNumber(profile.carbsGoal, 0, 1000),
      fatGoal: this.validateNumber(profile.fatGoal, 0, 1000)
    };

    const errors = Object.entries(validations)
      .filter(([_, validation]) => !validation.valid)
      .map(([field, validation]) => `${field}: ${validation.error}`);

    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : null
    };
  }
}

// Export singleton instance
export const validation = new Validation(); 