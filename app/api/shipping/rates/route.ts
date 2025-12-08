import { NextResponse } from "next/server";
import wcAPI from "@/lib/woocommerce";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");
    const zoneName = searchParams.get("zone");
    const subtotal = searchParams.get("subtotal"); // Cart subtotal for rule-based filtering
    const cartItems = searchParams.get("items"); // JSON string of cart items for category/product filtering

    // Parse cart items if provided
    let parsedItems: any[] = [];
    if (cartItems) {
      try {
        parsedItems = JSON.parse(cartItems);
      } catch {}
    }

    const cartSubtotal = subtotal ? parseFloat(subtotal) : 0;

    // Fetch zones
    const zonesRes = await wcAPI.get("/shipping/zones");
    const zones: Array<{ id: number; name: string }> = zonesRes.data || [];

    const methods: Array<{ 
      id: string; 
      label: string; 
      cost: number; 
      zoneId: number; 
      zone: string;
      minimum_amount?: number;
      maximum_amount?: number;
      requires?: string;
      description?: string;
    }> = [];

    // Filter zones by zone name if provided, otherwise default to Australia zone
    let filteredZones: Array<{ id: number; name: string }>;
    if (zoneName === null || zoneName === undefined) {
      // No zone parameter means default to Australia
      filteredZones = zones.filter(z => z.name.toLowerCase().includes('australia'));
      // If no Australia zone found, fall back to all zones
      if (filteredZones.length === 0) {
        filteredZones = zones;
      }
    } else if (zoneName === '') {
      // Empty string means show all zones
      filteredZones = zones;
    } else {
      // Zone name is explicitly provided, filter by it
      filteredZones = zones.filter(z => z.name.toLowerCase().includes(zoneName.toLowerCase()));
    }

    for (const z of filteredZones) {
      try {
        const mRes = await wcAPI.get(`/shipping/zones/${z.id}/methods`);
        const ms = Array.isArray(mRes.data) ? mRes.data : [];
        for (const m of ms) {
          if (m.enabled !== true && m.enabled !== 'yes') continue;
          
          // Extract cost
          const cost = m.settings?.cost?.value ? parseFloat(m.settings.cost.value) : (typeof m.cost === 'number' ? m.cost : 0);
          
          // Extract minimum and maximum order amounts
          const minimum_amount = m.settings?.min_amount?.value ? parseFloat(m.settings.min_amount.value) : undefined;
          const maximum_amount = m.settings?.max_amount?.value ? parseFloat(m.settings.max_amount.value) : undefined;
          
          // Extract requires (e.g., "min_amount", "coupon", etc.)
          const requires = m.settings?.requires?.value || undefined;
          
          // Extract description
          const description = m.settings?.description?.value || m.method_description || undefined;

          // Apply rule-based filtering
          let shouldInclude = true;

          // Check minimum order amount
          if (minimum_amount !== undefined && cartSubtotal < minimum_amount) {
            shouldInclude = false;
          }

          // Check maximum order amount
          if (maximum_amount !== undefined && cartSubtotal > maximum_amount) {
            shouldInclude = false;
          }

          // Check if method requires specific conditions
          if (requires === 'min_amount' && (!minimum_amount || cartSubtotal < minimum_amount)) {
            shouldInclude = false;
          }

          // Only include methods that pass the rules
          if (shouldInclude) {
            methods.push({ 
              id: `${m.method_id || m.id}:${m.instance_id}`, 
              label: m.title || m.method_title || m.id, 
              cost: isNaN(cost) ? 0 : cost, 
              zoneId: z.id, 
              zone: z.name,
              minimum_amount,
              maximum_amount,
              requires,
              description,
            });
          }
        }
      } catch {}
    }

    return NextResponse.json({ rates: methods });
  } catch (error) {
    const status = error?.response?.status || 500;
    const message = error?.response?.data || { message: "Failed to fetch shipping rates" };
    return NextResponse.json(message, { status });
  }
}

// Duplicate handler removed

