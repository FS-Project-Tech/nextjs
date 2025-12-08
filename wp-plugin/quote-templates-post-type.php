<?php
/**
 * Plugin Name: Quote Templates Custom Post Type
 * Description: Registers a custom post type for storing quote templates
 * Version: 1.0.0
 */

// Register Custom Post Type for Quote Templates
function register_quote_templates_post_type() {
    $labels = array(
        'name'                  => 'Quote Templates',
        'singular_name'         => 'Quote Template',
        'menu_name'             => 'Quote Templates',
        'name_admin_bar'        => 'Quote Template',
        'archives'              => 'Template Archives',
        'attributes'            => 'Template Attributes',
        'parent_item_colon'     => 'Parent Template:',
        'all_items'             => 'All Templates',
        'add_new_item'          => 'Add New Template',
        'add_new'               => 'Add New',
        'new_item'              => 'New Template',
        'edit_item'             => 'Edit Template',
        'update_item'           => 'Update Template',
        'view_item'             => 'View Template',
        'view_items'            => 'View Templates',
        'search_items'          => 'Search Template',
        'not_found'             => 'Not found',
        'not_found_in_trash'    => 'Not found in Trash',
    );
    
    $args = array(
        'label'                 => 'Quote Template',
        'description'           => 'Quote Templates for quick quote creation',
        'labels'                => $labels,
        'supports'              => array('title', 'custom-fields'),
        'hierarchical'          => false,
        'public'                => false,
        'show_ui'               => true,
        'show_in_menu'          => true,
        'menu_position'         => 30,
        'menu_icon'             => 'dashicons-admin-page',
        'show_in_admin_bar'     => true,
        'show_in_nav_menus'     => false,
        'can_export'            => true,
        'has_archive'           => false,
        'exclude_from_search'   => true,
        'publicly_queryable'    => false,
        'capability_type'       => 'post',
        'show_in_rest'          => true,
        'rest_base'             => 'quote-templates',
        'rest_controller_class' => 'WP_REST_Posts_Controller',
    );
    
    register_post_type('quote-templates', $args);
}
add_action('init', 'register_quote_templates_post_type', 0);

// Register meta fields for REST API
function register_quote_template_meta_fields() {
    register_post_meta('quote-templates', 'template_id', array(
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
    ));
    
    register_post_meta('quote-templates', 'template_data', array(
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
    ));
    
    register_post_meta('quote-templates', 'user_email', array(
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
    ));
    
    register_post_meta('quote-templates', 'user_id', array(
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
    ));
    
    register_post_meta('quote-templates', 'is_default', array(
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
    ));
}
add_action('init', 'register_quote_template_meta_fields');

