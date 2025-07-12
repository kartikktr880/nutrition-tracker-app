import { logError, logWarn, logInfo, logDebug } from '../../utils/logger';
export class APIUtils {
    private static state = {
        cache: new Map<string, any>(),
        errorQueue: [] as Array<{ error: Error; timestamp: number }>,
        retryCount: 0,
        maxRetries: 3,
        observers: new Set<(data: any) => void>()
    };

    static async request<T>(url: string, options: RequestInit = {}): Promise<T> {
        try {
            const cacheKey = this.generateCacheKey(url, options);
            const cachedResponse = this.state.cache.get(cacheKey);
            
            if (cachedResponse && !this.isCacheExpired(cachedResponse)) {
                return cachedResponse.data;
            }

            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.state.cache.set(cacheKey, {
                data,
                timestamp: Date.now(),
                expiresIn: 5 * 60 * 1000 // 5 minutes
            });

            return data;
        } catch (error) {
            if (error instanceof Error) {
                this.handleError(error);
            } else {
                this.handleError(new Error(String(error)));
            }
            throw error;
        }
    }

    static async retryRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
        while (this.state.retryCount < this.state.maxRetries) {
            try {
                const result = await this.request<T>(url, options);
                this.state.retryCount = 0;
                return result;
            } catch (error) {
                this.state.retryCount++;
                if (this.state.retryCount === this.state.maxRetries) {
                    throw error;
                }
                await this.delay(Math.pow(2, this.state.retryCount) * 1000);
            }
        }
        throw new Error('retryRequest failed: max retries exceeded');
    }

    private static handleError(error: Error): void {
        this.state.errorQueue.push({
            error,
            timestamp: Date.now()
        });

        this.cleanupErrorQueue();
        this.notifyObservers({
            type: 'apiError',
            error: error.message,
            retryCount: this.state.retryCount
        });
    }

    private static cleanupErrorQueue(): void {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.state.errorQueue = this.state.errorQueue.filter(
            entry => entry.timestamp > oneHourAgo
        );
    }

    private static generateCacheKey(url: string, options: RequestInit): string {
        return `${url}-${JSON.stringify(options)}`;
    }

    private static isCacheExpired(cacheEntry: { timestamp: number; expiresIn: number }): boolean {
        return Date.now() - cacheEntry.timestamp > cacheEntry.expiresIn;
    }

    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static addObserver(callback: (data: any) => void): void {
        this.state.observers.add(callback);
    }

    static removeObserver(callback: (data: any) => void): void {
        this.state.observers.delete(callback);
    }

    private static notifyObservers(data: any): void {
        this.state.observers.forEach(observer => {
            try {
                observer(data);
            } catch (error) {
                logError('Error in API observer:', error);
            }
        });
    }

    static clearCache(): void {
        this.state.cache.clear();
    }

    static getErrorQueue(): Array<{ error: Error; timestamp: number }> {
        return [...this.state.errorQueue];
    }

    static resetRetryCount(): void {
        this.state.retryCount = 0;
    }

    static setMaxRetries(maxRetries: number): void {
        this.state.maxRetries = maxRetries;
    }
} 