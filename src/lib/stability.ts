/**
 * Stability Utilities for Production Scale (100+ concurrent users)
 * 
 * This module provides utilities to prevent common issues:
 * - Memory leaks from uncleared intervals/timeouts
 * - Excessive re-renders from unstable dependencies
 * - Race conditions in async operations
 * - Orphaned WebRTC connections
 */

/**
 * Creates a cleanup manager for tracking and clearing all intervals/timeouts
 * Usage: const cleanup = createCleanupManager(); cleanup.addInterval(id); cleanup.clear();
 */
export const createCleanupManager = () => {
  const intervals: NodeJS.Timeout[] = [];
  const timeouts: NodeJS.Timeout[] = [];
  const subscriptions: (() => void)[] = [];

  return {
    addInterval: (id: NodeJS.Timeout) => {
      intervals.push(id);
      return id;
    },
    addTimeout: (id: NodeJS.Timeout) => {
      timeouts.push(id);
      return id;
    },
    addSubscription: (unsubscribe: () => void) => {
      subscriptions.push(unsubscribe);
    },
    clear: () => {
      intervals.forEach(clearInterval);
      timeouts.forEach(clearTimeout);
      subscriptions.forEach(fn => fn());
      intervals.length = 0;
      timeouts.length = 0;
      subscriptions.length = 0;
    },
  };
};

/**
 * Debounce function for preventing excessive API calls
 * Critical for Lives page with 100+ viewers triggering updates
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
  let timeoutId: NodeJS.Timeout | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn;
};

/**
 * Throttle function for limiting execution frequency
 * Useful for heartbeat signals and presence updates
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
};

/**
 * Creates a stable array key for useEffect dependencies
 * Prevents unnecessary re-subscriptions when array contents don't actually change
 */
export const createStableArrayKey = (arr: string[]): string => {
  return [...arr].sort().join(',');
};

/**
 * Connection pool limiter for WebRTC
 * Prevents opening too many peer connections
 */
export class ConnectionPool {
  private connections: Map<string, RTCPeerConnection> = new Map();
  private maxConnections: number;

  constructor(maxConnections = 5) {
    this.maxConnections = maxConnections;
  }

  canAdd(): boolean {
    return this.connections.size < this.maxConnections;
  }

  add(id: string, connection: RTCPeerConnection): boolean {
    if (!this.canAdd()) {
      console.warn('[ConnectionPool] Max connections reached, cannot add:', id);
      return false;
    }
    this.connections.set(id, connection);
    return true;
  }

  remove(id: string): void {
    const conn = this.connections.get(id);
    if (conn) {
      conn.close();
      this.connections.delete(id);
    }
  }

  get(id: string): RTCPeerConnection | undefined {
    return this.connections.get(id);
  }

  clear(): void {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
  }

  get size(): number {
    return this.connections.size;
  }
}

/**
 * Safe setState wrapper that checks if component is still mounted
 */
export const createSafeSetState = () => {
  let isMounted = true;

  return {
    isMounted: () => isMounted,
    unmount: () => { isMounted = false; },
    safeSet: <T>(setter: React.Dispatch<React.SetStateAction<T>>, value: T | ((prev: T) => T)) => {
      if (isMounted) {
        setter(value as any);
      }
    },
  };
};

/**
 * Pagination helper for large data sets
 * Prevents loading 100+ items at once which causes UI freezes
 */
export interface PaginationState<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
}

export const createPaginationHelper = <T>(pageSize = 50) => {
  return {
    initialState: (): PaginationState<T> => ({
      items: [],
      page: 0,
      pageSize,
      hasMore: true,
      isLoading: false,
    }),
    
    appendItems: (state: PaginationState<T>, newItems: T[]): PaginationState<T> => ({
      ...state,
      items: [...state.items, ...newItems],
      page: state.page + 1,
      hasMore: newItems.length === state.pageSize,
      isLoading: false,
    }),
    
    reset: (pageSize: number): PaginationState<T> => ({
      items: [],
      page: 0,
      pageSize,
      hasMore: true,
      isLoading: false,
    }),
  };
};

/**
 * Request deduplication to prevent duplicate API calls
 */
export class RequestDeduplicator {
  private pending: Map<string, Promise<any>> = new Map();

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>;
    }

    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pending.clear();
  }
}
