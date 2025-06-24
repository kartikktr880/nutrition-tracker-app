export class ApiLayer {
    private cache: Map<string, { data: any; timestamp: number }>;
    private defaultTimeout: number;
    private defaultRetries: number;

    constructor() {
        this.cache = new Map();
        this.defaultTimeout = 5000;
        this.defaultRetries = 3;
    }

    async get(url: string, options: {
        headers?: Record<string, string>;
        timeout?: number;
        retries?: number;
        cache?: boolean;
        signal?: AbortSignal;
    } = {}): Promise<any> {
        return this.request(url, { ...options, method: 'GET' });
    }

    async post(url: string, data: any, options: {
        headers?: Record<string, string>;
        timeout?: number;
        retries?: number;
        cache?: boolean;
        signal?: AbortSignal;
    } = {}): Promise<any> {
        return this.request(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async request(url: string, options: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        timeout?: number;
        retries?: number;
        cache?: boolean;
        signal?: AbortSignal;
    } = {}): Promise<any> {
        const {
            method = 'GET',
            headers = {},
            body,
            timeout = this.defaultTimeout,
            retries = this.defaultRetries,
            cache = false,
            signal
        } = options;

        const cacheKey = `${method}:${url}:${body || ''}`;
        if (cache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)!;
            if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes cache
                return cached.data;
            }
        }

        let attempts = 0;
        while (attempts < retries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                if (signal) {
                    signal.addEventListener('abort', () => controller.abort());
                }

                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    },
                    body,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const error = await response.json().catch(() => ({
                        message: `${response.status} ${response.statusText}`
                    }));
                    throw new Error(error.message);
                }

                const data = await response.json();

                if (cache) {
                    this.cache.set(cacheKey, {
                        data,
                        timestamp: Date.now()
                    });
                }

                return data;
            } catch (error) {
                attempts++;
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                if (attempts === retries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }

        throw new Error('Max retries reached');
    }

    clearCache(): void {
        this.cache.clear();
    }

    setDefaultTimeout(timeout: number): void {
        this.defaultTimeout = timeout;
    }

    setDefaultRetries(retries: number): void {
        this.defaultRetries = retries;
    }
} 