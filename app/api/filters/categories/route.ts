import { NextRequest, NextResponse } from 'next/server';
import { fetchCategories, fetchCategoryBySlug } from '@/lib/woocommerce';

/**
 * GET /api/filters/categories
 * Returns categories for the filter sidebar
 * 
 * Query params:
 * - category: Parent category slug to get children for
 */
export async function GET(request: NextRequest) {
  try {
    const categorySlug = request.nextUrl.searchParams.get('category');
    
    if (categorySlug) {
      // Get child categories of the specified parent
      const parentCategory = await fetchCategoryBySlug(categorySlug);
      
      if (!parentCategory) {
        return NextResponse.json({ categories: [] });
      }
      
      // Fetch children of this category
      const children = await fetchCategories({
        per_page: 100,
        parent: parentCategory.id,
        hide_empty: true,
      });
      
      return NextResponse.json({
        categories: children.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: cat.count,
        })),
      });
    }
    
    // Get top-level categories (parent = 0)
    const categories = await fetchCategories({
      per_page: 100,
      parent: 0,
      hide_empty: true,
    });
    
    return NextResponse.json({
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        count: cat.count,
      })),
    });
  } catch (error) {
    console.error('Error fetching filter categories:', (error instanceof Error ? error.message : 'An error occurred'));
    return NextResponse.json(
      { error: 'Failed to fetch categories', categories: [] },
      { status: 500 }
    );
  }
}


