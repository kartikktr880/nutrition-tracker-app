export class DateUtils {
    static formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', String(year))
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    static parseDate(dateString: string): Date {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date string');
        }
        return date;
    }

    static addDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static addMonths(date: Date, months: number): Date {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }

    static addYears(date: Date, years: number): Date {
        const result = new Date(date);
        result.setFullYear(result.getFullYear() + years);
        return result;
    }

    static isSameDay(date1: Date, date2: Date): boolean {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    static isToday(date: Date): boolean {
        return this.isSameDay(date, new Date());
    }

    static getStartOfDay(date: Date): Date {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    }

    static getEndOfDay(date: Date): Date {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
    }

    static getDaysBetween(date1: Date, date2: Date): number {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
    }
} 