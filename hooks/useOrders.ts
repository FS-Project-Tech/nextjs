"use client";

import { useQuery } from '@tanstack/react-query';

export interface Order {
  id: number;
  status: string;
  date_created: string;
  total: string;
  currency: string;
  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: string;
    product_id: number;
    image?: string;
  }>;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
}

interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

interface UseOrdersResult {
  orders: Order[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useOrders(page: number = 1): UseOrdersResult {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orders', page],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/orders?page=${page}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch orders: ${response.status}`);
      }

      const result = await response.json();
      
      // Log if there's an error in the response
      if (result.error) {
        console.error('Orders API error:', result.error, result.debug);
      }
      
      return {
        orders: result.orders || [],
        pagination: result.pagination || null,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    retry: 1, // Only retry once
  });

  return {
    orders: data?.orders || [],
    pagination: data?.pagination || null,
    isLoading,
    error: error as Error | null,
    refetch: () => {
      refetch();
    },
  };
}

