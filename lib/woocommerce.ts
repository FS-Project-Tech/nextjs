import axios from 'axios';
import { validateEnvironmentVariables } from './env-validation';

// Validate environment variables (server-side only)
if (typeof window === 'undefined') {
  const envCheck = validateEnvironmentVariables();
  if (!envCheck.valid) {
    if (envCheck.missing.length > 0) {
      console.error('❌ Missing required environment variables:', envCheck.missing.join(', '));
    }
    if (envCheck.invalid.length > 0) {
      console.error('❌ Invalid environment variables:');
      envCheck.invalid.forEach(({ name, reason }) => {
        console.error(`  - ${name}: ${reason}`);
      });
    }
    // Don't throw in development to allow graceful degradation
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Environment variable validation failed. Please check your .env.local file.');
    }
  }
}

const API_URL = process.env.WC_API_URL;
const CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;

// WooCommerce API Client with timeout configuration
const WOOCOMMERCE_TIMEOUT = parseInt(process.env.WOOCOMMERCE_API_TIMEOUT || '30000', 10); // Default 30 seconds

const wcAPI = axios.create({
  baseURL: API_URL,
  auth: {
    username: CONSUMER_KEY || '',
    password: CONSUMER_SECRET || '',
  },
  timeout: WOOCOMMERCE_TIMEOUT, // Configurable timeout (default 30s)
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure cookies are sent with requests (for session management)
  withCredentials: true,
});

// Some hosts disable Basic Auth for the REST API. Ensure keys are also sent as query params.
// WooCommerce accepts consumer_key/consumer_secret in the query string.
wcAPI.defaults.params = {
  ...(wcAPI.defaults.params || {}),
  consumer_key: CONSUMER_KEY || '',
  consumer_secret: CONSUMER_SECRET || '',
};

// Add request interceptor for WooCommerce session and performance tracking (server-side only)
if (typeof window === 'undefined') {
  try {
    const { fetchMonitor } = require('./monitoring/fetch-instrumentation');
    
    wcAPI.interceptors.request.use(
      async (config) => {
        // Store start time in config metadata
        (config as any).__startTime = Date.now();
        
        // Add WooCommerce session header if available
        try {
          const { getWCSessionHeaders } = await import('./woocommerce-session');
          const sessionHeaders = await getWCSessionHeaders();
          if (sessionHeaders['X-WC-Session']) {
            config.headers = config.headers || {};
            config.headers['X-WC-Session'] = sessionHeaders['X-WC-Session'];
          }
        } catch (sessionError) {
          // Silently fail if session not available
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Performance tracking response interceptor (runs first)
    wcAPI.interceptors.response.use(
      (response) => {
        const config = response.config as any;
        if (config.__startTime) {
          const duration = Date.now() - config.__startTime;
          const url = `${wcAPI.defaults.baseURL}${config.url || ''}`;
          fetchMonitor.track(
            url,
            config.method?.toUpperCase() || 'GET',
            duration,
            response.status,
            config.__route,
            false,
            undefined
          );
        }
        return response;
      },
      (error) => {
        const config = error.config as any;
        if (config?.__startTime) {
          const duration = Date.now() - config.__startTime;
          const url = `${wcAPI.defaults.baseURL}${config.url || ''}`;
          fetchMonitor.track(
            url,
            config.method?.toUpperCase() || 'GET',
            duration,
            error.response?.status,
            config.__route,
            false,
            (error instanceof Error ? error.message : 'An error occurred') || 'Unknown error'
          );
        }
        return Promise.reject(error); // Continue to error handler
      }
    );
  } catch (error) {
    // Silently fail if monitoring not available
    if (process.env.NODE_ENV === 'development') {
      console.warn('Performance monitoring not available:', error);
    }
  }
}

// Add response interceptor for better error handling (runs after performance tracking)
wcAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log API errors for debugging
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const url = error.config?.url || 'Unknown URL';
      
      if (status === 401 || status === 403) {
        console.error('WooCommerce API Authentication Error:', {
          status,
          message: data?.message || 'Invalid API credentials',
          code: data?.code,
          url,
        });
      } else if (status === 500) {
        // Check if it's a known backend issue (Redis, etc.)
        const errorMessage = data?.message || error.message || '';
        const isKnownBackendIssue = 
          typeof errorMessage === 'string' && (
            errorMessage.includes('Redis') || 
            errorMessage.includes('object-cache') ||
            errorMessage.includes('wp_die')
          );
        
        if (isKnownBackendIssue) {
          // Only log in development - these are handled gracefully
          if (process.env.NODE_ENV === 'development') {
            console.warn('WooCommerce Backend Issue (handled gracefully):', {
              status,
              message: typeof errorMessage === 'string' ? errorMessage.substring(0, 150) : 'Backend configuration issue',
              url,
              code: data?.code,
            });
          }
          // Still reject the promise so fetchProducts can handle it
          return Promise.reject(error);
        }
        
        // Log full details for unknown 500 errors
        const errorDetails: Record<string, any> = {
          status: status || 'Unknown',
          statusText: error.response?.statusText || 'Internal Server Error',
          url: url,
          message: data?.message || error.message || 'Internal server error',
        };
        
        // Add code if available
        if (data?.code) {
          errorDetails.code = data.code;
        }
        
        // Add params if available
        if (error.config?.params && Object.keys(error.config.params).length > 0) {
          errorDetails.params = error.config.params;
        }
        
        // Handle response data - check if it's actually empty
        if (data !== undefined && data !== null) {
          if (typeof data === 'string' && data.trim().length > 0) {
            errorDetails.responseBody = data;
          } else if (typeof data === 'object') {
            const dataKeys = Object.keys(data);
            if (dataKeys.length > 0) {
              errorDetails.responseData = data;
            } else {
              // Empty object - don't add it, just note it
              errorDetails.note = 'Server returned empty object response';
            }
          } else if (data !== '') {
            errorDetails.responseData = String(data);
          }
        }
        
        // Always log - we guarantee at least status, statusText, url, and message
        console.error('WooCommerce API Server Error:', JSON.stringify(errorDetails, null, 2));
      } else {
        // Log other errors - always include basic fields
        const errorInfo: Record<string, any> = {
          status: status || 'Unknown',
          statusText: error.response?.statusText || 'Error',
          url: url,
          message: data?.message || error.message || `HTTP ${status} error`,
        };
        
        if (data?.code) {
          errorInfo.code = data.code;
        }
        
        // Handle response data
        if (data !== undefined && data !== null) {
          if (typeof data === 'string' && data.trim().length > 0) {
            errorInfo.responseBody = data;
          } else if (typeof data === 'object' && Object.keys(data).length > 0) {
            errorInfo.responseData = data;
          } else if (typeof data === 'object' && Object.keys(data).length === 0) {
            errorInfo.note = 'Server returned empty object response';
          }
        }
        
        // Always log with guaranteed fields
        console.error('WooCommerce API Error:', JSON.stringify(errorInfo, null, 2));
      }
    } else if (error.request) {
      // Request was made but no response received
      const isTimeoutError = error.code === 'ECONNABORTED' || 
                            error.code === 'ETIMEDOUT' ||
                            error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                            error.message?.toLowerCase().includes('timeout') ||
                            error.message?.toLowerCase().includes('exceeded') ||
                            error.message?.toLowerCase().includes('aborted') ||
                            error.message?.includes('Connect Timeout');
      
      // Only log non-timeout network errors in development mode
      if (process.env.NODE_ENV === 'development' && !isTimeoutError) {
        const errorInfo: Record<string, any> = {
          message: error.message || 'No response from server',
          url: error.config?.url || 'Unknown URL',
        };
        
        // Only add additional info if available
        if (error.code) {
          errorInfo.code = error.code;
        }
        if (error.config?.method) {
          errorInfo.method = error.config.method;
        }
        
        // Only log if we have meaningful information
        if (errorInfo.message && errorInfo.url) {
          console.warn('WooCommerce API Network Error (handled gracefully):', errorInfo);
        }
      }
      // Timeout errors are silently handled - components will show empty states
    } else {
      // Error setting up the request
      console.error('WooCommerce API Request Setup Error:', error.message || 'Unknown error');
    }
    return Promise.reject(error);
  }
);

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  on_sale: boolean;
  status: string;
  featured: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: any[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: any[];
  default_attributes: any[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: any[];
}

export interface WooCommerceVariationAttribute {
  id?: number;
  name: string; // e.g., 'Color'
  option: string; // e.g., 'Red'
}

export interface WooCommerceVariation {
  id: number;
  sku: string | null;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  tax_status?: string;
  tax_class?: string;
  image?: { id: number; src: string; name: string; alt: string } | null;
  attributes: WooCommerceVariationAttribute[];
  stock_status: string;
}

// NEW: Paginated response interface
export interface PaginatedProductResponse {
  products: WooCommerceProduct[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

// UPDATED: Fetch all products with pagination support
export const fetchProducts = async (params?: {
  per_page?: number;
  page?: number;
  orderby?: string;
  order?: string;
  category?: string | number;
  search?: string;
  featured?: boolean;
  categorySlug?: string;
  categories?: string;
  brands?: string;
  tags?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: string;
  include?: number[];  // Fetch specific product IDs
}): Promise<PaginatedProductResponse> => {
  try {
    // Clean up params
    const cleanParams: any = {};
    
    // Basic pagination
    if (params?.per_page !== undefined && params.per_page > 0) {
      cleanParams.per_page = params.per_page;
    } else {
      cleanParams.per_page = 24; // Default
    }
    
    if (params?.page !== undefined && params.page > 0) {
      cleanParams.page = params.page;
    } else {
      cleanParams.page = 1; // Default
    }
    
    // Handle sortBy mapping
    if (params?.sortBy) {
      switch (params.sortBy) {
        case 'price_low':
          cleanParams.orderby = 'price';
          cleanParams.order = 'asc';
          break;
        case 'price_high':
          cleanParams.orderby = 'price';
          cleanParams.order = 'desc';
          break;
        case 'newest':
          cleanParams.orderby = 'date';
          cleanParams.order = 'desc';
          break;
        case 'rating':
          cleanParams.orderby = 'rating';
          cleanParams.order = 'desc';
          break;
        case 'popularity':
          cleanParams.orderby = 'popularity';
          cleanParams.order = 'desc';
          break;
        default:
          cleanParams.orderby = 'menu_order';
          cleanParams.order = 'asc';
      }
    } else {
      // Validate and set orderby/order if provided directly
      const validOrderBy = ['date', 'id', 'include', 'title', 'slug', 'price', 'popularity', 'rating', 'menu_order'];
      if (params?.orderby && validOrderBy.includes(params.orderby)) {
        cleanParams.orderby = params.orderby;
      }
      
      if (params?.order && ['asc', 'desc'].includes(params.order.toLowerCase())) {
        cleanParams.order = params.order.toLowerCase();
      }
    }
    
    // Helper to resolve category slug to ID
    const resolveCategorySlug = async (slug: string): Promise<number | null> => {
      try {
        const response = await wcAPI.get('/products/categories', { params: { slug } });
        const categories = response.data;
        if (categories?.length) {
          console.log(`🏷️ Resolved category slug "${slug}" → ID ${categories[0].id}`);
          return categories[0].id;
        }
        console.warn(`⚠️ Category slug "${slug}" not found`);
        return null;
      } catch (error) {
        console.warn(`⚠️ Failed to resolve category slug "${slug}":`, error instanceof Error ? error.message : 'Unknown error');
        return null;
      }
    };
    
    // Handle category filtering - resolve slug to ID if needed
    let categoryId: number | undefined;
    
    if (params?.category !== undefined && params.category !== '' && params.category !== null) {
      // Direct category ID or slug provided
      const catVal = String(params.category);
      const parsed = parseInt(catVal, 10);
      if (!isNaN(parsed)) {
        categoryId = parsed;
      } else {
        // It's a slug, resolve to ID
        const resolved = await resolveCategorySlug(catVal);
        if (resolved) categoryId = resolved;
      }
    } else if (params?.categorySlug) {
      // Category slug provided, must resolve to ID
      const resolved = await resolveCategorySlug(params.categorySlug);
      if (resolved) categoryId = resolved;
    } else if (params?.categories) {
      // Multiple categories - check if it's IDs or slugs
      const catVal = String(params.categories);
      const parsed = parseInt(catVal, 10);
      if (!isNaN(parsed)) {
        categoryId = parsed;
      } else {
        const resolved = await resolveCategorySlug(catVal);
        if (resolved) categoryId = resolved;
      }
    }
    
    if (categoryId !== undefined) {
      cleanParams.category = categoryId;
    }
    
    // Handle brand filtering (adjust attribute name based on your setup)
    if (params?.brands) {
      cleanParams.attribute = 'pa_brand';
      cleanParams.attribute_term = params.brands;
    }
    
    // Handle tags
    if (params?.tags) {
      cleanParams.tag = params.tags;
    }
    
    // Handle price range
    if (params?.minPrice) {
      cleanParams.min_price = params.minPrice;
    }
    if (params?.maxPrice) {
      cleanParams.max_price = params.maxPrice;
    }
    
    // Handle search
    if (params?.search && params.search.trim()) {
      cleanParams.search = params.search.trim();
    }
    
    // Convert boolean to 1/0 for WooCommerce API
    if (params?.featured !== undefined) {
      cleanParams.featured = params.featured ? 1 : 0;
    }
    
    // Handle include parameter (fetch specific product IDs)
    if (params?.include && params.include.length > 0) {
      cleanParams.include = params.include.join(',');
      // When fetching specific IDs, ensure we get all of them
      cleanParams.per_page = Math.max(cleanParams.per_page || 24, params.include.length);
    }
    
    console.log('🛒 WooCommerce Request:', {
      endpoint: '/products',
      params: cleanParams,
    });
    
    const response = await wcAPI.get('/products', { params: cleanParams });
    
    // Extract pagination data from headers
    const total = parseInt(response.headers['x-wp-total'] || '0', 10);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
    
    console.log('✅ WooCommerce Response:', {
      productsCount: response.data?.length || 0,
      total,
      totalPages,
      page: cleanParams.page,
    });
    
    return {
      products: response.data || [],
      total,
      totalPages,
      page: cleanParams.page,
      perPage: cleanParams.per_page,
    };
  } catch (error: any) {
    const isTimeoutError = error.code === 'ECONNABORTED' || 
                          error.code === 'ETIMEDOUT' ||
                          error.message?.toLowerCase().includes('timeout') ||
                          error.message?.toLowerCase().includes('exceeded') ||
                          error.message?.toLowerCase().includes('aborted');
    
    if (!error.response && process.env.NODE_ENV === 'development' && !isTimeoutError) {
      console.warn('Network error fetching products (handled gracefully):', {
        message: error.message,
        url: error.config?.url,
      });
    }
    
    return {
      products: [],
      total: 0,
      totalPages: 0,
      page: params?.page || 1,
      perPage: params?.per_page || 24,
    };
  }
};

// Fetch a single product by ID
export const fetchProduct = async (id: number): Promise<WooCommerceProduct> => {
  try {
    const response = await wcAPI.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

// Fetch a single product by slug
export const fetchProductBySlug = async (slug: string): Promise<WooCommerceProduct | null> => {
  // Validate slug input
  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    return null;
  }

  try {
    const response = await wcAPI.get('/products', { params: { slug: slug.trim() } });
    const products: WooCommerceProduct[] = response.data;
    
    if (!Array.isArray(products)) {
      return null;
    }
    
    return products.length > 0 ? products[0] : null;
  } catch (error: any) {
    // Check for timeout/network errors (expected, handle gracefully)
    const isTimeoutError = 
      error?.code === 'ECONNABORTED' || 
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      error?.message?.toLowerCase?.()?.includes('timeout') ||
      error?.message?.toLowerCase?.()?.includes('aborted');
    
    // Only log non-timeout errors in development
    if (process.env.NODE_ENV === 'development' && !isTimeoutError) {
      const message = error?.response?.data?.message || error?.message || 'Unknown error';
      const status = error?.response?.status;
      console.warn(`[fetchProductBySlug] Failed for "${slug}":`, { message, status });
    }
    
    return null;
  }
};

// Fetch products by category
export const fetchProductsByCategory = async (categoryId: number): Promise<WooCommerceProduct[]> => {
  try {
    const response = await wcAPI.get('/products', {
      params: { category: categoryId },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching products by category:', error);
    throw error;
  }
};

// Fetch variations for a variable product
export const fetchProductVariations = async (
  productId: number,
  params?: { per_page?: number; page?: number }
): Promise<WooCommerceVariation[]> => {
  try {
    const response = await wcAPI.get(`/products/${productId}/variations`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching product variations:', error);
    throw error;
  }
};

export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  description?: string;
}

export const fetchCategories = async (params?: { per_page?: number; parent?: number; hide_empty?: boolean }): Promise<WooCommerceCategory[]> => {
  try {
    const response = await wcAPI.get('/products/categories', { params });
    return response.data || [];
  } catch (error: any) {
    // Log error details for debugging (only in development)
    // Network errors are already logged by the interceptor
    if (process.env.NODE_ENV === 'development' && error.response) {
      console.warn('Error fetching categories:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        message: error.response.data?.message || error.message,
      });
    }
    // Return empty array instead of throwing to prevent breaking the UI
    // Components handle empty arrays gracefully
    return [];
  }
};

export const fetchCategoryBySlug = async (slug: string): Promise<WooCommerceCategory | null> => {
  try {
    const response = await wcAPI.get('/products/categories', { params: { slug } });
    const categories: WooCommerceCategory[] = response.data;
    return categories.length ? categories[0] : null;
  } catch (error: any) {
    // Timeout errors are expected in some scenarios and handled gracefully
    // Components handle null returns gracefully
    // Suppress all timeout-related errors to reduce console noise
    const isTimeoutError = error.code === 'ECONNABORTED' || 
                          error.code === 'ETIMEDOUT' ||
                          error.message?.toLowerCase().includes('timeout') ||
                          error.message?.toLowerCase().includes('exceeded') ||
                          error.message?.toLowerCase().includes('aborted');
    
    // Don't log timeout errors - they're handled gracefully
    // Only log other network errors in development mode
    if (process.env.NODE_ENV === 'development' && !error.response && !isTimeoutError) {
      console.warn(`Network error fetching category by slug "${slug}" (handled gracefully)`);
    }
    // Timeout errors are silently handled - return null gracefully
    // Return null instead of throwing to prevent breaking the UI
    return null;
  }
};

export default wcAPI;