# Customer Addresses API Plugin

This WordPress plugin provides REST API endpoints for managing multiple customer billing and shipping addresses.

## Installation

1. Upload the `customer-addresses-api` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Ensure you have JWT Authentication plugin installed and configured (for user authentication)

## Requirements

- WordPress 5.0+
- WooCommerce (optional, but recommended)
- JWT Authentication for WP-API plugin (for REST API authentication)

## API Endpoints

### Get All Addresses
- **URL**: `/wp-json/customers/v1/addresses`
- **Method**: GET
- **Authentication**: Required (Bearer token)
- **Response**: 
```json
{
  "addresses": [
    {
      "id": "uuid",
      "type": "billing",
      "label": "Home",
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Main St",
      "city": "Sydney",
      "state": "NSW",
      "postcode": "2000",
      "country": "AU",
      "phone": "+61 2 1234 5678",
      "email": "john@example.com"
    }
  ]
}
```

### Add New Address
- **URL**: `/wp-json/customers/v1/addresses`
- **Method**: POST
- **Authentication**: Required (Bearer token)
- **Body**: 
```json
{
  "type": "billing",
  "label": "Home",
  "first_name": "John",
  "last_name": "Doe",
  "address_1": "123 Main St",
  "city": "Sydney",
  "state": "NSW",
  "postcode": "2000",
  "country": "AU",
  "phone": "+61 2 1234 5678",
  "email": "john@example.com"
}
```

### Update Address
- **URL**: `/wp-json/customers/v1/addresses/{id}`
- **Method**: PUT
- **Authentication**: Required (Bearer token)
- **Body**: Partial address object with fields to update

### Delete Address
- **URL**: `/wp-json/customers/v1/addresses/{id}`
- **Method**: DELETE
- **Authentication**: Required (Bearer token)

## How It Works

- Addresses are stored in WordPress user meta with the key `saved_addresses`
- Each address has a unique UUID generated automatically
- Default billing/shipping addresses from WooCommerce customer data are included
- Addresses can be labeled (e.g., "Home", "Office", "Friend")
- Default addresses cannot be deleted

## Notes

- The plugin requires JWT authentication to identify the current user
- The JWT token should be sent in the Authorization header: `Authorization: Bearer <token>`
- If JWT authentication is not properly configured, the endpoints will return 401 Unauthorized

