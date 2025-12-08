<?php
/**
 * Plugin Name: Quotes Custom Post Type
 * Description: Registers a custom post type for storing quote requests
 * Version: 1.0.0
 * Author: Your Name
 */

// Register Quotes Custom Post Type
function register_quotes_post_type() {
    $args = array(
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => true,
        'supports' => array('title', 'custom-fields'),
        'capability_type' => 'post',
        'capabilities' => array(
            'create_posts' => 'manage_options',
        ),
        'map_meta_cap' => true,
        'labels' => array(
            'name' => 'Quotes',
            'singular_name' => 'Quote',
            'add_new' => 'Add New Quote',
            'add_new_item' => 'Add New Quote',
            'edit_item' => 'Edit Quote',
            'new_item' => 'New Quote',
            'view_item' => 'View Quote',
            'search_items' => 'Search Quotes',
            'not_found' => 'No quotes found',
            'not_found_in_trash' => 'No quotes found in Trash',
        ),
    );
    
    register_post_type('quotes', $args);
}
add_action('init', 'register_quotes_post_type');

// Add custom meta fields to REST API
function add_quotes_meta_to_rest() {
    register_rest_field('quotes', 'meta', array(
        'get_callback' => function($post) {
            return get_post_meta($post['id']);
        },
        'update_callback' => function($meta, $post) {
            foreach ($meta as $key => $value) {
                update_post_meta($post->ID, $key, $value);
            }
            return true;
        },
        'schema' => null,
    ));
}
add_action('rest_api_init', 'add_quotes_meta_to_rest');

// Allow users to query quotes by meta fields
function allow_quotes_meta_query($args, $request) {
    if (isset($request['meta_key']) && isset($request['meta_value'])) {
        $args['meta_query'] = array(
            array(
                'key' => $request['meta_key'],
                'value' => $request['meta_value'],
                'compare' => '=',
            ),
        );
    }
    return $args;
}
add_filter('rest_quotes_query', 'allow_quotes_meta_query', 10, 2);

