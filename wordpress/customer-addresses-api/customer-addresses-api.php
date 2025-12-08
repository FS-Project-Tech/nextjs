<?php
/**
 * Plugin Name: Customer Addresses API
 * Description: REST API endpoints for managing multiple customer billing and shipping addresses
 * Version: 1.0.0
 * Author: Your Team
 */

if (!defined('ABSPATH')) {
    exit;
}

// Register REST API routes
add_action('rest_api_init', function () {
    // Get all addresses
    register_rest_route('customers/v1', '/addresses', array(
        'methods' => 'GET',
        'callback' => 'customer_addresses_api_get_addresses',
        'permission_callback' => 'customer_addresses_api_is_user_logged_in',
    ));

    // Add new address
    register_rest_route('customers/v1', '/addresses', array(
        'methods' => 'POST',
        'callback' => 'customer_addresses_api_add_address',
        'permission_callback' => 'customer_addresses_api_is_user_logged_in',
    ));

    // Update address
    register_rest_route('customers/v1', '/addresses/(?P<id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'PUT',
        'callback' => 'customer_addresses_api_update_address',
        'permission_callback' => 'customer_addresses_api_is_user_logged_in',
        'args' => array(
            'id' => array(
                'required' => true,
                'validate_callback' => function($param) {
                    return !empty($param);
                }
            ),
        ),
    ));

    // Delete address
    register_rest_route('customers/v1', '/addresses/(?P<id>[a-zA-Z0-9\-]+)', array(
        'methods' => 'DELETE',
        'callback' => 'customer_addresses_api_delete_address',
        'permission_callback' => 'customer_addresses_api_is_user_logged_in',
        'args' => array(
            'id' => array(
                'required' => true,
                'validate_callback' => function($param) {
                    return !empty($param);
                }
            ),
        ),
    ));
});

function customer_addresses_api_is_user_logged_in($request) {
    $user_id = get_current_user_id();
    if ($user_id > 0) {
        return true;
    }
    
    // Check JWT token if available
    $auth_header = $request->get_header('Authorization');
    if ($auth_header && preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        $token = $matches[1];
        
        // Try to get user from JWT token if jwt-auth plugin is available
        if (function_exists('jwt_auth_get_user_from_token')) {
            $user = jwt_auth_get_user_from_token($token);
            if ($user && isset($user->ID) && $user->ID > 0) {
                wp_set_current_user($user->ID);
                return true;
            }
        }
        
        // Set Authorization header in $_SERVER for JWT Auth plugin to process
        if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
        }
        
        // Check again after setting header
        $user_id = get_current_user_id();
        if ($user_id > 0) {
            return true;
        }
    }
    
    return false;
}

function customer_addresses_api_get_addresses($request) {
    $user_id = get_current_user_id();
    if (!$user_id) {
        return new WP_Error('unauthorized', 'User not logged in', array('status' => 401));
    }

    // Get addresses from user meta
    $addresses = get_user_meta($user_id, 'saved_addresses', true);
    
    if (empty($addresses)) {
        $addresses = array();
    } else {
        // Ensure it's an array
        if (is_string($addresses)) {
            $addresses = json_decode($addresses, true);
            if (!is_array($addresses)) {
                $addresses = array();
            }
        }
    }

    // Also include default billing/shipping from WooCommerce customer if exists
    $customer = null;
    if (function_exists('wc_get_customer')) {
        $customer = wc_get_customer($user_id);
    }
    if ($customer) {
        $billing = $customer->get_billing();
        $shipping = $customer->get_shipping();
        
        // Add default billing if it has address data
        if (!empty($billing['address_1'])) {
            $default_billing = array(
                'id' => 'default-billing',
                'type' => 'billing',
                'label' => 'Default Billing',
                'first_name' => $billing['first_name'] ?? '',
                'last_name' => $billing['last_name'] ?? '',
                'address_1' => $billing['address_1'] ?? '',
                'address_2' => $billing['address_2'] ?? '',
                'city' => $billing['city'] ?? '',
                'state' => $billing['state'] ?? '',
                'postcode' => $billing['postcode'] ?? '',
                'country' => $billing['country'] ?? '',
                'phone' => $billing['phone'] ?? '',
                'email' => $billing['email'] ?? '',
            );
            array_unshift($addresses, $default_billing);
        }
        
        // Add default shipping if it has address data
        if (!empty($shipping['address_1'])) {
            $default_shipping = array(
                'id' => 'default-shipping',
                'type' => 'shipping',
                'label' => 'Default Shipping',
                'first_name' => $shipping['first_name'] ?? '',
                'last_name' => $shipping['last_name'] ?? '',
                'address_1' => $shipping['address_1'] ?? '',
                'address_2' => $shipping['address_2'] ?? '',
                'city' => $shipping['city'] ?? '',
                'state' => $shipping['state'] ?? '',
                'postcode' => $shipping['postcode'] ?? '',
                'country' => $shipping['country'] ?? '',
                'phone' => '',
                'email' => '',
            );
            array_unshift($addresses, $default_shipping);
        }
    }

    return rest_ensure_response(array('addresses' => $addresses));
}

function customer_addresses_api_add_address($request) {
    $user_id = get_current_user_id();
    if (!$user_id) {
        return new WP_Error('unauthorized', 'User not logged in', array('status' => 401));
    }

    $params = $request->get_json_params();
    
    // Validate required fields
    if (empty($params['type']) || !in_array($params['type'], array('billing', 'shipping'))) {
        return new WP_Error('invalid', 'Address type must be billing or shipping', array('status' => 400));
    }
    
    if (empty($params['address_1']) || empty($params['city']) || empty($params['state']) || empty($params['postcode'])) {
        return new WP_Error('invalid', 'Required address fields are missing', array('status' => 400));
    }

    // Generate UUID for address ID
    $address_id = wp_generate_uuid4();
    
    $address = array(
        'id' => $address_id,
        'type' => sanitize_text_field($params['type']),
        'label' => sanitize_text_field($params['label'] ?? 'Address'),
        'first_name' => sanitize_text_field($params['first_name'] ?? ''),
        'last_name' => sanitize_text_field($params['last_name'] ?? ''),
        'address_1' => sanitize_text_field($params['address_1']),
        'address_2' => sanitize_text_field($params['address_2'] ?? ''),
        'city' => sanitize_text_field($params['city']),
        'state' => sanitize_text_field($params['state']),
        'postcode' => sanitize_text_field($params['postcode']),
        'country' => sanitize_text_field($params['country'] ?? 'AU'),
        'phone' => sanitize_text_field($params['phone'] ?? ''),
        'email' => sanitize_email($params['email'] ?? ''),
    );

    // Get existing addresses
    $addresses = get_user_meta($user_id, 'saved_addresses', true);
    if (empty($addresses)) {
        $addresses = array();
    } else {
        if (is_string($addresses)) {
            $addresses = json_decode($addresses, true);
            if (!is_array($addresses)) {
                $addresses = array();
            }
        }
    }

    // Add new address
    $addresses[] = $address;
    
    // Save to user meta
    update_user_meta($user_id, 'saved_addresses', $addresses);

    return rest_ensure_response(array('address' => $address, 'message' => 'Address added successfully'));
}

function customer_addresses_api_update_address($request) {
    $user_id = get_current_user_id();
    if (!$user_id) {
        return new WP_Error('unauthorized', 'User not logged in', array('status' => 401));
    }

    $address_id = $request->get_param('id');
    $params = $request->get_json_params();

    // Get existing addresses
    $addresses = get_user_meta($user_id, 'saved_addresses', true);
    if (empty($addresses)) {
        return new WP_Error('not_found', 'Address not found', array('status' => 404));
    }
    
    if (is_string($addresses)) {
        $addresses = json_decode($addresses, true);
        if (!is_array($addresses)) {
            return new WP_Error('not_found', 'Address not found', array('status' => 404));
        }
    }

    // Find and update address
    $found = false;
    foreach ($addresses as &$address) {
        if ($address['id'] === $address_id) {
            // Update fields
            if (isset($params['label'])) {
                $address['label'] = sanitize_text_field($params['label']);
            }
            if (isset($params['first_name'])) {
                $address['first_name'] = sanitize_text_field($params['first_name']);
            }
            if (isset($params['last_name'])) {
                $address['last_name'] = sanitize_text_field($params['last_name']);
            }
            if (isset($params['address_1'])) {
                $address['address_1'] = sanitize_text_field($params['address_1']);
            }
            if (isset($params['address_2'])) {
                $address['address_2'] = sanitize_text_field($params['address_2']);
            }
            if (isset($params['city'])) {
                $address['city'] = sanitize_text_field($params['city']);
            }
            if (isset($params['state'])) {
                $address['state'] = sanitize_text_field($params['state']);
            }
            if (isset($params['postcode'])) {
                $address['postcode'] = sanitize_text_field($params['postcode']);
            }
            if (isset($params['country'])) {
                $address['country'] = sanitize_text_field($params['country']);
            }
            if (isset($params['phone'])) {
                $address['phone'] = sanitize_text_field($params['phone']);
            }
            if (isset($params['email'])) {
                $address['email'] = sanitize_email($params['email']);
            }
            if (isset($params['type'])) {
                $address['type'] = sanitize_text_field($params['type']);
            }
            $found = true;
            break;
        }
    }

    if (!$found) {
        return new WP_Error('not_found', 'Address not found', array('status' => 404));
    }

    // Save updated addresses
    update_user_meta($user_id, 'saved_addresses', $addresses);

    return rest_ensure_response(array('address' => $address, 'message' => 'Address updated successfully'));
}

function customer_addresses_api_delete_address($request) {
    $user_id = get_current_user_id();
    if (!$user_id) {
        return new WP_Error('unauthorized', 'User not logged in', array('status' => 401));
    }

    $address_id = $request->get_param('id');

    // Don't allow deleting default addresses
    if ($address_id === 'default-billing' || $address_id === 'default-shipping') {
        return new WP_Error('invalid', 'Cannot delete default addresses', array('status' => 400));
    }

    // Get existing addresses
    $addresses = get_user_meta($user_id, 'saved_addresses', true);
    if (empty($addresses)) {
        return new WP_Error('not_found', 'Address not found', array('status' => 404));
    }
    
    if (is_string($addresses)) {
        $addresses = json_decode($addresses, true);
        if (!is_array($addresses)) {
            return new WP_Error('not_found', 'Address not found', array('status' => 404));
        }
    }

    // Find and remove address
    $found = false;
    $filtered_addresses = array();
    foreach ($addresses as $address) {
        if ($address['id'] !== $address_id) {
            $filtered_addresses[] = $address;
        } else {
            $found = true;
        }
    }

    if (!$found) {
        return new WP_Error('not_found', 'Address not found', array('status' => 404));
    }

    // Save updated addresses
    update_user_meta($user_id, 'saved_addresses', $filtered_addresses);

    return rest_ensure_response(array('message' => 'Address deleted successfully'));
}

