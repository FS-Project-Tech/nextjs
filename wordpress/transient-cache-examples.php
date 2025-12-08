<?php
/**
 * WordPress Transient Cache Examples
 * 
 * Add these to your theme's functions.php or a custom plugin
 * 
 * These examples show how to cache heavy endpoints using transients
 * with Redis object cache for maximum performance.
 */

/**
 * Example 1: Cache Products Endpoint (60 seconds)
 */
add_action('rest_api_init', function() {
    register_rest_route('custom/v1', '/products-cached', array(
        'methods' => 'GET',
        'callback' => 'get_cached_products_60s',
        'permission_callback' => '__return_true',
    ));
});

function get_cached_products_60s($request) {
    $params = $request->get_query_params();
    $cache_key = 'my_products_v1_' . md5(json_encode($params));
    
    // Try cache first (60 seconds TTL)
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        header('X-Cache: HIT');
        return rest_ensure_response($cached);
    }
    
    // Cache miss - expensive query here
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => isset($params['per_page']) ? intval($params['per_page']) : 24,
        'post_status' => 'publish',
    );
    
    $query = new WP_Query($args);
    $products = array();
    
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $product = wc_get_product(get_the_ID());
            $products[] = array(
                'id' => $product->get_id(),
                'name' => $product->get_name(),
                'price' => $product->get_price(),
            );
        }
    }
    
    wp_reset_postdata();
    
    $result = array(
        'products' => $products,
        'total' => $query->found_posts,
    );
    
    // Cache for 60 seconds
    set_transient($cache_key, $result, 60);
    
    header('X-Cache: MISS');
    return rest_ensure_response($result);
}

/**
 * Example 2: Cache Products Endpoint (300 seconds / 5 minutes)
 */
add_action('rest_api_init', function() {
    register_rest_route('custom/v1', '/products-cached-5min', array(
        'methods' => 'GET',
        'callback' => 'get_cached_products_300s',
        'permission_callback' => '__return_true',
    ));
});

function get_cached_products_300s($request) {
    $params = $request->get_query_params();
    $cache_key = 'my_products_v1_300s_' . md5(json_encode($params));
    
    // Try cache first (300 seconds / 5 minutes TTL)
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        header('X-Cache: HIT');
        return rest_ensure_response($cached);
    }
    
    // Cache miss - expensive query here
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => isset($params['per_page']) ? intval($params['per_page']) : 24,
        'post_status' => 'publish',
    );
    
    // Add category filter if provided
    if (isset($params['category'])) {
        $args['tax_query'] = array(
            array(
                'taxonomy' => 'product_cat',
                'field' => 'slug',
                'terms' => $params['category'],
            ),
        );
    }
    
    $query = new WP_Query($args);
    $products = array();
    
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $product = wc_get_product(get_the_ID());
            $products[] = array(
                'id' => $product->get_id(),
                'name' => $product->get_name(),
                'price' => $product->get_price(),
                'sku' => $product->get_sku(),
                'image' => get_the_post_thumbnail_url(get_the_ID(), 'medium'),
            );
        }
    }
    
    wp_reset_postdata();
    
    $result = array(
        'products' => $products,
        'total' => $query->found_posts,
        'page' => isset($params['page']) ? intval($params['page']) : 1,
    );
    
    // Cache for 300 seconds (5 minutes)
    set_transient($cache_key, $result, 300);
    
    header('X-Cache: MISS');
    return rest_ensure_response($result);
}

/**
 * Example 3: Cache User-Assigned Products (Custom Module)
 */
add_action('rest_api_init', function() {
    register_rest_route('custom/v1', '/user-assigned-products', array(
        'methods' => 'GET',
        'callback' => 'get_user_assigned_products_cached',
        'permission_callback' => function($request) {
            return is_user_logged_in();
        },
    ));
});

function get_user_assigned_products_cached($request) {
    $user_id = get_current_user_id();
    $params = $request->get_query_params();
    
    // Build cache key with user ID
    $cache_key = 'user_assigned_products_' . $user_id . '_' . md5(json_encode($params));
    
    // Try cache first (5 minutes TTL)
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        header('X-Cache: HIT');
        return rest_ensure_response($cached);
    }
    
    // Cache miss - expensive query here
    // Replace with your actual user-assigned products query
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'meta_query' => array(
            array(
                'key' => 'assigned_user_id',
                'value' => $user_id,
                'compare' => '=',
            ),
        ),
    );
    
    $query = new WP_Query($args);
    $products = array();
    
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $product = wc_get_product(get_the_ID());
            $products[] = array(
                'id' => $product->get_id(),
                'name' => $product->get_name(),
                'price' => $product->get_price(),
            );
        }
    }
    
    wp_reset_postdata();
    
    $result = array(
        'user_id' => $user_id,
        'products' => $products,
        'count' => count($products),
    );
    
    // Cache for 300 seconds (5 minutes)
    set_transient($cache_key, $result, 300);
    
    header('X-Cache: MISS');
    return rest_ensure_response($result);
}

/**
 * Example 4: Cache Wholesale Pricing (Custom Module)
 */
add_action('rest_api_init', function() {
    register_rest_route('custom/v1', '/wholesale-pricing', array(
        'methods' => 'GET',
        'callback' => 'get_wholesale_pricing_cached',
        'permission_callback' => function($request) {
            return current_user_can('wholesale_customer') || is_user_logged_in();
        },
    ));
});

function get_wholesale_pricing_cached($request) {
    $user_id = get_current_user_id();
    $product_id = $request->get_param('product_id');
    
    if (!$product_id) {
        return new WP_Error('missing_product_id', 'Product ID required', array('status' => 400));
    }
    
    // Build cache key
    $cache_key = 'wholesale_price_' . $product_id . '_' . $user_id;
    
    // Try cache first (10 minutes TTL - pricing changes less frequently)
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        header('X-Cache: HIT');
        return rest_ensure_response($cached);
    }
    
    // Cache miss - expensive calculation here
    $product = wc_get_product($product_id);
    if (!$product) {
        return new WP_Error('product_not_found', 'Product not found', array('status' => 404));
    }
    
    $regular_price = $product->get_regular_price();
    $wholesale_price = calculate_wholesale_price($product_id, $user_id);
    $discount = $regular_price > 0 ? (($regular_price - $wholesale_price) / $regular_price) * 100 : 0;
    
    $result = array(
        'product_id' => $product_id,
        'regular_price' => $regular_price,
        'wholesale_price' => $wholesale_price,
        'discount_percent' => round($discount, 2),
    );
    
    // Cache for 600 seconds (10 minutes)
    set_transient($cache_key, $result, 600);
    
    header('X-Cache: MISS');
    return rest_ensure_response($result);
}

function calculate_wholesale_price($product_id, $user_id) {
    // Your expensive calculation logic here
    $base_price = get_post_meta($product_id, '_regular_price', true);
    $user_tier = get_user_meta($user_id, 'wholesale_tier', true);
    
    $discount = 0;
    switch ($user_tier) {
        case 'tier1':
            $discount = 0.10; // 10% off
            break;
        case 'tier2':
            $discount = 0.20; // 20% off
            break;
        case 'tier3':
            $discount = 0.30; // 30% off
            break;
    }
    
    return $base_price * (1 - $discount);
}

/**
 * Example 5: Cache Product Bundles (Custom Module)
 */
add_action('rest_api_init', function() {
    register_rest_route('custom/v1', '/product-bundles', array(
        'methods' => 'GET',
        'callback' => 'get_product_bundles_cached',
        'permission_callback' => '__return_true',
    ));
});

function get_product_bundles_cached($request) {
    $product_id = $request->get_param('product_id');
    
    if (!$product_id) {
        return new WP_Error('missing_product_id', 'Product ID required', array('status' => 400));
    }
    
    // Build cache key
    $cache_key = 'product_bundles_' . $product_id;
    
    // Try cache first (15 minutes TTL - bundles change infrequently)
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        header('X-Cache: HIT');
        return rest_ensure_response($cached);
    }
    
    // Cache miss - expensive query here
    $bundles = get_post_meta($product_id, '_product_bundles', true);
    
    if (!$bundles || !is_array($bundles)) {
        $result = array(
            'product_id' => $product_id,
            'bundles' => array(),
            'count' => 0,
        );
        
        // Cache empty result too (shorter TTL)
        set_transient($cache_key, $result, 300);
        return rest_ensure_response($result);
    }
    
    $bundle_products = array();
    foreach ($bundles as $bundle_id) {
        $product = wc_get_product($bundle_id);
        if ($product && $product->is_purchasable()) {
            $bundle_products[] = array(
                'id' => $bundle_id,
                'name' => $product->get_name(),
                'price' => $product->get_price(),
                'sku' => $product->get_sku(),
            );
        }
    }
    
    $result = array(
        'product_id' => $product_id,
        'bundles' => $bundle_products,
        'count' => count($bundle_products),
    );
    
    // Cache for 900 seconds (15 minutes)
    set_transient($cache_key, $result, 900);
    
    header('X-Cache: MISS');
    return rest_ensure_response($result);
}

/**
 * Example 6: Cache Dynamic Discounts (Custom Module)
 */
add_action('rest_api_init', function() {
    register_rest_route('custom/v1', '/dynamic-discounts', array(
        'methods' => 'GET',
        'callback' => 'get_dynamic_discounts_cached',
        'permission_callback' => '__return_true',
    ));
});

function get_dynamic_discounts_cached($request) {
    $user_id = get_current_user_id();
    $product_id = $request->get_param('product_id');
    $quantity = $request->get_param('quantity') ?: 1;
    
    if (!$product_id) {
        return new WP_Error('missing_product_id', 'Product ID required', array('status' => 400));
    }
    
    // Build cache key
    $cache_key = 'dynamic_discount_' . $product_id . '_' . $user_id . '_' . $quantity;
    
    // Try cache first (5 minutes TTL)
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        header('X-Cache: HIT');
        return rest_ensure_response($cached);
    }
    
    // Cache miss - expensive calculation here
    $product = wc_get_product($product_id);
    if (!$product) {
        return new WP_Error('product_not_found', 'Product not found', array('status' => 404));
    }
    
    $base_price = $product->get_price();
    $discount = calculate_dynamic_discount($product_id, $user_id, $quantity);
    $final_price = $base_price * (1 - $discount);
    
    $result = array(
        'product_id' => $product_id,
        'base_price' => $base_price,
        'discount_percent' => $discount * 100,
        'final_price' => $final_price,
        'quantity' => $quantity,
    );
    
    // Cache for 300 seconds (5 minutes)
    set_transient($cache_key, $result, 300);
    
    header('X-Cache: MISS');
    return rest_ensure_response($result);
}

function calculate_dynamic_discount($product_id, $user_id, $quantity) {
    // Your expensive discount calculation logic here
    $discount = 0;
    
    // Quantity-based discount
    if ($quantity >= 10) {
        $discount += 0.05; // 5% for bulk
    } elseif ($quantity >= 5) {
        $discount += 0.03; // 3% for medium bulk
    }
    
    // User-based discount
    if ($user_id) {
        $user_tier = get_user_meta($user_id, 'customer_tier', true);
        if ($user_tier === 'vip') {
            $discount += 0.10; // Additional 10% for VIP
        }
    }
    
    // Product-specific discount
    $product_discount = get_post_meta($product_id, '_custom_discount', true);
    if ($product_discount) {
        $discount += floatval($product_discount);
    }
    
    // Cap at 50%
    return min($discount, 0.50);
}

/**
 * Cache Invalidation Helpers
 */

// Invalidate product cache when product is updated
add_action('woocommerce_update_product', function($product_id) {
    // Clear product-specific caches
    delete_transient('product_bundles_' . $product_id);
    
    // Clear all product collection caches (requires custom implementation)
    // For now, use shorter TTL or manual cache clearing
}, 10, 1);

// Invalidate user-specific caches when user meta changes
add_action('updated_user_meta', function($meta_id, $user_id, $meta_key, $meta_value) {
    if (in_array($meta_key, array('wholesale_tier', 'customer_tier', 'assigned_products'))) {
        // Clear user-specific caches
        global $wpdb;
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->options} 
             WHERE option_name LIKE %s",
            '_transient_user_%' . $user_id . '%'
        ));
    }
}, 10, 4);

