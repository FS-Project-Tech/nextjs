"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Address } from '@/hooks/useAddresses';

const addressSchema = yup.object({
  label: yup.string().optional().nullable(),
  type: yup.string().oneOf(['billing', 'shipping']).required('Address type is required'),
  first_name: yup.string().required('First name is required').test('not-empty', 'First name is required', (value) => {
    return value !== undefined && value !== null && String(value).trim().length > 0;
  }),
  last_name: yup.string().required('Last name is required').test('not-empty', 'Last name is required', (value) => {
    return value !== undefined && value !== null && String(value).trim().length > 0;
  }),
  company: yup.string().optional().nullable(),
  address_1: yup.string().required('Address is required').test('not-empty', 'Address is required', (value) => {
    return value !== undefined && value !== null && String(value).trim().length > 0;
  }),
  address_2: yup.string().optional().nullable(),
  city: yup.string().required('City is required').test('not-empty', 'City is required', (value) => {
    return value !== undefined && value !== null && String(value).trim().length > 0;
  }),
  state: yup.string().required('State is required').test('not-empty', 'State is required', (value) => {
    return value !== undefined && value !== null && String(value).trim().length > 0;
  }),
  postcode: yup.string().required('Postcode is required').test('not-empty', 'Postcode is required', (value) => {
    return value !== undefined && value !== null && String(value).trim().length > 0;
  }),
  country: yup.string().required('Country is required').test('not-empty', 'Country is required', (value) => {
    return value !== undefined && value !== null && String(value).trim().length > 0;
  }),
  email: yup.string().email('Invalid email').optional().nullable(),
  phone: yup.string().optional().nullable(),
});

type AddressFormData = yup.InferType<typeof addressSchema>;

interface AddressFormProps {
  address?: Address;
  onSubmit: (address: Omit<Address, 'id'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultType?: 'billing' | 'shipping';
}

export default function AddressForm({ address, onSubmit, onCancel, isLoading, defaultType = 'billing' }: AddressFormProps) {
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
    reset,
    clearErrors,
  } = useForm<AddressFormData>({
    resolver: yupResolver(addressSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    shouldFocusError: false,
    defaultValues: address || {
      type: defaultType,
      country: 'AU',
      first_name: '',
      last_name: '',
      address_1: '',
      city: '',
      state: '',
      postcode: '',
    },
  });

  useEffect(() => {
    if (address) {
      // Ensure all required fields have values (convert empty strings to empty string for form)
      const formData = {
        ...address,
        first_name: address.first_name || '',
        last_name: address.last_name || '',
        address_1: address.address_1 || '',
        city: address.city || '',
        state: address.state || '',
        postcode: address.postcode || '',
        country: address.country || 'AU',
        type: address.type || defaultType,
      };
      reset(formData, { keepErrors: false, keepDefaultValues: false });
      clearErrors();
      setHasAttemptedSubmit(false);
    } else if (defaultType) {
      reset({
        type: defaultType,
        country: 'AU',
        first_name: '',
        last_name: '',
        address_1: '',
        city: '',
        state: '',
        postcode: '',
      }, { keepErrors: false, keepDefaultValues: false });
      clearErrors();
      setHasAttemptedSubmit(false);
    }
  }, [address, defaultType, reset, clearErrors]);

  const onFormSubmit = (data: AddressFormData) => {
    setHasAttemptedSubmit(true);
    // Clean up the data: remove empty strings for optional fields
    const cleanedData: any = {
      ...data,
      first_name: data.first_name?.trim() || '',
      last_name: data.last_name?.trim() || '',
      address_1: data.address_1?.trim() || '',
      city: data.city?.trim() || '',
      state: data.state?.trim() || '',
      postcode: data.postcode?.trim() || '',
      country: data.country?.trim() || 'AU',
      label: data.label?.trim() || undefined,
      company: data.company?.trim() || undefined,
      address_2: data.address_2?.trim() || undefined,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
    };
    onSubmit(cleanedData as Omit<Address, 'id'>);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register('type')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            disabled={isLoading}
          >
            <option value="billing">Billing</option>
            <option value="shipping">Shipping</option>
          </select>
          {hasAttemptedSubmit && errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label (e.g., Home, Office, Friend)
          </label>
          <input
            type="text"
            {...register('label')}
            placeholder="Home"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('first_name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          {hasAttemptedSubmit && errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('last_name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          {hasAttemptedSubmit && errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
        <input
          type="text"
          {...register('company')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address Line 1 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('address_1')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
        {hasAttemptedSubmit && errors.address_1 && (
          <p className="mt-1 text-sm text-red-600">{errors.address_1.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
        <input
          type="text"
          {...register('address_2')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('city')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          {hasAttemptedSubmit && errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('state')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          {hasAttemptedSubmit && errors.state && (
            <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Postcode <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('postcode')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          {hasAttemptedSubmit && errors.postcode && (
            <p className="mt-1 text-sm text-red-600">{errors.postcode.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Country <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('country')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
        {hasAttemptedSubmit && errors.country && (
          <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            {...register('email')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            {...register('phone')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      <div className="flex space-x-4 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : address ? 'Update Address' : 'Add Address'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

