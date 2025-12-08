/**
 * Search Types
 * Types for search functionality
 */

export interface SearchIndexItem {
  key: string;
  id: number;
  type: 'product' | 'category' | 'brand' | 'tag' | 'sku';
  name: string;
  slug: string;
  sku?: string;
  price?: string;
  regularPrice?: string;
  onSale?: boolean;
  image?: string;
  searchableText: string;
  tokens: string[];
}

export interface SearchResults {
  products: SearchIndexItem[];
  categories: SearchIndexItem[];
  brands: SearchIndexItem[];
  tags: SearchIndexItem[];
  skus: SearchIndexItem[];
}

