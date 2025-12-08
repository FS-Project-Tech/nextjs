/**
 * API Payload Optimization Utilities
 * 
 * Features:
 * - Field selection utilities
 * - Response compression helpers
 * - Payload size monitoring
 * - Request optimization
 */

/**
 * Common field sets for different use cases
 */
export const FIELD_SETS = {
  // Minimal product data for listings
  productList: [
    'id',
    'name',
    'slug',
    'sku',
    'price',
    'regular_price',
    'sale_price',
    'on_sale',
    'images',
    'categories',
    'stock_status',
    'stock_quantity',
  ],
  
  // Full product data for detail pages
  productDetail: [
    'id',
    'name',
    'slug',
    'sku',
    'price',
    'regular_price',
    'sale_price',
    'on_sale',
    'description',
    'short_description',
    'images',
    'categories',
    'tags',
    'attributes',
    'variations',
    'stock_status',
    'stock_quantity',
    'manage_stock',
    'backorders',
    'weight',
    'dimensions',
  ],
  
  // Minimal category data
  categoryList: [
    'id',
    'name',
    'slug',
    'count',
    'image',
  ],
  
  // Full category data
  categoryDetail: [
    'id',
    'name',
    'slug',
    'description',
    'count',
    'image',
    'parent',
  ],
  
  // Search index fields
  searchIndex: [
    'id',
    'name',
    'slug',
    'sku',
    'price',
    'images',
    'categories',
    'attributes',
  ],
} as const;

/**
 * Build _fields parameter for WooCommerce API
 */
export function buildFieldsParam(fields: string[]): string {
  return fields.join(',');
}

/**
 * Optimize product query parameters
 */
export function optimizeProductParams(params: Record<string, any>, useCase: 'list' | 'detail' | 'search' = 'list'): Record<string, any> {
  const optimized: Record<string, any> = { ...params };
  
  // Add field selection based on use case
  if (!optimized._fields) {
    switch (useCase) {
      case 'list':
        optimized._fields = buildFieldsParam([...FIELD_SETS.productList]);
        break;
      case 'detail':
        optimized._fields = buildFieldsParam([...FIELD_SETS.productDetail]);
        break;
      case 'search':
        optimized._fields = buildFieldsParam([...FIELD_SETS.searchIndex]);
        break;
    }
  }
  
  // Remove unnecessary parameters
  delete optimized.fields; // Use _fields instead
  delete optimized.context; // Not needed for API calls
  
  return optimized;
}

/**
 * Optimize category query parameters
 */
export function optimizeCategoryParams(params: Record<string, any>, useCase: 'list' | 'detail' = 'list'): Record<string, any> {
  const optimized: Record<string, any> = { ...params };
  
  if (!optimized._fields) {
    optimized._fields = useCase === 'list' 
      ? buildFieldsParam([...FIELD_SETS.categoryList])
      : buildFieldsParam([...FIELD_SETS.categoryDetail]);
  }
  
  return optimized;
}

/**
 * Calculate payload size in bytes
 */
export function getPayloadSize(data: any): number {
  try {
    const json = JSON.stringify(data);
    return new Blob([json]).size;
  } catch {
    return 0;
  }
}

/**
 * Format payload size for display
 */
export function formatPayloadSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Monitor and log payload sizes
 */
export function monitorPayloadSize(endpoint: string, data: any, thresholdKB: number = 100): void {
  const size = getPayloadSize(data);
  const sizeKB = size / 1024;
  
  if (sizeKB > thresholdKB) {
    console.warn(`[API Optimizer] Large payload detected:`, {
      endpoint,
      size: formatPayloadSize(size),
      threshold: `${thresholdKB} KB`,
    });
  }
  
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API Optimizer] ${endpoint}: ${formatPayloadSize(size)}`);
  }
}

/**
 * Remove unnecessary fields from response
 */
export function minimizeResponse<T extends Record<string, any>>(
  data: T,
  allowedFields: string[]
): Partial<T> {
  const minimized: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in data) {
      minimized[field as keyof T] = data[field];
    }
  }
  
  return minimized;
}

/**
 * Batch multiple field selections
 */
export function batchFieldSelection(requests: Array<{ fields: string[] }>): string[] {
  const allFields = new Set<string>();
  
  for (const req of requests) {
    for (const field of req.fields) {
      allFields.add(field);
    }
  }
  
  return Array.from(allFields);
}

/**
 * Optimize image URLs (use smaller sizes when appropriate)
 */
export function optimizeImageUrl(url: string, size: 'thumbnail' | 'medium' | 'large' | 'full' = 'medium'): string {
  if (!url) return url;
  
  // If URL already has size parameter, return as-is
  if (url.includes('-') && /\d+x\d+/.test(url)) {
    return url;
  }
  
  // For WordPress/WooCommerce images, try to extract and modify
  // This is a simplified version - adjust based on your image structure
  return url;
}

/**
 * Compress response data (remove null/undefined, trim strings)
 */
export function compressResponse<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map(compressResponse) as T;
  }
  
  if (data && typeof data === 'object') {
    const compressed: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'string') {
          compressed[key] = value.trim();
        } else {
          compressed[key] = compressResponse(value);
        }
      }
    }
    return compressed as T;
  }
  
  return data;
}

