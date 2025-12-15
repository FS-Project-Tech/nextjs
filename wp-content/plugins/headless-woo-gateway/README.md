# Headless Woo API Gateway

Enterprise-grade API Gateway plugin for Headless WooCommerce + Next.js applications.

## Overview

This plugin provides secure, user-aware REST API endpoints for headless WooCommerce implementations. It acts as a gateway between your Next.js frontend and WooCommerce, ensuring all requests are authenticated and user-scoped.

## Architecture

- **WordPress/WooCommerce** is the single source of truth
- **Frontend (Next.js)** never calls WooCommerce REST APIs directly
- All frontend requests go through this API Gateway
- User identity comes from JWT (validated by JWT Authentication for WP-API plugin)
- Uses `get_current_user_id()` to ensure user context

## Requirements

- WordPress 5.8+
- PHP 7.4+
- WooCommerce 5.0+
- JWT Authentication for WP-API plugin (for authentication)

## Installation

1. Upload the `headless-woo-gateway` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Ensure WooCommerce and JWT Authentication for WP-API are installed and active

## API Endpoints

All endpoints are prefixed with `/wp-json/api/v1/`

### 1. GET /wp-json/api/v1/me

Returns current authenticated user's basic information.

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "username",
  "display_name": "John Doe",
  "first_name": "John",
  "last_name": "Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "date_registered": "2024-01-01T00:00:00"
}
```

**cURL Example:**
```bash
curl -X GET "https://your-site.com/wp-json/api/v1/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 2. GET /wp-json/api/v1/my-orders

Returns orders for the currently authenticated user.

**Authentication:** Required (JWT token)

**Query Parameters:**
- `per_page` (integer, default: 10, max: 100) - Number of orders per page
- `page` (integer, default: 1) - Page number
- `status` (string, optional) - Filter by order status (e.g., 'completed', 'processing', 'pending')

**Response:**
```json
{
  "orders": [
    {
      "id": 123,
      "status": "completed",
      "total": 99.99,
      "currency": "USD",
      "date_created": "2024-01-15T10:30:00+00:00",
      "items": [
        {
          "name": "Product Name",
          "qty": 2,
          "price": 99.99
        }
      ]
    }
  ],
  "total": 25,
  "per_page": 10,
  "current_page": 1,
  "total_pages": 3
}
```

**cURL Examples:**
```bash
# Get all orders (first page)
curl -X GET "https://your-site.com/wp-json/api/v1/my-orders" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get orders with pagination
curl -X GET "https://your-site.com/wp-json/api/v1/my-orders?per_page=20&page=2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get only completed orders
curl -X GET "https://your-site.com/wp-json/api/v1/my-orders?status=completed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. GET /wp-json/api/v1/my-address

Returns billing and shipping addresses for the currently authenticated user.

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "billing": {
    "first_name": "John",
    "last_name": "Doe",
    "company": "Company Name",
    "address_1": "123 Main St",
    "address_2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postcode": "10001",
    "country": "US",
    "email": "user@example.com",
    "phone": "+1234567890"
  },
  "shipping": {
    "first_name": "John",
    "last_name": "Doe",
    "company": "Company Name",
    "address_1": "123 Main St",
    "address_2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postcode": "10001",
    "country": "US"
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://your-site.com/wp-json/api/v1/my-address" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security

- All endpoints require authentication via JWT token
- User identity is automatically determined from the validated JWT token
- Orders are filtered to only return orders belonging to the authenticated user
- No direct database access - all data is retrieved through WooCommerce APIs
- Proper HTTP status codes returned for errors (401 for unauthorized, 404 for not found)

## Error Responses

All endpoints return standard WordPress REST API error format:

```json
{
  "code": "rest_not_authenticated",
  "message": "You must be authenticated to access this endpoint.",
  "data": {
    "status": 401
  }
}
```

Common error codes:
- `rest_not_authenticated` (401) - User is not authenticated
- `rest_user_not_found` (404) - User not found

## Development

### Plugin Structure

```
headless-woo-gateway/
├── headless-woo-gateway.php  # Main plugin file
└── README.md                 # This file
```

### Hooks & Filters

The plugin is designed to be extensible. You can extend it using WordPress hooks:

```php
// Example: Modify user response
add_filter( 'headless_woo_gateway_user_response', function( $response, $user_id ) {
    // Modify $response array
    return $response;
}, 10, 2 );
```

## Support

For issues, feature requests, or contributions, please contact your development team.

## License

GPL v2 or later

