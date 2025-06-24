import { useEffect, useCallback, useRef } from 'react';
import { memoryManager } from '../memoryManager';

interface UseMemoryManagerOptions {
  type: 'subscription' | 'timer' | 'event' | 'request' | 'cache' | 'other';
  description: string;
  size?: number;
}

export function useMemoryManager(options: UseMemoryManagerOptions) {
  const resourceIds = useRef<string[]>([]);

  const registerResource = useCallback(async (
    cleanup: () => Promise<void>,
    description?: string,
    size?: number
  ) => {
    const id = await memoryManager.registerResource(
      options.type,
      cleanup,
      description || options.description,
      size || options.size
    );
    resourceIds.current.push(id);
    return id;
  }, [options.type, options.description, options.size]);

  const cleanupResource = useCallback(async (id: string) => {
    await memoryManager.cleanupResource(id);
    resourceIds.current = resourceIds.current.filter(resourceId => resourceId !== id);
  }, []);

  const touchResource = useCallback((id: string) => {
    memoryManager.touchResource(id);
  }, []);

  const cleanupAll = useCallback(async () => {
    const cleanupPromises = resourceIds.current.map(id => memoryManager.cleanupResource(id));
    await Promise.all(cleanupPromises);
    resourceIds.current = [];
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup all resources when component unmounts
      cleanupAll();
    };
  }, [cleanupAll]);

  return {
    registerResource,
    cleanupResource,
    touchResource,
    cleanupAll,
    getStats: memoryManager.getStats
  };
}

export default useMemoryManager; 