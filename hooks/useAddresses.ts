"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const DELETED_IDS_KEY = 'addresses-deleted-ids';

function getDeletedIdsFromStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(arr.map((id) => String(id).toLowerCase()));
  } catch {
    return new Set();
  }
}

function addDeletedIdToStorage(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedIdsFromStorage();
    set.add(String(id).toLowerCase());
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

/** Call on logout so the next user doesn't see the previous user's deleted list */
export function clearAddressesDeletedIds(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DELETED_IDS_KEY);
  } catch {
    // ignore
  }
}

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
  // NDIS / HCP (optional; saved with address when present)
  ndis_participant_name?: string;
  ndis_number?: string;
  ndis_dob?: string;
  ndis_funding_type?: string;
  ndis_approval?: boolean;
  ndis_invoice_email?: string;
  hcp_participant_name?: string;
  hcp_number?: string;
  hcp_provider_email?: string;
  hcp_approval?: boolean;
}

interface UseAddressesResult {
  addresses: Address[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
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
        headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }

      const result = await response.json();
      const list = result.addresses || [];
      const deleted = getDeletedIdsFromStorage();
      return list.filter((a) => !deleted.has(String(a.id).toLowerCase()));
    },
    staleTime: 0,
    gcTime: 0,
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
    onSuccess: (data: { address?: Address; message?: string }) => {
      const newAddress = data?.address;
      if (newAddress && newAddress.id != null) {
        queryClient.setQueryData<Address[]>(['addresses'], (old) => {
          const list = old ?? [];
          const idStr = String(newAddress.id);
          const exists = list.some((a) => String(a.id) === idStr);
          if (exists) {
            return list.map((a) => (String(a.id) === idStr ? { ...newAddress, id: newAddress.id } : a));
          }
          return [...list, { ...newAddress, id: newAddress.id }];
        });
      }
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, address }: { id: string; address: Partial<Address> }) => {
      const idStr = String(id);
      const response = await fetch(`/api/dashboard/addresses/${encodeURIComponent(idStr)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(address),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as { error?: string }).error || 'Failed to update address');
      }

      const result = await response.json();
      const updatedAddr = result.address as Address;
      return { id: idStr, updated: updatedAddr, result };
    },
    onSuccess: (data) => {
      const updated = data.updated as unknown as Record<string, unknown> | undefined;
      const idStr = String(data.id);
      if (updated) {
        queryClient.setQueryData<Address[]>(['addresses'], (old) => {
          if (!old) return old;
          return old.map((a) => {
            if (String(a.id) !== idStr) return a;
            const keys = ['type', 'label', 'first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country', 'email', 'phone', 'ndis_participant_name', 'ndis_number', 'ndis_dob', 'ndis_funding_type', 'ndis_approval', 'ndis_invoice_email', 'hcp_participant_name', 'hcp_number', 'hcp_provider_email', 'hcp_approval'] as const;
            const merged = { ...a } as unknown as Record<string, unknown>;
            for (const key of keys) {
              if (Object.prototype.hasOwnProperty.call(updated, key)) {
                merged[key] = updated[key] ?? '';
              }
            }
            if (updated.id != null) merged.id = updated.id as string;
            return merged as unknown as Address;
          });
        });
      }
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
    onSuccess: (_data, deletedId) => {
      const idStr = String(deletedId);
      addDeletedIdToStorage(idStr);
      queryClient.setQueryData<Address[]>(['addresses'], (old) =>
        old ? old.filter((a) => String(a.id) !== idStr) : old
      );
    },
  });

  return {
    addresses: data || [],
    isLoading,
    error: error as Error | null,
    refetch: () => refetch(),
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

