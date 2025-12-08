import { NextResponse } from "next/server";
import wcAPI from "@/lib/woocommerce";

export async function GET() {
  try {
    // Get WordPress base URL
    const api = process.env.WC_API_URL || '';
    const u = new URL(api);
    const wpBase = `${u.protocol}//${u.host}`;

    // Fetch enabled payment gateways from WooCommerce
    // WooCommerce stores payment gateways in wp_options
    const enabledMethods: Array<{ id: string; title: string; description?: string; enabled: boolean }> = [];

    // Common payment gateway IDs in WooCommerce with their default titles
    const commonGateways = [
      { id: 'bacs', title: 'Direct Bank Transfer', description: 'Make your payment directly into our bank account.' },
      { id: 'cheque', title: 'Check Payments', description: 'Please send a check to Store Name, Store Street, Store Town, Store State / County, Store Postcode.' },
      { id: 'cod', title: 'Cash on Delivery', description: 'Pay with cash upon delivery.' },
      { id: 'paypal', title: 'PayPal', description: 'Pay via PayPal; you can pay with your credit card if you don\'t have a PayPal account.' },
    ];

    // Method 1: Try to fetch via WooCommerce REST API using wcAPI client
    try {
      const gatewaysRes = await wcAPI.get('/payment_gateways');
      const gateways = Array.isArray(gatewaysRes.data) ? gatewaysRes.data : (gatewaysRes.data ? [gatewaysRes.data] : []);
      
      if (gateways.length > 0) {
        for (const gateway of gateways) {
          if (gateway.enabled === true || gateway.enabled === 'yes' || gateway.enabled === 1) {
            enabledMethods.push({
              id: gateway.id,
              title: gateway.title || gateway.method_title || commonGateways.find(g => g.id === gateway.id)?.title || gateway.id,
              description: gateway.description || commonGateways.find(g => g.id === gateway.id)?.description || '',
              enabled: true,
            });
          }
        }
        
        if (enabledMethods.length > 0) {
          return NextResponse.json({ paymentMethods: enabledMethods });
        }
      }
    } catch (gatewayError: any) {
      // WooCommerce REST API might not have payment_gateways endpoint
      // This is expected if the endpoint doesn't exist
      console.log('Payment gateways endpoint not available, trying alternatives...');
    }

    // Method 2: Try to fetch payment gateway settings from WordPress REST API options endpoint
    try {
      const optionsRes = await fetch(`${wpBase}/wp-json/wp/v2/options`, { cache: 'no-store' });
      if (optionsRes.ok) {
        const options = await optionsRes.json();
        
        // Check each gateway's enabled status
        for (const gateway of commonGateways) {
          const gatewayOptionKey = `woocommerce_${gateway.id}_settings`;
          const gatewayOption = options[gatewayOptionKey];
          
          if (gatewayOption) {
            try {
              // Parse settings if it's a string
              let settings: any;
              if (typeof gatewayOption === 'string') {
                // Try to parse as JSON
                try {
                  settings = JSON.parse(gatewayOption);
                } catch {
                  // If not JSON, check for serialized PHP format
                  if (gatewayOption.includes('enabled') && (gatewayOption.includes('yes') || gatewayOption.includes('true'))) {
                    settings = { enabled: 'yes' };
                  }
                }
              } else {
                settings = gatewayOption;
              }
              
              // Check if enabled
              if (settings && (settings.enabled === 'yes' || settings.enabled === true || settings.enabled === '1')) {
                enabledMethods.push({
                  id: gateway.id,
                  title: settings.title || gateway.title,
                  description: settings.description || gateway.description,
                  enabled: true,
                });
              }
            } catch (parseError) {
              // If parsing fails, check if it contains enabled indicators
              const optionStr = String(gatewayOption);
              if ((optionStr.includes('"enabled":"yes"') || 
                   optionStr.includes('"enabled":true') || 
                   optionStr.includes('enabled";s:3:"yes"') ||
                   optionStr.includes('enabled";b:1')) && 
                  !optionStr.includes('"enabled":"no"') &&
                  !optionStr.includes('"enabled":false')) {
                enabledMethods.push({
                  id: gateway.id,
                  title: gateway.title,
                  description: gateway.description,
                  enabled: true,
                });
              }
            }
          }
        }
        
        // Also check gateway order to see which gateways are configured
        const gatewayOrder = options.woocommerce_gateway_order;
        if (gatewayOrder && typeof gatewayOrder === 'string') {
          const orderArray = gatewayOrder.split(',');
          for (const gatewayId of orderArray) {
            const trimmedId = gatewayId.trim();
            if (trimmedId && !enabledMethods.find(m => m.id === trimmedId)) {
              const gateway = commonGateways.find(g => g.id === trimmedId);
              if (gateway) {
                enabledMethods.push({
                  id: gateway.id,
                  title: gateway.title,
                  description: gateway.description,
                  enabled: true,
                });
              }
            }
          }
        }
      }
    } catch {}

    // Method 3: Try direct database query via custom endpoint (if you have a custom plugin)
    // This would require a custom WordPress plugin to expose payment gateways
    
    // If we found methods, return them
    if (enabledMethods.length > 0) {
      return NextResponse.json({ paymentMethods: enabledMethods });
    }

    // Fallback: Return all common payment methods as enabled
    // This ensures the checkout page always has payment options
    // In production, you should ensure one of the above methods works
    console.warn('Payment methods API: Could not fetch from WooCommerce, using fallback methods');
    return NextResponse.json({
      paymentMethods: commonGateways.map(g => ({ ...g, enabled: true }))
    });
    
  } catch (error) {
    console.error('Payment methods API error:', error);
    // Final fallback - return all common methods
    return NextResponse.json({
      paymentMethods: [
        { id: 'bacs', title: 'Direct Bank Transfer', description: 'Make your payment directly into our bank account.', enabled: true },
        { id: 'cod', title: 'Cash on Delivery', description: 'Pay with cash upon delivery.', enabled: true },
        { id: 'paypal', title: 'PayPal', description: 'Pay via PayPal.', enabled: true },
      ]
    });
  }
}


