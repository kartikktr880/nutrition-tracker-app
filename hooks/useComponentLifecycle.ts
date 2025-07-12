import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
import { useEffect, useRef, useCallback } from 'react';

interface ComponentLifecycle {
  onMount?: () => void | Promise<void>;
  onUnmount?: () => void | Promise<void>;
  onUpdate?: (prevProps?: any, prevState?: any) => void | Promise<void>;
}

interface UseComponentLifecycleOptions {
  componentId: string;
  lifecycle: ComponentLifecycle;
  dependencies?: any[];
}

export const useComponentLifecycle = (options: UseComponentLifecycleOptions) => {
  const { componentId, lifecycle, dependencies = [] } = options;
  const isMounted = useRef(false);
  const prevDependencies = useRef(dependencies);

  const cleanup = useCallback(async () => {
    if (lifecycle.onUnmount) {
      try {
        const result = lifecycle.onUnmount();
        if (result && typeof result.catch === 'function') {
          await result;
        }
      } catch (error) {
        logError(`Error in component ${componentId} onUnmount:`, error);
      }
    }
  }, [componentId, lifecycle]);

  useEffect(() => {
    isMounted.current = true;
    
    if (lifecycle.onMount) {
      const result = lifecycle.onMount();
      if (result && typeof result.catch === 'function') {
        result.catch((error: any) => {
          logError(`Error in component ${componentId} onMount:`, error);
        });
      }
    }

    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, [componentId, lifecycle, cleanup]);

  useEffect(() => {
    if (isMounted.current && lifecycle.onUpdate) {
      const prevProps = prevDependencies.current;
      const result = lifecycle.onUpdate(prevProps, dependencies);
      if (result && typeof result.catch === 'function') {
        result.catch((error: any) => {
          logError(`Error in component ${componentId} onUpdate:`, error);
        });
      }
    }
    prevDependencies.current = dependencies;
  }, dependencies);

  return {
    isMounted: isMounted.current,
    cleanup
  };
}; 