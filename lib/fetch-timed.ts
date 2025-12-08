/**
 * Minimal Timed Fetch Wrapper
 * 
 * Simple wrapper that logs fetch timing
 */

export async function timedFetch(
  url: string | URL,
  options?: RequestInit
): Promise<Response> {
  const t0 = Date.now();
  const urlString = typeof url === 'string' ? url : url.toString();
  
  try {
    const res = await fetch(url, options);
    const t1 = Date.now();
    const duration = t1 - t0;
    
    console.log('fetch', urlString, 'took', duration, 'ms', `(${res.status})`);
    
    // Log warning for slow requests
    if (duration > 1000) {
      console.warn(`⚠️ Slow fetch: ${urlString} took ${duration}ms`);
    } else if (duration > 500) {
      console.warn(`⚠️ Moderate fetch: ${urlString} took ${duration}ms`);
    }
    
    return res;
  } catch (error) {
    const t1 = Date.now();
    const duration = t1 - t0;
    console.error('fetch', urlString, 'failed after', duration, 'ms:', (error instanceof Error ? error.message : 'An error occurred'));
    throw error;
  }
}

