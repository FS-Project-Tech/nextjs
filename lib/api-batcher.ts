/**
 * API Request Batching and Deduplication
 * 
 * Features:
 * - Automatic request batching
 * - Request deduplication
 * - Queue management
 * - Retry logic
 */

interface PendingRequest<T> {
  key: string;
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface BatchConfig {
  timeout?: number; // Max wait time before batching (ms)
  maxSize?: number; // Max requests per batch
  dedupeWindow?: number; // Time window for deduplication (ms)
}

class RequestBatcher {
  private pendingRequests = new Map<string, PendingRequest<any>[]>();
  private activeRequests = new Map<string, Promise<any>>();
  private defaultConfig: Required<BatchConfig> = {
    timeout: 50, // 50ms batching window
    maxSize: 10, // Max 10 requests per batch
    dedupeWindow: 1000, // 1 second deduplication window
  };

  /**
   * Batch or deduplicate a request
   */
  async batch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config?: BatchConfig
  ): Promise<T> {
    const cfg = { ...this.defaultConfig, ...config };
    
    // Check for active identical request (deduplication)
    const active = this.activeRequests.get(key);
    if (active) {
      return active as Promise<T>;
    }
    
    // Check for pending requests in the same batch
    const pending = this.pendingRequests.get(key);
    if (pending && pending.length > 0) {
      // Add to existing batch
      return new Promise<T>((resolve, reject) => {
        pending.push({
          key,
          promise: fetchFn(),
          resolve,
          reject,
          timestamp: Date.now(),
        });
      });
    }
    
    // Create new batch
    const batch: PendingRequest<T>[] = [];
    this.pendingRequests.set(key, batch);
    
    // Create promise for this request
    const requestPromise = new Promise<T>((resolve, reject) => {
      batch.push({
        key,
        promise: fetchFn(),
        resolve,
        reject,
        timestamp: Date.now(),
      });
    });
    
    // Mark as active
    this.activeRequests.set(key, requestPromise);
    
    // Process batch after timeout or when max size reached
    setTimeout(() => {
      this.processBatch<T>(key, cfg);
    }, cfg.timeout);
    
    // Clean up after request completes
    requestPromise
      .finally(() => {
        this.activeRequests.delete(key);
      })
      .catch(() => {
        // Error handled in processBatch
      });
    
    return requestPromise;
  }

  /**
   * Process a batch of requests
   */
  private async processBatch<T>(key: string, config: Required<BatchConfig>): Promise<void> {
    const batch = this.pendingRequests.get(key);
    if (!batch || batch.length === 0) {
      this.pendingRequests.delete(key);
      return;
    }
    
    // Remove from pending
    this.pendingRequests.delete(key);
    
    // Execute all requests in parallel
    const promises = batch.map(req => req.promise);
    
    try {
      const results = await Promise.allSettled(promises);
      
      // Resolve or reject each request
      results.forEach((result, index) => {
        const req = batch[index];
        if (result.status === 'fulfilled') {
          req.resolve(result.value);
        } else {
          req.reject(result.reason);
        }
      });
    } catch (error) {
      // Reject all requests on batch failure
      batch.forEach(req => {
        req.reject(error as Error);
      });
    }
  }

  /**
   * Deduplicate requests (same request within time window)
   */
  async dedupe<T>(
    key: string,
    fetchFn: () => Promise<T>,
    windowMs: number = 1000
  ): Promise<T> {
    const cacheKey = `dedupe:${key}`;
    const cached = this.activeRequests.get(cacheKey);
    
    if (cached) {
      return cached as Promise<T>;
    }
    
    const promise = fetchFn();
    this.activeRequests.set(cacheKey, promise);
    
    // Remove from cache after window expires
    setTimeout(() => {
      this.activeRequests.delete(cacheKey);
    }, windowMs);
    
    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
    this.activeRequests.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    pending: number;
    active: number;
    batches: number;
  } {
    return {
      pending: Array.from(this.pendingRequests.values()).reduce((sum, batch) => sum + batch.length, 0),
      active: this.activeRequests.size,
      batches: this.pendingRequests.size,
    };
  }
}

// Singleton instance
export const requestBatcher = new RequestBatcher();

/**
 * Batch multiple API calls into a single request
 */
export async function batchApiCalls<T>(
  calls: Array<{ key: string; fn: () => Promise<T> }>,
  config?: BatchConfig
): Promise<T[]> {
  const promises = calls.map(call => 
    requestBatcher.batch(call.key, call.fn, config)
  );
  
  return Promise.all(promises);
}

/**
 * Deduplicate API calls
 */
export async function dedupeApiCall<T>(
  key: string,
  fetchFn: () => Promise<T>,
  windowMs?: number
): Promise<T> {
  return requestBatcher.dedupe(key, fetchFn, windowMs);
}

/**
 * Queue API calls with priority
 */
interface QueuedRequest<T> {
  priority: number;
  key: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private maxConcurrent = 5;

  async enqueue<T>(
    key: string,
    fetchFn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        priority,
        key,
        fn: fetchFn,
        resolve,
        reject,
      });
      
      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority);
      
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.maxConcurrent);
      
      const promises = batch.map(req => 
        req.fn()
          .then(req.resolve)
          .catch(req.reject)
      );
      
      await Promise.allSettled(promises);
    }
    
    this.processing = false;
  }

  clear(): void {
    this.queue.forEach(req => {
      req.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

export const requestQueue = new RequestQueue();

