"use client";

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/hooks/useUser';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useToast } from '@/components/ToastProvider';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import withAuth, { WithAuthProps } from '@/lib/withAuth';

const billingSchema = yup.object({
  first_name: yup.string().optional(),
  last_name: yup.string().optional(),
  company: yup.string().optional(),
  address_1: yup.string().optional(),
  address_2: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  postcode: yup.string().optional(),
  country: yup.string().optional(),
  email: yup.string().email('Invalid email').optional(),
  phone: yup.string().optional(),
});

const shippingSchema = yup.object({
  first_name: yup.string().optional(),
  last_name: yup.string().optional(),
  company: yup.string().optional(),
  address_1: yup.string().optional(),
  address_2: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  postcode: yup.string().optional(),
  country: yup.string().optional(),
});

const profileSchema = yup.object({
  first_name: yup.string().optional(),
  last_name: yup.string().optional(),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: yup.string().optional(),
  company: yup.string().optional(),
  billing: billingSchema.optional(),
  shipping: shippingSchema.optional(),
  shipToBilling: yup.boolean().default(false),
});

type ProfileFormData = yup.InferType<typeof profileSchema>;

function DashboardSettings({ user: authUser }: WithAuthProps) {
  const { user } = useUser();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState<any>(null);
  const formInitialized = useRef(false);
  const initializedCustomerId = useRef<number | null>(null);

  // Fetch customer data using React Query
  // Disable refetching on window focus to prevent form resets
  const { data: profileData, isLoading: fetching, error: profileError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const response = await axios.get('/api/dashboard/profile', {
        withCredentials: true,
      });
      return response.data;
    },
    enabled: !!user, // Only fetch when user is available
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false, // Prevent refetching when window gains focus (prevents form resets)
    refetchOnReconnect: false, // Prevent refetching on reconnect
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema) as any,
    defaultValues: {
      email: user?.email || '',
      first_name: '',
      last_name: '',
      phone: '',
      company: '',
      shipToBilling: false,
      billing: {
        first_name: '',
        last_name: '',
        company: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'AU',
        email: '',
        phone: '',
      },
      shipping: {
        first_name: '',
        last_name: '',
        company: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'AU',
      },
    },
  });

  // Populate form when profile data is loaded or when returning to page
  useEffect(() => {
    // Don't run if no data or still loading
    if (!profileData || fetching) {
      return;
    }

    const customerId = profileData.customer?.id || user?.id;
    
    // Check if form is empty (needs initialization)
    const currentValues = getValues();
    const isFormEmpty = !currentValues.billing?.address_1 && 
                       !currentValues.billing?.first_name && 
                       !currentValues.email;
    
    // Only populate if form is empty OR if this is a different customer
    const shouldPopulate = isFormEmpty || 
                          (formInitialized.current && initializedCustomerId.current !== customerId) ||
                          !formInitialized.current;

    if (!shouldPopulate) {
      return;
    }

    if (profileData.customer) {
      const customer = profileData.customer;
      setCustomerData(customer);
      
      // Populate form with customer data
      reset({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || user?.email || '',
        phone: customer.billing?.phone || '',
        company: customer.billing?.company || '',
        shipToBilling: false,
        billing: {
          first_name: customer.billing?.first_name || customer.first_name || '',
          last_name: customer.billing?.last_name || customer.last_name || '',
          company: customer.billing?.company || '',
          address_1: customer.billing?.address_1 || '',
          address_2: customer.billing?.address_2 || '',
          city: customer.billing?.city || '',
          state: customer.billing?.state || '',
          postcode: customer.billing?.postcode || '',
          country: customer.billing?.country || 'AU',
          email: customer.billing?.email || customer.email || user?.email || '',
          phone: customer.billing?.phone || '',
        },
        shipping: {
          first_name: customer.shipping?.first_name || customer.first_name || '',
          last_name: customer.shipping?.last_name || customer.last_name || '',
          company: customer.shipping?.company || '',
          address_1: customer.shipping?.address_1 || '',
          address_2: customer.shipping?.address_2 || '',
          city: customer.shipping?.city || '',
          state: customer.shipping?.state || '',
          postcode: customer.shipping?.postcode || '',
          country: customer.shipping?.country || 'AU',
        },
      }, { keepDefaultValues: false });
      formInitialized.current = true;
      initializedCustomerId.current = customer.id;
    } else if (user) {
      // If no customer data, populate with user email at least
      const currentEmail = getValues('email');
      if (!currentEmail || currentEmail === '') {
        reset({
          email: user?.email || '',
          first_name: '',
          last_name: '',
          phone: '',
          company: '',
          shipToBilling: false,
          billing: {
            first_name: '',
            last_name: '',
            company: '',
            address_1: '',
            address_2: '',
            city: '',
            state: '',
            postcode: '',
            country: 'AU',
            email: user?.email || '',
            phone: '',
          },
          shipping: {
            first_name: '',
            last_name: '',
            company: '',
            address_1: '',
            address_2: '',
            city: '',
            state: '',
            postcode: '',
            country: 'AU',
          },
        }, { keepDefaultValues: false });
        formInitialized.current = true;
        initializedCustomerId.current = user.id;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData, fetching, user?.id]);

  // Handle profile fetch errors
  useEffect(() => {
    if (profileError) {
      const error = profileError as any;
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load customer data';
      const errorDetails = error.response?.data?.details;
      if (errorDetails) {
        console.error('Error details:', errorDetails);
      }
      // Only show error if it's not a 401 (authentication error) - those are handled by middleware
      if (error.response?.status !== 401) {
        showError(errorMessage);
      }
    }
  }, [profileError, showError]);

  // Watch for checkbox toggle to sync shipping with billing
  const shipToBilling = watch('shipToBilling');
  const billingData = watch('billing');
  
  // Only sync when checkbox is toggled ON, not on every billing field change
  // This prevents form values from disappearing while typing
  useEffect(() => {
    if (shipToBilling && billingData) {
      // Only sync once when checkbox is checked, not on every keystroke
      setValue('shipping.first_name', billingData.first_name || '', { shouldDirty: false, shouldValidate: false });
      setValue('shipping.last_name', billingData.last_name || '', { shouldDirty: false, shouldValidate: false });
      setValue('shipping.company', billingData.company || '', { shouldDirty: false, shouldValidate: false });
      setValue('shipping.address_1', billingData.address_1 || '', { shouldDirty: false, shouldValidate: false });
      setValue('shipping.address_2', billingData.address_2 || '', { shouldDirty: false, shouldValidate: false });
      setValue('shipping.city', billingData.city || '', { shouldDirty: false, shouldValidate: false });
      setValue('shipping.state', billingData.state || '', { shouldDirty: false, shouldValidate: false });
      setValue('shipping.postcode', billingData.postcode || '', { shouldDirty: false, shouldValidate: false });
      setValue('shipping.country', billingData.country || 'AU', { shouldDirty: false, shouldValidate: false });
    }
    // Only depend on checkbox state, not billing data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipToBilling, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      // If shipToBilling is checked, copy billing to shipping
      const submitData = { ...data };
      if (data.shipToBilling && data.billing) {
        submitData.shipping = {
          first_name: data.billing.first_name || '',
          last_name: data.billing.last_name || '',
          company: data.billing.company || '',
          address_1: data.billing.address_1 || '',
          address_2: data.billing.address_2 || '',
          city: data.billing.city || '',
          state: data.billing.state || '',
          postcode: data.billing.postcode || '',
          country: data.billing.country || 'AU',
        };
      }
      
      // Save data to WordPress user meta and WooCommerce customer data
      const response = await axios.put('/api/dashboard/profile', submitData, {
        withCredentials: true,
      });
      
      if (!response.data) {
        throw new Error('Failed to update profile');
      }
      
      success('Profile updated successfully');
      
      // IMPORTANT: Do NOT reset the form - keep all user input values as they are
      // The form values will remain in the fields after save (editable mode)
      // Update customerData state for reference, but don't touch the form values
      setCustomerData((prev: any) => ({
        ...prev,
        first_name: submitData.first_name || '',
        last_name: submitData.last_name || '',
        email: submitData.email || '',
        billing: {
          ...prev?.billing,
          ...submitData.billing,
          phone: submitData.phone || submitData.billing?.phone || '',
          company: submitData.company || submitData.billing?.company || '',
        },
        shipping: submitData.shipping || prev?.shipping,
      }));
      
      // Mark form as initialized with current customer to prevent auto-reset
      if (profileData?.customer?.id) {
        initializedCustomerId.current = profileData.customer.id;
        formInitialized.current = true;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update profile';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-1">Update your account information</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Billing Address */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-md font-semibold text-gray-900 mb-4">Billing Address</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  {...register('billing.first_name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  {...register('billing.last_name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                {...register('billing.company')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input
                type="text"
                {...register('billing.address_1')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input
                type="text"
                {...register('billing.address_2')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  {...register('billing.city')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  {...register('billing.state')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                <input
                  type="text"
                  {...register('billing.postcode')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  {...register('billing.country')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  {...register('billing.email')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                {...register('billing.phone')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="pt-6 border-t border-gray-200">
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register('shipToBilling')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const billingData = watch('billing');
                      setValue('shipping.first_name', billingData?.first_name || '');
                      setValue('shipping.last_name', billingData?.last_name || '');
                      setValue('shipping.company', billingData?.company || '');
                      setValue('shipping.address_1', billingData?.address_1 || '');
                      setValue('shipping.address_2', billingData?.address_2 || '');
                      setValue('shipping.city', billingData?.city || '');
                      setValue('shipping.state', billingData?.state || '');
                      setValue('shipping.postcode', billingData?.postcode || '');
                      setValue('shipping.country', billingData?.country || 'AU');
                    }
                  }}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Shipping address same as billing address
                </span>
              </label>
            </div>
            <h3 className="text-md font-semibold text-gray-900 mb-4">Shipping Address</h3>
            <div className={`grid grid-cols-2 gap-4 ${watch('shipToBilling') ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  {...register('shipping.first_name')}
                  disabled={watch('shipToBilling')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  {...register('shipping.last_name')}
                  disabled={watch('shipToBilling')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                />
              </div>
            </div>
            <div className={`mt-4 ${watch('shipToBilling') ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                {...register('shipping.company')}
                disabled={watch('shipToBilling')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
              />
            </div>
            <div className={`mt-4 ${watch('shipToBilling') ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input
                type="text"
                {...register('shipping.address_1')}
                disabled={watch('shipToBilling')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
              />
            </div>
            <div className={`mt-4 ${watch('shipToBilling') ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input
                type="text"
                {...register('shipping.address_2')}
                disabled={watch('shipToBilling')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
              />
            </div>
            <div className={`grid grid-cols-3 gap-4 mt-4 ${watch('shipToBilling') ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  {...register('shipping.city')}
                  disabled={watch('shipToBilling')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  {...register('shipping.state')}
                  disabled={watch('shipToBilling')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                <input
                  type="text"
                  {...register('shipping.postcode')}
                  disabled={watch('shipToBilling')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                />
              </div>
            </div>
            <div className={`mt-4 ${watch('shipToBilling') ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                {...register('shipping.country')}
                disabled={watch('shipToBilling')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Username</dt>
            <dd className="mt-1 text-sm text-gray-900">{customerData?.username || user?.username || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Role</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {user?.roles?.join(', ') || 'Customer'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">User ID</dt>
            <dd className="mt-1 text-sm text-gray-900">{user?.id || 'N/A'}</dd>
          </div>
          {customerData?.id && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Customer ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{customerData.id}</dd>
            </div>
          )}
          {customerData?.date_created && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Member Since</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(customerData.date_created).toLocaleDateString('en-AU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

// Export the protected component
export default withAuth(DashboardSettings);

