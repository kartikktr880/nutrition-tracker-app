import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiLayer } from '../scripts/utils/api-layer.ts';

describe('ApiLayer', () => {
    let apiLayer;
    const mockResponse = { data: 'test' };

    beforeEach(() => {
        apiLayer = new ApiLayer();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should handle successful API requests', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        const response = await apiLayer.get('/test');

        expect(response).toEqual(mockResponse);
        expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
            method: 'GET',
            headers: expect.any(Object),
            signal: expect.any(Object)
        }));
    });

    it('should handle API errors', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ message: 'Bad Request' })
        });

        await expect(apiLayer.get('/test')).rejects.toThrow('Bad Request');
    });

    it('should handle request timeouts', async () => {
        vi.useFakeTimers();
        const timeoutPromise = new Promise(() => {});
        global.fetch.mockImplementationOnce(() => timeoutPromise);

        const requestPromise = apiLayer.get('/test');
        vi.advanceTimersByTime(5000);

        await expect(requestPromise).rejects.toThrow('Request timeout');
        vi.useRealTimers();
    });

    it('should handle request retries', async () => {
        global.fetch
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

        const response = await apiLayer.get('/test', { retries: 1 });
        expect(response).toEqual(mockResponse);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle request caching', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        const response1 = await apiLayer.get('/test', { cache: true });
        const response2 = await apiLayer.get('/test', { cache: true });

        expect(response1).toEqual(mockResponse);
        expect(response2).toEqual(mockResponse);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle request cancellation', async () => {
        vi.useFakeTimers();
        const controller = new AbortController();
        const timeoutPromise = new Promise(() => {});
        global.fetch.mockImplementationOnce(() => timeoutPromise);

        const requestPromise = apiLayer.get('/test', { signal: controller.signal });
        controller.abort();
        vi.advanceTimersByTime(100);

        await expect(requestPromise).rejects.toThrow('Request aborted');
        vi.useRealTimers();
    });

    it('should handle request headers', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        await apiLayer.get('/test', {
            headers: {
                'Authorization': 'Bearer token'
            }
        });

        expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
            headers: expect.objectContaining({
                'Authorization': 'Bearer token',
                'Content-Type': 'application/json'
            })
        }));
    });

    it('should handle request body', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        const body = { key: 'value' };
        await apiLayer.post('/test', body);

        expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(body),
            headers: expect.any(Object)
        }));
    });

    it('should handle error parsing', async () => {
        const mockError = { message: 'Error message' };
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: () => Promise.resolve(mockError)
        });

        await expect(apiLayer.get('/test')).rejects.toThrow('Error message');
    });
}); 