import { NextResponse } from "next/server";
import wcAPI from "@/lib/woocommerce";

export async function GET() {
  try {
    const now = Date.now();
    
    // Fetch products (lightweight fields only)
    const productsRes = await wcAPI.get('/products', {
      params: {
        status: 'publish',
        per_page: 100,
        page: 1,
        _fields: [
          'id',
          'name',
          'slug',
          'sku',
          'price',
          'regular_price',
          'on_sale',
          'images',
          'categories',
          'attributes',
        ].join(','),
      },
    });
    
    let products = productsRes.data || [];
    
    // Fetch additional pages if needed (up to 1000 products)
    if (products.length === 100) {
      const additionalPages = [];
      for (let page = 2; page <= 10 && additionalPages.length < 900; page++) {
        try {
          const res = await wcAPI.get('/products', {
            params: {
              status: 'publish',
              per_page: 100,
              page,
              _fields: [
                'id',
                'name',
                'slug',
                'sku',
                'price',
                'regular_price',
                'on_sale',
                'images',
                'categories',
                'attributes',
              ].join(','),
            },
          });
          if (res.data && res.data.length > 0) {
            additionalPages.push(...res.data);
          } else {
            break;
          }
        } catch (err: any) {
          // Only log non-timeout errors
          if (err?.code !== 'ECONNABORTED' && err?.code !== 'ETIMEDOUT' && !err?.message?.toLowerCase().includes('timeout')) {
            console.error(`Error fetching products page ${page}:`, err);
          }
          break;
        }
      }
      products = [...products, ...additionalPages];
    }
    
    // Fetch categories from product_cat taxonomy (WordPress REST API)
    let categories: any[] = [];
    try {
      const apiUrl = process.env.WC_API_URL || '';
      const url = new URL(apiUrl);
      const wpBase = `${url.protocol}//${url.host}/wp-json/wp/v2`;
      
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      try {
        const categoriesRes = await fetch(`${wpBase}/product_cat?per_page=100&hide_empty=true&_fields=id,name,slug`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (categoriesRes.ok) {
          const catData = await categoriesRes.json();
          categories = Array.isArray(catData) ? catData : [];
        } else {
          // Fallback to WooCommerce API
          const fallbackRes = await wcAPI.get('/products/categories', {
            params: {
              per_page: 100,
              hide_empty: true,
              _fields: 'id,name,slug',
            },
          });
          categories = fallbackRes.data || [];
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        // Only log non-timeout errors
        if (error?.name !== 'AbortError' && !error?.message?.toLowerCase().includes('timeout')) {
          console.error('Error fetching categories:', error);
        }
        // Fallback to WooCommerce API
        try {
          const fallbackRes = await wcAPI.get('/products/categories', {
            params: {
              per_page: 100,
              hide_empty: true,
              _fields: 'id,name,slug',
            },
          });
          categories = fallbackRes.data || [];
        } catch (fallbackError: any) {
          // Only log non-timeout errors
          if (fallbackError?.code !== 'ECONNABORTED' && fallbackError?.code !== 'ETIMEDOUT' && !fallbackError?.message?.toLowerCase().includes('timeout')) {
            console.error('Fallback category fetch failed:', fallbackError);
          }
          categories = [];
        }
      }
    } catch (error: any) {
      // Only log non-timeout errors
      if (error?.name !== 'AbortError' && error?.code !== 'ECONNABORTED' && error?.code !== 'ETIMEDOUT' && !error?.message?.toLowerCase().includes('timeout')) {
        console.error('Error fetching categories:', error);
      }
      categories = [];
    }
    
    // Fetch brands from product_brand taxonomy (WordPress REST API)
    let brands: any[] = [];
    try {
      const apiUrl = process.env.WC_API_URL || '';
      const url = new URL(apiUrl);
      const wpBase = `${url.protocol}//${url.host}/wp-json/wp/v2`;
      
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      try {
        const brandsRes = await fetch(`${wpBase}/product_brand?per_page=100&hide_empty=true&_fields=id,name,slug`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (brandsRes.ok) {
          const brandData = await brandsRes.json();
          brands = Array.isArray(brandData) ? brandData : [];
        } else {
          // Fallback: try alternate taxonomy names
          const fallbackController = new AbortController();
          const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 8000);
          
          try {
            const fallbackRes = await fetch(`${wpBase}/brands?per_page=100&hide_empty=true&_fields=id,name,slug`, {
              cache: 'no-store',
              signal: fallbackController.signal,
            });
            clearTimeout(fallbackTimeoutId);
            
            if (fallbackRes.ok) {
              const brandData = await fallbackRes.json();
              brands = Array.isArray(brandData) ? brandData : [];
            }
          } catch (fallbackError: any) {
            clearTimeout(fallbackTimeoutId);
            // Only log non-timeout errors
            if (fallbackError?.name !== 'AbortError' && !fallbackError?.message?.toLowerCase().includes('timeout')) {
              console.error('Error fetching brands (fallback):', fallbackError);
            }
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        // Only log non-timeout errors
        if (fetchError?.name !== 'AbortError' && !fetchError?.message?.toLowerCase().includes('timeout')) {
          console.error('Error fetching brands:', fetchError);
        }
      }
    } catch (error: any) {
      // Only log non-timeout errors
      if (error?.name !== 'AbortError' && error?.code !== 'ECONNABORTED' && error?.code !== 'ETIMEDOUT' && !error?.message?.toLowerCase().includes('timeout')) {
        console.error('Error fetching brands:', error);
      }
      brands = [];
    }
    
    // Fetch tags from product_tag taxonomy (WordPress REST API)
    let tags: any[] = [];
    try {
      const apiUrl = process.env.WC_API_URL || '';
      const url = new URL(apiUrl);
      const wpBase = `${url.protocol}//${url.host}/wp-json/wp/v2`;
      
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      try {
        const tagsRes = await fetch(`${wpBase}/product_tag?per_page=100&hide_empty=true&_fields=id,name,slug`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (tagsRes.ok) {
          const tagData = await tagsRes.json();
          tags = Array.isArray(tagData) ? tagData : [];
        } else {
          // Fallback to WooCommerce API
          try {
            const fallbackRes = await wcAPI.get('/products/tags', {
              params: {
                per_page: 100,
                hide_empty: true,
                _fields: 'id,name,slug',
              },
            });
            tags = fallbackRes.data || [];
          } catch (fallbackError: any) {
            // Only log non-timeout errors
            if (fallbackError?.code !== 'ECONNABORTED' && fallbackError?.code !== 'ETIMEDOUT' && !fallbackError?.message?.toLowerCase().includes('timeout')) {
              console.error('Fallback tag fetch failed:', fallbackError);
            }
            tags = [];
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        // Only log non-timeout errors
        if (fetchError?.name !== 'AbortError' && !fetchError?.message?.toLowerCase().includes('timeout')) {
          console.error('Error fetching tags:', fetchError);
        }
        // Fallback to WooCommerce API
        try {
          const fallbackRes = await wcAPI.get('/products/tags', {
            params: {
              per_page: 100,
              hide_empty: true,
              _fields: 'id,name,slug',
            },
          });
          tags = fallbackRes.data || [];
        } catch (fallbackError: any) {
          // Only log non-timeout errors
          if (fallbackError?.code !== 'ECONNABORTED' && fallbackError?.code !== 'ETIMEDOUT' && !fallbackError?.message?.toLowerCase().includes('timeout')) {
            console.error('Fallback tag fetch failed:', fallbackError);
          }
          tags = [];
        }
      }
    } catch (error: any) {
      // Only log non-timeout errors
      if (error?.name !== 'AbortError' && error?.code !== 'ECONNABORTED' && error?.code !== 'ETIMEDOUT' && !error?.message?.toLowerCase().includes('timeout')) {
        console.error('Error fetching tags:', error);
      }
      tags = [];
    }
    
    const indexData = {
      products: products.slice(0, 1000), // Limit to 1000 products for performance
      categories,
      brands,
      tags,
      timestamp: now,
      totalProducts: products.length,
    };
    
    return NextResponse.json(indexData);
  } catch (error: any) {
    // Only log non-timeout errors (timeouts are handled gracefully)
    if (error?.code !== 'ECONNABORTED' && error?.code !== 'ETIMEDOUT' && !error?.message?.toLowerCase().includes('timeout')) {
      console.error('Error building search index:', error);
    }
    return NextResponse.json(
      {
        products: [],
        categories: [],
        brands: [],
        tags: [],
        timestamp: Date.now(),
        totalProducts: 0,
      },
      { status: 200 }
    );
  }
}


