<?php
/**
 * Plugin Name: Custom Auth Bridge for Headless Next.js
 * Plugin URI: https://your-site.com
 * Description: Bridges WordPress authentication with Next.js headless frontend. Handles JWT tokens, CORS, and WooCommerce session management.
 * Version: 1.0.0
 * Author: Your Name
 * Author URI: https://your-site.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: custom-auth-bridge
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Custom Auth Bridge for Headless Next.js
 * 
 * This plugin:
 * 1. Enhances JWT authentication for headless frontend
 * 2. Handles CORS for Next.js requests
 * 3. Manages WooCommerce session cookies
 * 4. Provides secure token validation
 */

class Custom_Auth_Bridge {
    
    /**
     * Singleton instance
     */
    private static $instance = null;
    
    /**
     * Get singleton instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        // Initialize hooks
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        // CORS headers for Next.js frontend
        add_action('rest_api_init', array($this, 'add_cors_headers'));
        add_action('init', array($this, 'add_cors_headers_preflight'));
        
        // Enhance JWT authentication
        add_filter('jwt_auth_token_before_dispatch', array($this, 'enhance_jwt_response'), 10, 2);
        
        // WooCommerce session management
        add_action('woocommerce_set_cart_cookies', array($this, 'set_wc_session_cookie'), 10, 1);
        add_action('wp_login', array($this, 'sync_wc_session_on_login'), 10, 2);
        
        // Token validation endpoint
        add_action('rest_api_init', array($this, 'register_custom_endpoints'));
        
        // Security headers
        add_action('rest_api_init', array($this, 'add_security_headers'));
    }
    
    /**
     * Add CORS headers for Next.js frontend
     */
    public function add_cors_headers() {
        $nextjs_url = get_option('nextjs_frontend_url', '');
        
        if (empty($nextjs_url)) {
            // Try to get from environment variable or default
            $nextjs_url = defined('NEXTJS_FRONTEND_URL') ? NEXTJS_FRONTEND_URL : '';
        }
        
        if (empty($nextjs_url)) {
            return; // Don't add CORS if URL not configured
        }
        
        // Allow requests from Next.js frontend
        header('Access-Control-Allow-Origin: ' . esc_url_raw($nextjs_url));
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-WC-Session');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400'); // 24 hours
    }
    
    /**
     * Handle CORS preflight requests
     */
    public function add_cors_headers_preflight() {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            $this->add_cors_headers();
            http_response_code(204);
            exit;
        }
    }
    
    /**
     * Add security headers to REST API responses
     */
    public function add_security_headers() {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
    }
    
    /**
     * Enhance JWT response with additional user data
     */
    public function enhance_jwt_response($data, $user) {
        // Add WooCommerce customer ID if available
        if (function_exists('wc_get_customer')) {
            $customer = wc_get_customer($user->ID);
            if ($customer) {
                $data['customer_id'] = $customer->get_id();
                $data['customer_email'] = $customer->get_email();
            }
        }
        
        // Add user roles
        $data['user']['roles'] = $user->roles;
        
        // Add user meta if needed
        $data['user']['first_name'] = get_user_meta($user->ID, 'first_name', true);
        $data['user']['last_name'] = get_user_meta($user->ID, 'last_name', true);
        
        return $data;
    }
    
    /**
     * Set WooCommerce session cookie for headless frontend
     */
    public function set_wc_session_cookie($set) {
        if (!$set) {
            return;
        }
        
        // Get WooCommerce session
        $session_handler = WC()->session;
        if (!$session_handler) {
            return;
        }
        
        // Get session cookie name
        $cookie_name = 'wc-session';
        $session_id = $session_handler->get_customer_id();
        
        if ($session_id) {
            // Set session cookie with proper settings
            $secure = is_ssl();
            $httponly = true;
            $samesite = 'Lax'; // Lax for cross-site cart functionality
            
            setcookie(
                $cookie_name,
                $session_id,
                array(
                    'expires' => time() + (48 * HOUR_IN_SECONDS), // 48 hours
                    'path' => '/',
                    'domain' => COOKIE_DOMAIN,
                    'secure' => true, // Always secure (required for SameSite=None)
                    'httponly' => true, // Always HttpOnly
                    'samesite' => 'None' // None for cross-site requests
                )
            );
        }
    }
    
    /**
     * Sync WooCommerce session when user logs in
     */
    public function sync_wc_session_on_login($user_login, $user) {
        if (!function_exists('WC')) {
            return;
        }
        
        // Ensure WooCommerce session is initialized
        if (!WC()->session->has_session()) {
            WC()->session->set_customer_session_cookie(true);
        }
        
        // Link WordPress user to WooCommerce customer
        if (function_exists('wc_get_customer')) {
            $customer = wc_get_customer($user->ID);
            if ($customer) {
                // Update session with customer ID
                WC()->session->set('customer_id', $customer->get_id());
            }
        }
    }
    
    /**
     * Register custom REST API endpoints
     */
    public function register_custom_endpoints() {
        // Token validation endpoint
        register_rest_route('custom-auth/v1', '/validate-token', array(
            'methods' => 'POST',
            'callback' => array($this, 'validate_token'),
            'permission_callback' => '__return_true', // Public endpoint
        ));
        
        // Session info endpoint
        register_rest_route('custom-auth/v1', '/session-info', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_session_info'),
            'permission_callback' => array($this, 'check_authentication'),
        ));
        
        // WooCommerce session endpoint
        register_rest_route('custom-auth/v1', '/wc-session', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_wc_session'),
            'permission_callback' => array($this, 'check_authentication'),
        ));
    }
    
    /**
     * Validate JWT token
     */
    public function validate_token($request) {
        $token = $request->get_header('Authorization');
        
        if (!$token) {
            return new WP_Error('no_token', 'No token provided', array('status' => 401));
        }
        
        // Remove "Bearer " prefix if present
        $token = str_replace('Bearer ', '', $token);
        
        // Use JWT Auth plugin's validation
        if (class_exists('JWT_Auth_Public')) {
            $jwt_auth = new JWT_Auth_Public('jwt-auth', '1.0.0');
            $user = $jwt_auth->validate_token($token);
            
            if (is_wp_error($user)) {
                return $user;
            }
            
            return array(
                'valid' => true,
                'user_id' => $user->ID,
                'user_email' => $user->user_email,
            );
        }
        
        return new WP_Error('jwt_not_available', 'JWT Auth plugin not available', array('status' => 500));
    }
    
    /**
     * Get session information
     */
    public function get_session_info($request) {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return new WP_Error('not_authenticated', 'User not authenticated', array('status' => 401));
        }
        
        $user = get_userdata($user_id);
        $customer_id = null;
        
        if (function_exists('wc_get_customer')) {
            $customer = wc_get_customer($user_id);
            if ($customer) {
                $customer_id = $customer->get_id();
            }
        }
        
        return array(
            'user_id' => $user_id,
            'user_email' => $user->user_email,
            'user_name' => $user->display_name,
            'customer_id' => $customer_id,
            'wc_session_id' => WC()->session ? WC()->session->get_customer_id() : null,
        );
    }
    
    /**
     * Create WooCommerce session
     */
    public function create_wc_session($request) {
        if (!function_exists('WC')) {
            return new WP_Error('woocommerce_not_available', 'WooCommerce not available', array('status' => 500));
        }
        
        $user_id = get_current_user_id();
        $customer_id = $request->get_param('customer_id');
        
        // Initialize WooCommerce session
        if (!WC()->session->has_session()) {
            WC()->session->set_customer_session_cookie(true);
        }
        
        // Link to customer if provided
        if ($customer_id && function_exists('wc_get_customer')) {
            WC()->session->set('customer_id', $customer_id);
        } elseif ($user_id) {
            // Try to get customer ID from user
            $customer = wc_get_customer($user_id);
            if ($customer) {
                WC()->session->set('customer_id', $customer->get_id());
            }
        }
        
        $session_id = WC()->session->get_customer_id();
        
        return array(
            'success' => true,
            'session_id' => $session_id,
            'session_token' => $session_id, // For compatibility
        );
    }
    
    /**
     * Check if user is authenticated
     */
    public function check_authentication() {
        return is_user_logged_in();
    }
}

/**
 * Initialize the plugin
 */
function custom_auth_bridge_init() {
    Custom_Auth_Bridge::get_instance();
}
add_action('plugins_loaded', 'custom_auth_bridge_init');

/**
 * Activation hook
 */
register_activation_hook(__FILE__, function() {
    // Set default Next.js frontend URL if not set
    if (!get_option('nextjs_frontend_url')) {
        // Try to get from environment
        $nextjs_url = defined('NEXTJS_FRONTEND_URL') ? NEXTJS_FRONTEND_URL : '';
        if ($nextjs_url) {
            update_option('nextjs_frontend_url', $nextjs_url);
        }
    }
});

/**
 * Add settings page (optional)
 */
add_action('admin_menu', function() {
    add_options_page(
        'Custom Auth Bridge Settings',
        'Auth Bridge',
        'manage_options',
        'custom-auth-bridge',
        function() {
            if (isset($_POST['nextjs_frontend_url']) && check_admin_referer('custom_auth_bridge_settings')) {
                update_option('nextjs_frontend_url', esc_url_raw($_POST['nextjs_frontend_url']));
                echo '<div class="notice notice-success"><p>Settings saved!</p></div>';
            }
            
            $nextjs_url = get_option('nextjs_frontend_url', '');
            ?>
            <div class="wrap">
                <h1>Custom Auth Bridge Settings</h1>
                <form method="post">
                    <?php wp_nonce_field('custom_auth_bridge_settings'); ?>
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="nextjs_frontend_url">Next.js Frontend URL</label>
                            </th>
                            <td>
                                <input 
                                    type="url" 
                                    id="nextjs_frontend_url" 
                                    name="nextjs_frontend_url" 
                                    value="<?php echo esc_attr($nextjs_url); ?>" 
                                    class="regular-text"
                                    placeholder="https://your-nextjs-app.com"
                                />
                                <p class="description">The URL of your Next.js frontend application.</p>
                            </td>
                        </tr>
                    </table>
                    <?php submit_button(); ?>
                </form>
            </div>
            <?php
        }
    );
});

