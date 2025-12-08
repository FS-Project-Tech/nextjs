import { NextRequest, NextResponse } from 'next/server';
import { getWpBaseUrl } from '@/lib/auth';
import { getAuthToken } from '@/lib/auth-server';

/**
 * GET /api/dashboard/addresses
 * Fetch addresses for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const wpBase = getWpBaseUrl();
    if (!wpBase) {
      return NextResponse.json(
        { error: 'WordPress URL not configured' },
        { status: 500 }
      );
    }

    // Get user data
    const userResponse = await fetch(`${wpBase}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get user data' },
        { status: 401 }
      );
    }

    // Fetch addresses from custom endpoint
    const addressesResponse = await fetch(`${wpBase}/wp-json/customers/v1/addresses`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!addressesResponse.ok) {
      // If endpoint doesn't exist, return empty array
      if (addressesResponse.status === 404) {
        return NextResponse.json({ addresses: [] });
      }
      throw new Error('Failed to fetch addresses');
    }

    const addressesData = await addressesResponse.json();
    return NextResponse.json({ addresses: addressesData.addresses || [] });
  } catch (error) {
    console.error('Addresses API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching addresses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/addresses
 * Add a new address
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();

    const wpBase = getWpBaseUrl();
    if (!wpBase) {
      return NextResponse.json(
        { error: 'WordPress URL not configured' },
        { status: 500 }
      );
    }

    // Add address via custom endpoint
    const addResponse = await fetch(`${wpBase}/wp-json/customers/v1/addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!addResponse.ok) {
      const error = await addResponse.json();
      return NextResponse.json(
        { error: (error instanceof Error ? error.message : 'An error occurred') || 'Failed to add address' },
        { status: addResponse.status }
      );
    }

    const result = await addResponse.json();
    return NextResponse.json({ 
      address: result.address,
      message: result.message || 'Address added successfully' 
    });
  } catch (error) {
    console.error('Add address error:', error);
    return NextResponse.json(
      { error: 'An error occurred while adding address' },
      { status: 500 }
    );
  }
}


