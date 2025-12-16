/**
 * Robust API Utility with Error Handling, Retries, and Circuit Breaker
 * 
 * Features:
 * - Timeout handling (5 seconds default)
 * - Exponential backoff retry (max 3 retries)
 * - Circuit breaker pattern for failing endpoints
 * - Network connectivity check
 * - Request/response logging
 * - User-friendly error messages
 * - Fallback values support
 */

interface ApiOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  fallback?: any;
  enableCircuitBreaker?: boolean;
  enableLogging?: boolean;
  onError?: (error: Error) => void;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

// Circuit breaker storage (in-memory, resets on server restart)
const circuitBreakers = new Map<string, CircuitBreakerState>();

// Default circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5, // Open circuit after 5 failures
  resetTimeout: 60000, // Try again after 60 seconds
  halfOpenMaxAttempts: 3, // Allow 3 attempts in half-open state
};

/**
 * Check network connectivity
 */
function checkNetworkConnectivity(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: assume connected
    return true;
  }

  // Check if navigator.onLine is available
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }

  // Fallback: assume connected
  return true;
}

/**
 * Get circuit breaker state for an endpoint
 */
function getCircuitBreakerState(url: string): CircuitBreakerState {
  const key = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
  
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
    });
  }

  return circuitBreakers.get(key)!;
}

/**
 * Record a failure in circuit breaker
 */
function recordFailure(url: string): void {
  const state = getCircuitBreakerState(url);
  state.failures++;
  state.lastFailureTime = Date.now();

  if (state.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    state.state = 'open';
  }
}

/**
 * Record a success in circuit breaker
 */
function recordSuccess(url: string): void {
  const state = getCircuitBreakerState(url);
  state.failures = 0;
  state.state = 'closed';
}

/**
 * Check if circuit breaker allows request
 */
function isCircuitBreakerOpen(url: string): boolean {
  const state = getCircuitBreakerState(url);

  if (state.state === 'closed') {
    return false;
  }

  if (state.state === 'open') {
    const timeSinceLastFailure = Date.now() - state.lastFailureTime;
    if (timeSinceLastFailure > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
      // Move to half-open state
      state.state = 'half-open';
      state.failures = 0;
      return false;
    }
    return true; // Circuit is open, block request
  }

  // Half-open state: allow limited attempts
  if (state.failures < CIRCUIT_BREAKER_CONFIG.halfOpenMaxAttempts) {
    return false; // Allow request
  }

  // Too many failures in half-open, open circuit again
  state.state = 'open';
  state.lastFailureTime = Date.now();
  return true;
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Log request/response for debugging
 */
function logRequest(
  method: string,
  url: string,
  status?: number,
  duration?: number,
  error?: string
): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  const endpoint = urlObj.pathname;

  if (error) {
    console.error(`[API Error] ${method} ${endpoint} - ${error}${duration ? ` (${duration}ms)` : ''}`);
  } else if (status && duration) {
    const logLevel = duration > 2000 ? 'warn' : duration > 1000 ? 'log' : 'log';
    const emoji = status >= 500 ? '🔴' : status >= 400 ? '🟡' : '🟢';
    console[logLevel](`[API] ${emoji} ${method} ${endpoint} - ${status} (${duration}ms)`);
  } else {
    console.log(`[API] ${method} ${endpoint}`);
  }
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyError(error: Error, url: string): string {
  const errorMessage = (error instanceof Error ? error.message : 'An error occurred').toLowerCase();

  if (error.name === 'AbortError' || errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
    return 'Request timed out. Please check your connection and try again.';
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Network connection failed. Please check your internet connection.';
  }

  if (errorMessage.includes('cors')) {
    return 'Cross-origin request blocked. Please contact support.';
  }

  // Generic error
  return 'An error occurred while loading data. Please try again later.';
}

/**
 * Robust fetch wrapper with timeout, retries, and error handling
 */
export async function apiFetch<T = any>(
  url: string | URL,
  options: ApiOptions = {}
): Promise<T> {
  const {
    timeout = 5000,
    retries = 3,
    retryDelay = 1000,
    fallback,
    enableCircuitBreaker = true,
    enableLogging = true,
    onError,
    ...fetchOptions
  } = options;

  const urlString = typeof url === 'string' ? url : url.toString();
  const method = fetchOptions.method || 'GET';
  const startTime = Date.now();

  // Check network connectivity
  if (!checkNetworkConnectivity()) {
    const error = new Error('No network connection');
    if (enableLogging) {
      logRequest(method, urlString, undefined, undefined, error.message);
    }
    if (onError) {
      onError(error);
    }
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }

  // Check circuit breaker
  if (enableCircuitBreaker && isCircuitBreakerOpen(urlString)) {
    const error = new Error('Circuit breaker is open - endpoint is temporarily unavailable');
    if (enableLogging) {
      logRequest(method, urlString, undefined, undefined, error.message);
    }
    if (onError) {
      onError(error);
    }
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }

  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(urlString, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        // Check if response is ok
        if (!response.ok) {
          // Don't retry on client errors (4xx), only on server errors (5xx) and network errors
          const isClientError = response.status >= 400 && response.status < 500;
          const isServerError = response.status >= 500;

          if (isClientError && attempt < retries) {
            // For client errors, still retry but with longer delay
            const delay = calculateBackoffDelay(attempt, retryDelay);
            if (enableLogging) {
              logRequest(method, urlString, response.status, duration, `Client error, retrying in ${delay}ms`);
            }
            await sleep(delay);
            continue;
          }

          if (isServerError && attempt < retries) {
            // Server error - retry with exponential backoff
            const delay = calculateBackoffDelay(attempt, retryDelay);
            if (enableLogging) {
              logRequest(method, urlString, response.status, duration, `Server error, retrying in ${delay}ms`);
            }
            await sleep(delay);
            continue;
          }

          // Last attempt or non-retryable error
          const errorText = await response.text().catch(() => response.statusText);
          const error = new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
          
          if (enableCircuitBreaker && isServerError) {
            recordFailure(urlString);
          }

          if (enableLogging) {
            logRequest(method, urlString, response.status, duration, error.message);
          }

          if (onError) {
            onError(error);
          }

          if (fallback !== undefined) {
            return fallback;
          }

          throw error;
        }

        // Success - parse response
        let data: T;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          // For non-JSON responses, return text or blob
          const text = await response.text();
          data = text as unknown as T;
        }

        // Record success in circuit breaker
        if (enableCircuitBreaker) {
          recordSuccess(urlString);
        }

        if (enableLogging) {
          logRequest(method, urlString, response.status, duration);
        }

        return data;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Handle abort (timeout)
        if (fetchError.name === 'AbortError' || controller.signal.aborted) {
          lastError = new Error('Request timeout');
          
          if (attempt < retries) {
            const delay = calculateBackoffDelay(attempt, retryDelay);
            if (enableLogging) {
              logRequest(method, urlString, undefined, undefined, `Timeout, retrying in ${delay}ms`);
            }
            await sleep(delay);
            continue;
          }
        } else {
          lastError = fetchError;
          
          // Network errors - retry
          if (attempt < retries) {
            const delay = calculateBackoffDelay(attempt, retryDelay);
            if (enableLogging) {
              logRequest(method, urlString, undefined, undefined, `Network error, retrying in ${delay}ms`);
            }
            await sleep(delay);
            continue;
          }
        }
      }
    } catch (error) {
      // #region agent log
      const errorType = error instanceof Error ? 'Error' : typeof error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      fetch('http://127.0.0.1:7242/ingest/85fce644-efa2-4bb9-867e-84b2679df9a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:363',message:'Outer catch block error',data:{errorType,errorMessage,attempt,retries},timestamp:Date.now(),sessionId:'debug-session',runId:'api-run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this is the last attempt, break and throw
      if (attempt >= retries) {
        break;
      }

      // Wait before retry
      const delay = calculateBackoffDelay(attempt, retryDelay);
      if (enableLogging) {
        logRequest(method, urlString, undefined, undefined, `Error, retrying in ${delay}ms`);
      }
      await sleep(delay);
    }
  }

  // All retries exhausted
  if (enableCircuitBreaker) {
    recordFailure(urlString);
  }

  const finalError = lastError || new Error('Request failed after all retries');
  const userFriendlyMessage = getUserFriendlyError(finalError, urlString);

  if (enableLogging) {
    const duration = Date.now() - startTime;
    logRequest(method, urlString, undefined, duration, finalError.message);
  }

  if (onError) {
    onError(finalError);
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(userFriendlyMessage);
}

/**
 * Fetch JSON data with automatic retry and error handling
 */
export async function apiFetchJson<T = any>(
  url: string | URL,
  options: ApiOptions = {}
): Promise<T> {
  return apiFetch<T>(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Reset circuit breaker for an endpoint (useful for testing or manual recovery)
 */
export function resetCircuitBreaker(url: string): void {
  const key = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
  circuitBreakers.delete(key);
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear();
}

/**
 * Get circuit breaker status (for monitoring/debugging)
 */
export function getCircuitBreakerStatus(url: string): CircuitBreakerState | null {
  const key = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
  return circuitBreakers.get(key) || null;
}

