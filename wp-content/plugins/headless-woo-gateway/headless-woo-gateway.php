<?php
/**
 * Plugin Name: Headless Woo API Gateway
 * Plugin URI: https://example.com/headless-woo-gateway
 * Description: Enterprise-grade API Gateway for Headless WooCommerce + Next.js applications. Provides secure, user-aware REST API endpoints.
 * Version: 1.0.0
 * Author: Your Company
 * Author URI: https://example.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: headless-woo-gateway
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 *
 * @package HeadlessWooGateway
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Define plugin constants
define( 'HEADLESS_WOO_GATEWAY_VERSION', '1.0.0' );
define( 'HEADLESS_WOO_GATEWAY_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'HEADLESS_WOO_GATEWAY_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Main plugin class
 */
class Headless_Woo_Gateway {
	
	/**
	 * Plugin instance
	 *
	 * @var Headless_Woo_Gateway
	 */
	private static $instance = null;
	
	/**
	 * Get plugin instance
	 *
	 * @return Headless_Woo_Gateway
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}
	
	/**
	 * Constructor
	 */
	private function __construct() {
		$this->init();
	}
	
	/**
	 * Initialize plugin
	 */
	private function init() {
		// Check if WooCommerce is active
		add_action( 'plugins_loaded', array( $this, 'check_woocommerce' ) );
		
		// Register REST API routes
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}
	
	/**
	 * Check if WooCommerce is active
	 */
	public function check_woocommerce() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			add_action( 'admin_notices', array( $this, 'woocommerce_missing_notice' ) );
			return;
		}
	}
	
	/**
	 * Display notice if WooCommerce is not active
	 */
	public function woocommerce_missing_notice() {
		?>
		<div class="notice notice-error">
			<p><?php esc_html_e( 'Headless Woo API Gateway requires WooCommerce to be installed and active.', 'headless-woo-gateway' ); ?></p>
		</div>
		<?php
	}
	
	/**
	 * Register REST API routes
	 */
	public function register_routes() {
		$namespace = 'api/v1';
		
		// GET /wp-json/api/v1/me
		register_rest_route(
			$namespace,
			'/me',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_current_user' ),
				'permission_callback' => array( $this, 'check_authentication' ),
			)
		);
		
		// GET /wp-json/api/v1/my-orders
		register_rest_route(
			$namespace,
			'/my-orders',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_user_orders' ),
				'permission_callback' => array( $this, 'check_authentication' ),
				'args'                => array(
					'per_page' => array(
						'default'           => 10,
						'sanitize_callback' => 'absint',
						'validate_callback' => function( $param ) {
							return is_numeric( $param ) && $param > 0 && $param <= 100;
						},
					),
					'page'     => array(
						'default'           => 1,
						'sanitize_callback' => 'absint',
						'validate_callback' => function( $param ) {
							return is_numeric( $param ) && $param > 0;
						},
					),
					'status'   => array(
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
		
		// GET /wp-json/api/v1/my-address
		register_rest_route(
			$namespace,
			'/my-address',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_user_address' ),
				'permission_callback' => array( $this, 'check_authentication' ),
			)
		);
	}
	
	/**
	 * Check if user is authenticated
	 * 
	 * This relies on JWT Authentication for WP-API plugin
	 * which validates the token and sets the current user.
	 * We simply check if a user is logged in.
	 *
	 * @param WP_REST_Request $request Request object
	 * @return bool|WP_Error
	 */
	public function check_authentication( $request ) {
		$user_id = get_current_user_id();
		
		if ( ! $user_id || $user_id === 0 ) {
			return new WP_Error(
				'rest_not_authenticated',
				__( 'You must be authenticated to access this endpoint.', 'headless-woo-gateway' ),
				array( 'status' => 401 )
			);
		}
		
		return true;
	}
	
	/**
	 * Get current user information
	 *
	 * @param WP_REST_Request $request Request object
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_current_user( $request ) {
		$user_id = get_current_user_id();
		
		if ( ! $user_id ) {
			return new WP_Error(
				'rest_user_not_found',
				__( 'User not found.', 'headless-woo-gateway' ),
				array( 'status' => 404 )
			);
		}
		
		$user = get_userdata( $user_id );
		
		if ( ! $user ) {
			return new WP_Error(
				'rest_user_not_found',
				__( 'User not found.', 'headless-woo-gateway' ),
				array( 'status' => 404 )
			);
		}
		
		// Get customer data from WooCommerce
		$customer = new WC_Customer( $user_id );
		
		$response = array(
			'id'            => $user->ID,
			'email'         => $user->user_email,
			'username'      => $user->user_login,
			'display_name'  => $user->display_name,
			'first_name'    => $customer->get_first_name(),
			'last_name'     => $customer->get_last_name(),
			'avatar_url'    => get_avatar_url( $user_id, array( 'size' => 96 ) ),
			'date_registered' => $user->user_registered,
		);
		
		return rest_ensure_response( $response );
	}
	
	/**
	 * Get user orders
	 *
	 * @param WP_REST_Request $request Request object
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_user_orders( $request ) {
		$user_id = get_current_user_id();
		
		if ( ! $user_id ) {
			return new WP_Error(
				'rest_user_not_found',
				__( 'User not found.', 'headless-woo-gateway' ),
				array( 'status' => 404 )
			);
		}
		
		$per_page = $request->get_param( 'per_page' );
		$page     = $request->get_param( 'page' );
		$status   = $request->get_param( 'status' );
		
		// Build query arguments
		$args = array(
			'customer_id' => $user_id,
			'limit'       => $per_page,
			'page'        => $page,
			'orderby'     => 'date',
			'order'       => 'DESC',
			'return'      => 'ids',
		);
		
		// Add status filter if provided
		if ( ! empty( $status ) ) {
			$args['status'] = $status;
		}
		
		// Get order IDs
		$order_ids = wc_get_orders( $args );
		
		// Get total count for pagination
		$total_args = $args;
		unset( $total_args['limit'], $total_args['page'] );
		$total_orders = count( wc_get_orders( $total_args ) );
		
		// Format orders
		$orders = array();
		foreach ( $order_ids as $order_id ) {
			$order = wc_get_order( $order_id );
			
			if ( ! $order ) {
				continue;
			}
			
			// Verify order belongs to current user (security check)
			if ( $order->get_customer_id() !== $user_id ) {
				continue;
			}
			
			// Get order items
			$items = array();
			foreach ( $order->get_items() as $item ) {
				$product = $item->get_product();
				$items[] = array(
					'name'       => $item->get_name(),
					'qty'        => $item->get_quantity(),
					'price'      => (float) $item->get_total(),
					'product_id' => $product ? $product->get_id() : 0,
				);
			}
			
			// Get billing address
			$billing = array(
				'first_name' => $order->get_billing_first_name(),
				'last_name'  => $order->get_billing_last_name(),
				'email'      => $order->get_billing_email(),
				'phone'      => $order->get_billing_phone(),
				'address_1'  => $order->get_billing_address_1(),
				'address_2'  => $order->get_billing_address_2(),
				'city'       => $order->get_billing_city(),
				'state'      => $order->get_billing_state(),
				'postcode'   => $order->get_billing_postcode(),
				'country'    => $order->get_billing_country(),
			);
			
			// Get shipping address
			$shipping = array(
				'first_name' => $order->get_shipping_first_name(),
				'last_name'  => $order->get_shipping_last_name(),
				'address_1'  => $order->get_shipping_address_1(),
				'address_2'  => $order->get_shipping_address_2(),
				'city'       => $order->get_shipping_city(),
				'state'      => $order->get_shipping_state(),
				'postcode'   => $order->get_shipping_postcode(),
				'country'    => $order->get_shipping_country(),
			);
			
			$orders[] = array(
				'id'           => $order->get_id(),
				'status'       => $order->get_status(),
				'total'        => (float) $order->get_total(),
				'currency'     => $order->get_currency(),
				'date_created' => $order->get_date_created()->date( 'c' ),
				'items'        => $items,
				'billing'      => $billing,
				'shipping'     => $shipping,
			);
		}
		
		$response = array(
			'orders'      => $orders,
			'total'       => $total_orders,
			'per_page'    => $per_page,
			'current_page' => $page,
			'total_pages' => ceil( $total_orders / $per_page ),
			'pagination'  => array(
				'page'        => $page,
				'per_page'    => $per_page,
				'total'       => $total_orders,
				'total_pages' => ceil( $total_orders / $per_page ),
			),
		);
		
		return rest_ensure_response( $response );
	}
	
	/**
	 * Get user billing and shipping address
	 *
	 * @param WP_REST_Request $request Request object
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_user_address( $request ) {
		$user_id = get_current_user_id();
		
		if ( ! $user_id ) {
			return new WP_Error(
				'rest_user_not_found',
				__( 'User not found.', 'headless-woo-gateway' ),
				array( 'status' => 404 )
			);
		}
		
		// Get customer data from WooCommerce
		$customer = new WC_Customer( $user_id );
		
		// Format billing address
		$billing = array(
			'first_name' => $customer->get_billing_first_name(),
			'last_name'  => $customer->get_billing_last_name(),
			'company'    => $customer->get_billing_company(),
			'address_1'  => $customer->get_billing_address_1(),
			'address_2'  => $customer->get_billing_address_2(),
			'city'       => $customer->get_billing_city(),
			'state'      => $customer->get_billing_state(),
			'postcode'   => $customer->get_billing_postcode(),
			'country'    => $customer->get_billing_country(),
			'email'      => $customer->get_billing_email(),
			'phone'      => $customer->get_billing_phone(),
		);
		
		// Format shipping address
		$shipping = array(
			'first_name' => $customer->get_shipping_first_name(),
			'last_name'  => $customer->get_shipping_last_name(),
			'company'    => $customer->get_shipping_company(),
			'address_1'  => $customer->get_shipping_address_1(),
			'address_2'  => $customer->get_shipping_address_2(),
			'city'       => $customer->get_shipping_city(),
			'state'      => $customer->get_shipping_state(),
			'postcode'   => $customer->get_shipping_postcode(),
			'country'    => $customer->get_shipping_country(),
		);
		
		$response = array(
			'billing'  => $billing,
			'shipping' => $shipping,
		);
		
		return rest_ensure_response( $response );
	}
}

/**
 * Initialize the plugin
 */
function headless_woo_gateway_init() {
	return Headless_Woo_Gateway::get_instance();
}

// Initialize plugin
headless_woo_gateway_init();

