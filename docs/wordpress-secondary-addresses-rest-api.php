<?php
/**
 * WordPress REST API: Customer Billing/Shipping Address (Secondary)
 *
 * Exposes billing2_* and shipping2_* user meta so the headless app's
 * "Addresses" page reads/writes Customer Billing Address (Secondary)
 * and Customer Shipping Address (Secondary). Checkout continues to use
 * primary billing/shipping.
 *
 * REQUIREMENTS:
 * - Add this file to your theme (e.g. require in functions.php).
 * - WordPress must authenticate REST API requests when the app sends
 *   "Authorization: Bearer <JWT>". Install a JWT plugin (e.g. "JWT Authentication
 *   for WP REST API" or "Simple JWT Login") and ensure it sets the current user
 *   from the token. Otherwise is_user_logged_in() is false and the endpoint
 *   returns 401, so addresses are not stored here.
 *
 * Optional: In your edit_user_profile save_secondary_addresses $fields array,
 * add billing2_address_2, billing2_state, billing2_country, shipping2_address_2,
 * shipping2_state, shipping2_country, shipping2_phone, shipping2_email so the
 * admin form can edit the same fields.
 */

if (!defined('ABSPATH')) {
    exit;
}

$billing2_keys = array(
    'first_name', 'last_name', 'company', 'address_1', 'address_2',
    'city', 'state', 'postcode', 'country', 'phone', 'email',
    'ndis_participant_name', 'ndis_number', 'ndis_dob', 'ndis_funding_type', 'ndis_approval',
    'ndis_invoice_email',
    'hcp_participant_name', 'hcp_number', 'hcp_provider_email', 'hcp_approval'
);
$shipping2_keys = array(
    'first_name', 'last_name', 'company', 'address_1', 'address_2',
    'city', 'state', 'postcode', 'country', 'phone', 'email',
    'ndis_participant_name', 'ndis_number', 'ndis_dob', 'ndis_funding_type', 'ndis_approval',
    'ndis_invoice_email',
    'hcp_participant_name', 'hcp_number', 'hcp_provider_email', 'hcp_approval'
);

function secondary_address_meta_prefix($type) {
    return $type === 'billing' ? 'billing2_' : 'shipping2_';
}

function get_secondary_address_from_meta($user_id, $type, $billing2_keys, $shipping2_keys) {
    $prefix = secondary_address_meta_prefix($type);
    $keys = $type === 'billing' ? $billing2_keys : $shipping2_keys;
    $out = array('id' => $type === 'billing' ? 'billing2' : 'shipping2', 'type' => $type, 'label' => '');
    foreach ($keys as $k) {
        $val = get_user_meta($user_id, $prefix . $k, true);
        $out[$k] = ($val !== '' && $val !== false) ? $val : '';
    }
    $out['label'] = $type === 'billing' ? 'Billing (Secondary)' : 'Shipping (Secondary)';
    return $out;
}

function has_any_secondary_data($arr, $keys) {
    foreach ($keys as $k) {
        if (isset($arr[$k]) && trim((string)$arr[$k]) !== '') return true;
    }
    return false;
}

function save_secondary_address_to_meta($user_id, $type, $body, $billing2_keys, $shipping2_keys) {
    $prefix = secondary_address_meta_prefix($type);
    $keys = $type === 'billing' ? $billing2_keys : $shipping2_keys;
    foreach ($keys as $k) {
        if (!isset($body[$k])) {
            $v = '';
        } elseif (is_bool($body[$k])) {
            $v = $body[$k] ? '1' : '0';
        } else {
            $v = sanitize_text_field((string) $body[$k]);
        }
        update_user_meta($user_id, $prefix . $k, $v);
    }
}

function clear_secondary_address_meta($user_id, $type, $billing2_keys, $shipping2_keys) {
    $prefix = secondary_address_meta_prefix($type);
    $keys = $type === 'billing' ? $billing2_keys : $shipping2_keys;
    foreach ($keys as $k) {
        delete_user_meta($user_id, $prefix . $k);
    }
}

add_action('rest_api_init', function () use ($billing2_keys, $shipping2_keys) {
    register_rest_route('customers/v1', '/addresses-secondary', array(
        array(
            'methods'             => 'GET',
            'permission_callback' => function () {
                return is_user_logged_in();
            },
            'callback'            => function () use ($billing2_keys, $shipping2_keys) {
                $user_id = get_current_user_id();
                if (!$user_id) {
                    return new WP_REST_Response(array('error' => 'Not authenticated'), 401);
                }
                $billing  = get_secondary_address_from_meta($user_id, 'billing', $billing2_keys, $shipping2_keys);
                $shipping = get_secondary_address_from_meta($user_id, 'shipping', $billing2_keys, $shipping2_keys);
                $addresses = array();
                if (has_any_secondary_data($billing, $billing2_keys)) {
                    $addresses[] = $billing;
                }
                if (has_any_secondary_data($shipping, $shipping2_keys)) {
                    $addresses[] = $shipping;
                }
                return new WP_REST_Response(array('addresses' => $addresses), 200);
            },
        ),
        array(
            'methods'             => 'POST',
            'permission_callback' => function () {
                return is_user_logged_in();
            },
            'callback'            => function ($request) use ($billing2_keys, $shipping2_keys) {
                $user_id = get_current_user_id();
                if (!$user_id) {
                    return new WP_REST_Response(array('error' => 'Not authenticated'), 401);
                }
                $body = $request->get_json_params();
                if (!is_array($body)) $body = array();
                $type = isset($body['type']) && $body['type'] === 'shipping' ? 'shipping' : 'billing';
                save_secondary_address_to_meta($user_id, $type, $body, $billing2_keys, $shipping2_keys);
                $address = get_secondary_address_from_meta($user_id, $type, $billing2_keys, $shipping2_keys);
                return new WP_REST_Response(array(
                    'address'  => $address,
                    'message'  => 'Address saved successfully',
                ), 200);
            },
        ),
    ));

    register_rest_route('customers/v1', '/addresses-secondary/(?P<id>billing2|shipping2)', array(
        array(
            'methods'             => 'PUT',
            'permission_callback' => function () {
                return is_user_logged_in();
            },
            'callback'            => function ($request) use ($billing2_keys, $shipping2_keys) {
                $user_id = get_current_user_id();
                if (!$user_id) {
                    return new WP_REST_Response(array('error' => 'Not authenticated'), 401);
                }
                $id = $request['id'];
                $type = $id === 'billing2' ? 'billing' : 'shipping';
                $body = $request->get_json_params();
                if (!is_array($body)) $body = array();
                save_secondary_address_to_meta($user_id, $type, $body, $billing2_keys, $shipping2_keys);
                $address = get_secondary_address_from_meta($user_id, $type, $billing2_keys, $shipping2_keys);
                return new WP_REST_Response(array(
                    'address'  => $address,
                    'message'  => 'Address updated successfully',
                ), 200);
            },
        ),
        array(
            'methods'             => 'DELETE',
            'permission_callback' => function () {
                return is_user_logged_in();
            },
            'callback'            => function ($request) use ($billing2_keys, $shipping2_keys) {
                $user_id = get_current_user_id();
                if (!$user_id) {
                    return new WP_REST_Response(array('error' => 'Not authenticated'), 401);
                }
                $id = $request['id'];
                $type = $id === 'billing2' ? 'billing' : 'shipping';
                clear_secondary_address_meta($user_id, $type, $billing2_keys, $shipping2_keys);
                return new WP_REST_Response(array('message' => 'Address deleted successfully'), 200);
            },
        ),
    ));
});
