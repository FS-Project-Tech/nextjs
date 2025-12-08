"use client";

import { useState } from 'react';
import { useAddresses, Address } from '@/hooks/useAddresses';
import { useToast } from '@/components/ToastProvider';
import AddressForm from '@/components/dashboard/AddressForm';

export default function DashboardAddresses() {
  const { addresses, isLoading, error, addAddress, updateAddress, deleteAddress, isAdding, isUpdating, isDeleting } = useAddresses();
  const { success, error: showError } = useToast();
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [defaultAddressType, setDefaultAddressType] = useState<'billing' | 'shipping'>('billing');

  const handleAdd = async (address: Omit<Address, 'id'>) => {
    try {
      await addAddress(address);
      success('Address added successfully');
      setShowAddForm(false);
    } catch (err: any) {
      showError(err.message || 'Failed to add address');
    }
  };

  const handleUpdate = async (id: string, address: Partial<Address>) => {
    try {
      await updateAddress(id, address);
      success('Address updated successfully');
      setEditingAddress(null);
    } catch (err: any) {
      showError(err.message || 'Failed to update address');
    }
  };

  const handleDelete = async (id: string) => {
    // Don't allow deleting default addresses
    if (id === 'default-billing' || id === 'default-shipping') {
      showError('Cannot delete default addresses');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }
    try {
      await deleteAddress(id);
      success('Address deleted successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to delete address');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Addresses</h1>
          <p className="text-gray-600 mt-1">
            Manage multiple billing and shipping addresses. You can add as many addresses as you need for different locations.
          </p>
        </div>
        {!showAddForm && !editingAddress && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDefaultAddressType('billing');
                setShowAddForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Billing Address
            </button>
            <button
              onClick={() => {
                setDefaultAddressType('shipping');
                setShowAddForm(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Shipping Address
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error.message}</p>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Address</h2>
          <AddressForm
            onSubmit={handleAdd}
            onCancel={() => setShowAddForm(false)}
            isLoading={isAdding}
            defaultType={defaultAddressType}
          />
        </div>
      )}

      {editingAddress && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Address</h2>
          <AddressForm
            address={editingAddress}
            onSubmit={(address) => {
              if (editingAddress.id) {
                handleUpdate(editingAddress.id, address);
              }
            }}
            onCancel={() => setEditingAddress(null)}
            isLoading={isUpdating}
          />
        </div>
      )}

      {addresses.length === 0 && !showAddForm && !editingAddress ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <span className="text-6xl mb-4 block">📍</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No addresses saved</h3>
          <p className="text-gray-600 mb-6">Add your first address to get started</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setDefaultAddressType('billing');
                setShowAddForm(true);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Billing Address
            </button>
            <button
              onClick={() => {
                setDefaultAddressType('shipping');
                setShowAddForm(true);
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Shipping Address
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => {
            const isDefault = address.id === 'default-billing' || address.id === 'default-shipping';
            return (
              <div
                key={address.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        address.type === 'billing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {address.type === 'billing' ? 'Billing' : 'Shipping'}
                    </span>
                    {address.label && (
                      <span className="text-sm font-medium text-gray-700">
                        {address.label}
                      </span>
                    )}
                    {isDefault && (
                      <span className="text-xs text-gray-500">(Default)</span>
                    )}
                  </div>
                  {!isDefault && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingAddress(address)}
                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        disabled={isUpdating || isDeleting}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(address.id!)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                        disabled={isUpdating || isDeleting}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-medium text-gray-900">
                    {address.first_name} {address.last_name}
                  </p>
                  {address.company && (
                    <p className="text-gray-600">{address.company}</p>
                  )}
                  <p className="text-gray-600">{address.address_1}</p>
                  {address.address_2 && (
                    <p className="text-gray-600">{address.address_2}</p>
                  )}
                  <p className="text-gray-600">
                    {address.city}, {address.state} {address.postcode}
                  </p>
                  <p className="text-gray-600">{address.country}</p>
                  {address.phone && (
                    <p className="text-gray-600">Phone: {address.phone}</p>
                  )}
                  {address.email && (
                    <p className="text-gray-600">Email: {address.email}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

