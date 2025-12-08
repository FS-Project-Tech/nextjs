/**
 * Client-side authentication utilities
 * These functions interact with the API routes for authentication
 */

export interface User {
  id: number;
  name: string;
  email: string;
  username?: string;
}

export interface CustomerData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  billing?: any;
  shipping?: any;
  isPayingCustomer: boolean;
  ordersCount: number;
  totalSpent: string;
  dateCreated: string;
}


/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
  });
}

/**
 * Get current authenticated user
 */
export async function getUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', { cache: 'no-store' });
    const data = await response.json();
    return data.user || null;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser();
  return user !== null;
}


