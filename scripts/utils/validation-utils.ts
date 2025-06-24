export class ValidationUtils {
    static validateFoodEntry(entry: any): boolean {
        return (
            this.validateFoodName(entry.name) &&
            this.validateServingSize(entry.serving) &&
            this.validateNumeric(entry.calories) &&
            this.validateNumeric(entry.protein) &&
            this.validateNumeric(entry.carbs) &&
            this.validateNumeric(entry.fat)
        );
    }

    static validateMealEntry(meal: any): boolean {
        return (
            this.validateMealName(meal.name) &&
            Array.isArray(meal.foods) &&
            meal.foods.length > 0 &&
            this.isValidDate(meal.date)
        );
    }

    static validateUserProfile(profile: any): boolean {
        return (
            this.validateUserName(profile.name) &&
            this.validateNumeric(profile.age) &&
            profile.age > 0 &&
            this.validateNumeric(profile.weight) &&
            profile.weight > 0 &&
            this.validateNumeric(profile.height) &&
            profile.height > 0 &&
            ['sedentary', 'light', 'moderate', 'active', 'very-active'].includes(profile.activityLevel) &&
            Array.isArray(profile.goals) &&
            profile.goals.length > 0
        );
    }

    static validateNutritionGoals(goals: any): boolean {
        return (
            this.validateNumeric(goals.calories) &&
            goals.calories > 0 &&
            this.validateNumeric(goals.protein) &&
            goals.protein >= 0 &&
            this.validateNumeric(goals.carbs) &&
            goals.carbs >= 0 &&
            this.validateNumeric(goals.fat) &&
            goals.fat >= 0
        );
    }

    static validateDateRange(range: any): boolean {
        const start = new Date(range.start);
        const end = new Date(range.end);
        return (
            this.isValidDate(range.start) &&
            this.isValidDate(range.end) &&
            start <= end
        );
    }

    static validateServingSize(size: number): boolean {
        return this.validateNumeric(size) && size > 0;
    }

    static validateFoodName(name: string): boolean {
        return typeof name === 'string' && name.trim().length >= 2;
    }

    static validateMealName(name: string): boolean {
        return typeof name === 'string' && name.trim().length > 0;
    }

    static validateUserName(name: string): boolean {
        return typeof name === 'string' && name.trim().length >= 2;
    }

    static validateNumeric(value: any): boolean {
        return typeof value === 'number' && !isNaN(value);
    }

    static validateRequiredFields(data: any, requiredFields: string[]): boolean {
        return requiredFields.every(field => data[field] !== undefined && data[field] !== null);
    }

    static validateFieldTypes(data: any, fieldTypes: Record<string, string>): boolean {
        return Object.entries(fieldTypes).every(([field, type]) => {
            const value = data[field];
            switch (type) {
                case 'string': return typeof value === 'string';
                case 'number': return typeof value === 'number' && !isNaN(value);
                case 'boolean': return typeof value === 'boolean';
                case 'array': return Array.isArray(value);
                case 'object': return typeof value === 'object' && value !== null;
                default: return false;
            }
        });
    }

    static validateFieldRanges(data: any, fieldRanges: Record<string, { min: number; max: number }>): boolean {
        return Object.entries(fieldRanges).every(([field, { min, max }]) => {
            const value = data[field];
            return this.validateNumeric(value) && value >= min && value <= max;
        });
    }

    static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidPassword(password: string): boolean {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }

    static isValidPhoneNumber(phone: string): boolean {
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        return phoneRegex.test(phone);
    }

    static isValidURL(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static isValidDate(date: string): boolean {
        const dateObj = new Date(date);
        return dateObj instanceof Date && !isNaN(dateObj.getTime());
    }

    static isValidNumber(value: string | number): boolean {
        return !isNaN(Number(value));
    }

    static isValidInteger(value: string | number): boolean {
        return Number.isInteger(Number(value));
    }

    static isValidFloat(value: string | number): boolean {
        return !isNaN(Number(value)) && Number(value) % 1 !== 0;
    }

    static isValidHexColor(color: string): boolean {
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexRegex.test(color);
    }

    static isValidIPAddress(ip: string): boolean {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    static isValidCreditCard(cardNumber: string): boolean {
        // Luhn algorithm
        let sum = 0;
        let isEven = false;
        
        // Loop through values starting from the rightmost digit
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i));

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }

    static isValidSSN(ssn: string): boolean {
        const ssnRegex = /^(?!000|666)[0-8][0-9]{2}-(?!00)[0-9]{2}-(?!0000)[0-9]{4}$/;
        return ssnRegex.test(ssn);
    }

    static isValidZipCode(zipCode: string): boolean {
        const zipRegex = /^\d{5}(-\d{4})?$/;
        return zipRegex.test(zipCode);
    }

    static isValidUsername(username: string): boolean {
        // 3-20 characters, letters, numbers, underscores, hyphens
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        return usernameRegex.test(username);
    }

    static isValidDomain(domain: string): boolean {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        return domainRegex.test(domain);
    }

    static isValidTime(time: string): boolean {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
    }

    static isValidCurrency(amount: string): boolean {
        const currencyRegex = /^\$?\d+(\.\d{2})?$/;
        return currencyRegex.test(amount);
    }

    static isValidPercentage(value: string): boolean {
        const percentageRegex = /^100$|^[0-9]{1,2}$|^[0-9]{1,2}\.[0-9]{1,2}$/;
        return percentageRegex.test(value) && Number(value) >= 0 && Number(value) <= 100;
    }

    static isValidISBN(isbn: string): boolean {
        // Remove hyphens and spaces
        isbn = isbn.replace(/[-\s]/g, '');
        
        if (isbn.length !== 10 && isbn.length !== 13) {
            return false;
        }

        if (isbn.length === 10) {
            let sum = 0;
            for (let i = 0; i < 9; i++) {
                sum += (10 - i) * parseInt(isbn[i]);
            }
            const checkDigit = isbn[9] === 'X' ? 10 : parseInt(isbn[9]);
            sum += checkDigit;
            return sum % 11 === 0;
        } else {
            let sum = 0;
            for (let i = 0; i < 12; i++) {
                sum += (i % 2 === 0 ? 1 : 3) * parseInt(isbn[i]);
            }
            const checkDigit = parseInt(isbn[12]);
            return (10 - (sum % 10)) % 10 === checkDigit;
        }
    }
} 