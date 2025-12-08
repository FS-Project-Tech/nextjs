import { NextRequest, NextResponse } from 'next/server';
import { getWpBaseUrl } from '@/lib/auth';
import { getAuthToken } from '@/lib/auth-server';

/**
 * PUT /api/dashboard/addresses/[id]
 * Update an address
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const addressId = resolvedParams.id;
    const body = await req.json();

    const wpBase = getWpBaseUrl();
    if (!wpBase) {
      return NextResponse.json(
        { error: 'WordPress URL not configured' },
        { status: 500 }
      );
    }

    // Update address via custom endpoint
    const updateResponse = await fetch(`${wpBase}/wp-json/customers/v1/addresses/${addressId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      return NextResponse.json(
        { error: (error instanceof Error ? error.message : 'An error occurred') || 'Failed to update address' },
        { status: updateResponse.status }
      );
    }

    const result = await updateResponse.json();
    return NextResponse.json({ 
      address: result.address,
      message: result.message || 'Address updated successfully' 
    });
  } catch (error) {
    console.error('Update address error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating address' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/addresses/[id]
 * Delete an address (clear it)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const addressId = resolvedParams.id;

    const wpBase = getWpBaseUrl();
    if (!wpBase) {
      return NextResponse.json(
        { error: 'WordPress URL not configured' },
        { status: 500 }
      );
    }

    // Delete address via custom endpoint
    const deleteResponse = await fetch(`${wpBase}/wp-json/customers/v1/addresses/${addressId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      return NextResponse.json(
        { error: error.message || 'Failed to delete address' },
        { status: deleteResponse.status }
      );
    }

    const result = await deleteResponse.json();
    return NextResponse.json({ 
      message: result.message || 'Address deleted successfully' 
    });
  } catch (error: any) {
    console.error('Delete address error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting address' },
      { status: 500 }
    );
  }
}

