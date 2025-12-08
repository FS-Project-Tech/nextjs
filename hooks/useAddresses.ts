"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Address {
  id?: string;
  type: 'billing' | 'shipping';
  label?: string;
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

interface UseAddressesResult {
  addresses: Address[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
  updateAddress: (id: string, address: Partial<Address>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  isAdding: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function useAddresses(): UseAddressesResult {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/addresses', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }

      const result = await response.json();
      return result.addresses || [];
    },
    staleTime: 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: async (address: Omit<Address, 'id'>) => {
      const response = await fetch('/api/dashboard/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(address),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add address');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, address }: { id: string; address: Partial<Address> }) => {
      const response = await fetch(`/api/dashboard/addresses/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(address),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update address');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/dashboard/addresses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete address');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  return {
    addresses: data || [],
    isLoading,
    error: error as Error | null,
    refetch: () => {
      refetch();
    },
    addAddress: async (address) => {
      await addMutation.mutateAsync(address);
    },
    updateAddress: async (id, address) => {
      await updateMutation.mutateAsync({ id, address });
    },
    deleteAddress: async (id) => {
      await deleteMutation.mutateAsync(id);
    },
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

