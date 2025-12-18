export function getActivePromotions(product: any) {
    // WooCommerce categories
    const productCategorySlugs =
      product.categories?.map((cat: any) => cat.slug) || [];
  
    const promotions = product.acf?.promotional_section || [];
  
    return promotions.filter((promo: any) => {
      const promoCategorySlugs =
        promo.category?.map((cat: any) => cat.slug) || [];
  
      return promoCategorySlugs.some((slug: string) =>
        productCategorySlugs.includes(slug)
      );
    });
  }
  