/**
 * Middleware Route Tracker
 * 
 * Tracks route execution times for Next.js App Router
 */

import { routeMonitor } from './monitoring/route-performance';

/**
 * Wrap Next.js API route handler with performance tracking
 */
export function trackApiRoute<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  route: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    let fetchCount = 0;
    let fetchTime = 0;
    let error: string | undefined;

    // Track fetch calls
    const originalFetch = global.fetch;
    const fetchStartTimes = new Map<Promise<Response>, number>();

    global.fetch = async (...fetchArgs: any[]) => {
      const fetchStart = Date.now();
      fetchCount++;
      const fetchPromise = originalFetch(fetchArgs[0] as RequestInfo | URL, fetchArgs[1] as RequestInit | undefined);
      fetchStartTimes.set(fetchPromise, fetchStart);
      
      try {
        const response = await fetchPromise;
        const fetchDuration = Date.now() - fetchStart;
        fetchTime += fetchDuration;
        fetchStartTimes.delete(fetchPromise);
        return response;
      } catch (err: any) {
        const fetchDuration = Date.now() - fetchStart;
        fetchTime += fetchDuration;
        fetchStartTimes.delete(fetchPromise);
        throw err;
      }
    };

    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;
      
      routeMonitor.track(route, 'api', duration, fetchCount, fetchTime);
      
      return result;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      error = err.message || 'Unknown error';
      
      routeMonitor.track(route, 'api', duration, fetchCount, fetchTime, error);
      
      throw err;
    } finally {
      // Restore original fetch
      global.fetch = originalFetch;
    }
  }) as T;
}

/**
 * Track server component execution
 */
export async function trackServerComponent<T>(
  componentName: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let fetchCount = 0;
  let fetchTime = 0;
  let error: string | undefined;

  // Track fetch calls
  const originalFetch = global.fetch;
  const fetchStartTimes = new Map<Promise<Response>, number>();

  global.fetch = async (...fetchArgs: any[]) => {
    const fetchStart = Date.now();
    fetchCount++;
    const fetchPromise = originalFetch(fetchArgs[0] as RequestInfo | URL, fetchArgs[1] as RequestInit | undefined);
    fetchStartTimes.set(fetchPromise, fetchStart);
    
    try {
      const response = await fetchPromise;
      const fetchDuration = Date.now() - fetchStart;
      fetchTime += fetchDuration;
      fetchStartTimes.delete(fetchPromise);
      return response;
    } catch (err: any) {
      const fetchDuration = Date.now() - fetchStart;
      fetchTime += fetchDuration;
      fetchStartTimes.delete(fetchPromise);
      throw err;
    }
  };

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    routeMonitor.track(componentName, 'page', duration, fetchCount, fetchTime);
    
    return result;
  } catch (err: any) {
    const duration = Date.now() - startTime;
    error = err.message || 'Unknown error';
    
    routeMonitor.track(componentName, 'page', duration, fetchCount, fetchTime, error);
    
    throw err;
  } finally {
    // Restore original fetch
    global.fetch = originalFetch;
  }
}

