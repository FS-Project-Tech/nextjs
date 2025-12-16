"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useCart } from "@/components/CartProvider";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import { getCartUrl } from "@/lib/access-token";
import { useAddresses } from "@/hooks/useAddresses";
import { useAuth } from "@/contexts/AuthContext";
import { useCoupon } from "@/components/CouponProvider";
import CouponInput from "@/components/CouponInput";
import ShippingOptions from "@/components/ShippingOptions";
import { parseCartTotal, calculateGST, calculateTotal } from "@/lib/cart-utils";
import { formatPrice } from "@/lib/format-utils";

// Shipping Method Type
interface ShippingMethodType {
  id: string;
  method_id: string;
  label: string;
  cost: number;
  total: number;
  description?: string;
}

// Validation Schema
const checkoutSchema = yup.object({
  billing: yup.object({
    first_name: yup.string().required("First name is required"),
    last_name: yup.string().required("Last name is required"),
    email: yup.string().email("Invalid email").required("Email is required"),
    phone: yup.string().required("Phone is required"),
    address_1: yup.string().required("Address is required"),
    city: yup.string().required("City is required"),
    postcode: yup.string().required("Postcode is required"),
    country: yup.string().required("Country is required"),
    state: yup.string().required("State is required"),
    address_2: yup.string().optional(),
  }),
  shipping: yup.object({
    first_name: yup.string().optional(),
    last_name: yup.string().optional(),
    address_1: yup.string().optional(),
    address_2: yup.string().optional(),
    city: yup.string().optional(),
    postcode: yup.string().optional(),
    country: yup.string().optional(),
    state: yup.string().optional(),
  }),
  shippingMethod: yup.object<ShippingMethodType>({
    id: yup.string().required(),
    method_id: yup.string().required(),
    label: yup.string().required(),
    cost: yup.number().required(),
    total: yup.number().required(),
    description: yup.string().optional(),
  }).required("Please select a shipping method"),
  paymentMethod: yup.string().required("Payment method is required"),
  shipToDifferentAddress: yup.boolean().default(false),
  deliveryAuthority: yup.string().default("with_signature"),
  deliveryInstructions: yup.string().optional(),
  ndis_number: yup.string().optional(),
  hcp_number: yup.string().optional(),
  subscribe_newsletter: yup.boolean().default(false),
  termsAccepted: yup.boolean().oneOf([true], "You must accept the terms and conditions").required(),
});

type CheckoutFormData = yup.InferType<typeof checkoutSchema>;

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, clear, syncWithWooCommerce, total } = useCart();
  const { success, error: showError } = useToast();
  const { appliedCoupon, discount, calculateDiscount } = useCoupon();

  const [isMounted, setIsMounted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<
    Array<{ id: string; title: string; description?: string; enabled: boolean }>
  >([]);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<string>("");
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<string>("");
  const [quoteConversion, setQuoteConversion] = useState<{
    quote_id: string;
    quote_number: string;
    subtotal: number;
    shipping: number;
    shipping_method?: string;
    discount: number;
    total: number;
    notes?: string;
  } | null>(null);
  
  const { user } = useAuth();
  const { addresses, isLoading: addressesLoading } = useAddresses();
  
  // Filter addresses by type
  const billingAddresses = addresses.filter(a => a.type === 'billing');
  const shippingAddresses = addresses.filter(a => a.type === 'shipping');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: yupResolver(checkoutSchema) as any,
    defaultValues: {
      billing: {
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        address_1: "",
        address_2: "",
        city: "",
        postcode: "",
        country: "AU",
        state: "",
      },
      shipping: {
        first_name: "",
        last_name: "",
        address_1: "",
        address_2: "",
        city: "",
        postcode: "",
        country: "AU",
        state: "",
      },
      shipToDifferentAddress: false,
      deliveryAuthority: "with_signature",
      deliveryInstructions: "",
      ndis_number: "",
      hcp_number: "",
      subscribe_newsletter: false,
      termsAccepted: false,
    },
  });

  const watchedBilling = watch("billing");
  const watchedShipping = watch("shipping");
  const watchedShipToDifferent = watch("shipToDifferentAddress");
  const watchedShippingMethod = watch("shippingMethod");
  const watchedPaymentMethod = watch("paymentMethod");

  // Extract stable values from watched objects
  const billingCountry = watchedBilling?.country || "";
  const billingPostcode = watchedBilling?.postcode || "";
  const billingState = watchedBilling?.state || "";
  const shippingCountry = watchedShipping?.country || "";
  const shippingPostcode = watchedShipping?.postcode || "";
  const shippingState = watchedShipping?.state || "";

  useEffect(() => {
    setIsMounted(true);
    
    // Get CSRF token from cookie if available (for authenticated users)
    // For guest users, CSRF validation is skipped on the server
    if (typeof window !== "undefined") {
      const cookies = document.cookie.split(';');
      const csrfCookie = cookies.find(c => c.trim().startsWith('csrf-token='));
      
      if (csrfCookie) {
        const token = csrfCookie.split('=')[1];
        setCsrfToken(token);
      } else {
        // No CSRF token found - guest checkout will work without it
        setCsrfToken('');
      }
    }
  }, []);

  // Calculate stable cart values for dependencies - use primitive values only
  const cartSubtotal = useMemo(() => parseCartTotal(total), [total]);
  const itemsCount = items.length;
  // Create a stable string representation of items for API calls
  // Use itemsCount as the main dependency to avoid array reference issues
  const itemsString = useMemo(() => {
    if (items.length === 0) return '[]';
    return JSON.stringify(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsCount]);

  // Fetch payment methods
  useEffect(() => {
    if (!isMounted) return;

    (async () => {
      try {
        const paymentRes = await fetch("/api/payment-methods", { cache: "no-store" });
        const paymentData = await paymentRes.json();
        if (paymentData.paymentMethods && Array.isArray(paymentData.paymentMethods)) {
          setEnabledPaymentMethods(paymentData.paymentMethods.filter((m: any) => m.enabled));
          if (paymentData.paymentMethods.length > 0 && !watchedPaymentMethod) {
            setValue("paymentMethod", paymentData.paymentMethods[0].id);
          }
        }
      } catch {
        setEnabledPaymentMethods([
          { id: "cod", title: "Cash on Delivery", enabled: true },
          { id: "bacs", title: "Direct Bank Transfer", enabled: true },
        ]);
        if (!watchedPaymentMethod) {
          setValue("paymentMethod", "cod");
        }
      }
    })();
  }, [isMounted, watchedPaymentMethod, setValue]);

  // Auto-fill shipping from billing
  useEffect(() => {
    if (!watchedShipToDifferent && watchedBilling.first_name) {
      setValue("shipping", {
        first_name: watchedBilling.first_name,
        last_name: watchedBilling.last_name,
        address_1: watchedBilling.address_1,
        address_2: watchedBilling.address_2 || "",
        city: watchedBilling.city,
        postcode: watchedBilling.postcode,
        country: watchedBilling.country,
        state: watchedBilling.state,
      });
    }
  }, [watchedShipToDifferent, watchedBilling, setValue]);

  // Recalculate discount when items or subtotal changes
  useEffect(() => {
    if (appliedCoupon && items.length > 0) {
      const subtotal = parseCartTotal(total);
      calculateDiscount(items, subtotal);
    }
  }, [items, total, appliedCoupon, calculateDiscount]);

  // Calculate totals
  const subtotal = parseCartTotal(total);
  const shippingCost = watchedShippingMethod ? Number((watchedShippingMethod as ShippingMethodType)?.cost || 0) : 0;
  const couponDiscount = discount || 0;
  const gst = calculateGST(subtotal, shippingCost, couponDiscount);
  const orderTotal = calculateTotal(subtotal, shippingCost, couponDiscount, gst);

  // Submit handler
  const onSubmit = async (data: CheckoutFormData): Promise<void> => {
    // Type assertion needed due to yup + react-hook-form type inference limitations
    const formData = data as CheckoutFormData;
    if (items.length === 0) {
      showError("Your cart is empty");
      return;
    }

    setPlacing(true);

    try {
      // 1. Sync cart with WooCommerce
      await syncWithWooCommerce();

      // 2. Process payment if online payment method
      let paymentProcessed = false;
      const offlinePaymentMethods = ["cod", "bacs", "bank_transfer", "cheque"];
      const isOfflinePayment = offlinePaymentMethods.includes(data.paymentMethod);

      if (!isOfflinePayment && data.paymentMethod === "paypal") {
        try {
          const paymentRes = await fetch("/api/payments/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payment_method: data.paymentMethod,
              amount: orderTotal,
              currency: "AUD",
              billing: data.billing,
              return_url: typeof window !== "undefined" ? window.location.href : "",
            }),
          });

          const paymentData = await paymentRes.json();
          if (!paymentRes.ok || !paymentData.success) {
            showError(paymentData.error || "Payment processing failed");
            setPlacing(false);
            return;
          }
          paymentProcessed = paymentData.requires_payment !== false;
        } catch (paymentError) {
          console.error("Payment processing error:", paymentError);
          showError("Payment processing failed");
          setPlacing(false);
          return;
        }
      }

      // 3. Prepare checkout payload
      const finalShipping = data.shipToDifferentAddress ? data.shipping : data.billing;

      // Clean and prepare shipping method data
      let shippingMethodData: any = null;
      if (data.shippingMethod) {
        const sm = data.shippingMethod as ShippingMethodType;
        shippingMethodData = {
          method_id: sm.method_id || "flat_rate",
          total: String(sm.total || sm.cost || 0),
        };
      }

      const checkoutPayload: any = {
        billing: {
          first_name: data.billing.first_name || "",
          last_name: data.billing.last_name || "",
          email: data.billing.email || "",
          phone: data.billing.phone || "",
          address_1: data.billing.address_1 || "",
          address_2: data.billing.address_2 || "",
          city: data.billing.city || "",
          state: data.billing.state || "",
          postcode: data.billing.postcode || "",
          country: data.billing.country || "AU",
        },
        shipping: {
          first_name: finalShipping.first_name || "",
          last_name: finalShipping.last_name || "",
          address_1: finalShipping.address_1 || "",
          address_2: finalShipping.address_2 || "",
          city: finalShipping.city || "",
          state: finalShipping.state || "",
          postcode: finalShipping.postcode || "",
          country: finalShipping.country || "AU",
        },
        payment_method: data.paymentMethod || "",
        payment_processed: paymentProcessed,
        line_items: items.map((i) => ({
          product_id: i.productId,
          variation_id: i.variationId || undefined,
          quantity: i.qty,
          name: i.name || "",
          price: i.price || "0",
          sku: i.sku || "",
          slug: i.slug || "",
        })),
        shipping_lines: shippingMethodData ? [shippingMethodData] : [],
        total: orderTotal,
      };

      // Add optional fields only if they have values
      const couponCode = appliedCoupon?.code || searchParams.get("coupon");
      if (couponCode) {
        checkoutPayload.coupon_code = couponCode;
      }

      if (csrfToken) {
        checkoutPayload.csrf_token = csrfToken;
      }

      if (data.ndis_number) {
        checkoutPayload.ndis_number = data.ndis_number;
      }

      if (data.hcp_number) {
        checkoutPayload.hcp_number = data.hcp_number;
      }

      checkoutPayload.delivery_authority = data.deliveryAuthority || "with_signature";
      
      if (data.deliveryInstructions) {
        checkoutPayload.delivery_instructions = data.deliveryInstructions;
      }

      checkoutPayload.subscribe_newsletter = data.subscribe_newsletter || false;

      // Add quote conversion data if present
      if (quoteConversion) {
        checkoutPayload.quote_id = quoteConversion.quote_id;
        checkoutPayload.quote_number = quoteConversion.quote_number;
      }

      // 4. Create order via checkout API
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      // Only add CSRF token header if token exists
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }

      // Serialize payload with error handling
      let payloadString: string;
      try {
        payloadString = JSON.stringify(checkoutPayload);
      } catch (stringifyError) {
        console.error("Error stringifying checkout payload:", stringifyError);
        showError("Invalid checkout data. Please refresh and try again.");
        setPlacing(false);
        return;
      }

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers,
        body: payloadString,
      });

      if (!checkoutRes.ok) {
        let errorData: any = {};
        let errorMessage = "Failed to create order";
        
        try {
          const text = await checkoutRes.text();
          if (text) {
            try {
              errorData = JSON.parse(text);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (parseError) {
              // If JSON parsing fails, use the raw text or status message
              console.error("Error parsing error response:", parseError);
              errorMessage = text || `Server returned ${checkoutRes.status} ${checkoutRes.statusText}`;
            }
          } else {
            errorMessage = `Server returned ${checkoutRes.status} ${checkoutRes.statusText || 'error'}`;
          }
        } catch (readError) {
          console.error("Error reading error response:", readError);
          errorMessage = `Server error (${checkoutRes.status}). Please try again.`;
        }
        
        console.error("Checkout API error:", {
          status: checkoutRes.status,
          statusText: checkoutRes.statusText,
          error: errorData,
        });
        
        showError(errorMessage);
        setPlacing(false);
        return;
      }

      let checkoutData: any = {};
      try {
        const text = await checkoutRes.text();
        if (!text) {
          throw new Error("Empty response from server");
        }
        
        try {
          checkoutData = JSON.parse(text);
        } catch (parseError) {
          console.error("Error parsing checkout response:", {
            error: parseError,
            responseText: text.substring(0, 200), // Log first 200 chars for debugging
            status: checkoutRes.status,
            headers: Object.fromEntries(checkoutRes.headers.entries()),
          });
          throw new Error("Invalid JSON response from server");
        }
        
        // Validate response structure
        if (!checkoutData || typeof checkoutData !== 'object') {
          throw new Error("Invalid response format");
        }
      } catch (parseError: any) {
        console.error("Error processing checkout response:", parseError);
        const errorMsg = parseError.message || "Invalid response from server. Please try again.";
        showError(errorMsg);
        setPlacing(false);
        return;
      }

      if (checkoutData.success && checkoutData.order) {
        // Subscribe to newsletter if checked
        if (data.subscribe_newsletter && data.billing.email) {
          try {
            await fetch("/api/newsletter/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: data.billing.email }),
            });
          } catch {}
        }

        success("Order placed successfully!");

        // Store redirect URL before clearing cart
        const redirectUrl = checkoutData.redirect_url || `/checkout/order-review?orderId=${checkoutData.order.id}`;
        
        // Clear cart immediately (before redirect to prevent showing empty cart)
        clear();
        
        // Use window.location for immediate redirect without re-render
        window.location.href = redirectUrl;
      } else {
        showError("Failed to create order");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      showError(error.message || "An error occurred while placing your order");
    } finally {
      setPlacing(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto w-[85vw] px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <h1 className="text-2xl font-semibold mb-4">Your cart is empty</h1>
            <Link
              href="/shop"
              className="inline-block rounded-md bg-gray-900 px-6 py-3 text-white hover:bg-black"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto w-[85vw] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Checkout</h1>
          <Link
            href={getCartUrl()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Cart
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Billing Details */}
            <div className="rounded-xl border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">Billing Details</h2>
              
              {/* Saved Address Selection */}
              {user && billingAddresses.length > 0 && (
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Select Saved Billing Address
                  </label>
                  <select
                    value={selectedBillingAddress}
                    onChange={(e) => {
                      const addressId = e.target.value;
                      setSelectedBillingAddress(addressId);
                      if (addressId) {
                        const address = billingAddresses.find(a => a.id === addressId);
                        if (address) {
                          setValue('billing.first_name', address.first_name);
                          setValue('billing.last_name', address.last_name);
                          setValue('billing.email', address.email || '');
                          setValue('billing.phone', address.phone || '');
                          setValue('billing.address_1', address.address_1);
                          setValue('billing.address_2', address.address_2 || '');
                          setValue('billing.city', address.city);
                          setValue('billing.state', address.state);
                          setValue('billing.postcode', address.postcode);
                          setValue('billing.country', address.country);
                        }
                      }
                    }}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Enter address manually</option>
                    {billingAddresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.label || 'Address'} - {address.address_1}, {address.city}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    First Name <span className="text-rose-600">*</span>
                  </label>
                  <Controller
                    name="billing.first_name"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full rounded border px-3 py-2 text-sm ${errors.billing?.first_name ? "border-rose-500" : "border-gray-300"}`}
                      />
                    )}
                  />
                  {errors.billing?.first_name && (
                    <p className="mt-1 text-xs text-rose-600">{errors.billing.first_name.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Last Name <span className="text-rose-600">*</span>
                  </label>
                  <Controller
                    name="billing.last_name"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full rounded border px-3 py-2 text-sm ${errors.billing?.last_name ? "border-rose-500" : "border-gray-300"}`}
                      />
                    )}
                  />
                  {errors.billing?.last_name && (
                    <p className="mt-1 text-xs text-rose-600">{errors.billing.last_name.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email <span className="text-rose-600">*</span>
                  </label>
                  <Controller
                    name="billing.email"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        className={`w-full rounded border px-3 py-2 text-sm ${errors.billing?.email ? "border-rose-500" : "border-gray-300"}`}
                      />
                    )}
                  />
                  {errors.billing?.email && (
                    <p className="mt-1 text-xs text-rose-600">{errors.billing.email.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Phone <span className="text-rose-600">*</span>
                  </label>
                  <Controller
                    name="billing.phone"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="tel"
                        className={`w-full rounded border px-3 py-2 text-sm ${errors.billing?.phone ? "border-rose-500" : "border-gray-300"}`}
                      />
                    )}
                  />
                  {errors.billing?.phone && (
                    <p className="mt-1 text-xs text-rose-600">{errors.billing.phone.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Address <span className="text-rose-600">*</span>
                  </label>
                  <Controller
                    name="billing.address_1"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full rounded border px-3 py-2 text-sm ${errors.billing?.address_1 ? "border-rose-500" : "border-gray-300"}`}
                      />
                    )}
                  />
                  {errors.billing?.address_1 && (
                    <p className="mt-1 text-xs text-rose-600">{errors.billing.address_1.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Address 2 (Optional)</label>
                  <Controller
                    name="billing.address_2"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    City <span className="text-rose-600">*</span>
                  </label>
                  <Controller
                    name="billing.city"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full rounded border px-3 py-2 text-sm ${errors.billing?.city ? "border-rose-500" : "border-gray-300"}`}
                      />
                    )}
                  />
                  {errors.billing?.city && (
                    <p className="mt-1 text-xs text-rose-600">{errors.billing.city.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Postcode <span className="text-rose-600">*</span>
                  </label>
                  <Controller
                    name="billing.postcode"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full rounded border px-3 py-2 text-sm ${errors.billing?.postcode ? "border-rose-500" : "border-gray-300"}`}
                      />
                    )}
                  />
                  {errors.billing?.postcode && (
                    <p className="mt-1 text-xs text-rose-600">{errors.billing.postcode.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    State <span className="text-rose-600">*</span>
                  </label>
                  <Controller
                    name="billing.state"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full rounded border px-3 py-2 text-sm ${errors.billing?.state ? "border-rose-500" : "border-gray-300"}`}
                      />
                    )}
                  />
                  {errors.billing?.state && (
                    <p className="mt-1 text-xs text-rose-600">{errors.billing.state.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Country <span className="text-rose-600">*</span>
                  </label>
                  <Controller
                    name="billing.country"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className={`w-full rounded border px-3 py-2 text-sm ${errors.billing?.country ? "border-rose-500" : "border-gray-300"}`}
                      >
                        <option value="AU">Australia</option>
                        <option value="NZ">New Zealand</option>
                        <option value="US">United States</option>
                        <option value="GB">United Kingdom</option>
                      </select>
                    )}
                  />
                  {errors.billing?.country && (
                    <p className="mt-1 text-xs text-rose-600">{errors.billing.country.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Ship to Different Address */}
            <div className="rounded-xl border bg-white p-6">
              <label className="flex items-center gap-2">
                <Controller
                  name="shipToDifferentAddress"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <input
                      type="checkbox"
                      {...field}
                      checked={value || false}
                      onChange={(e) => onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  )}
                />
                <span className="text-sm font-medium text-gray-700">Ship to a different address</span>
              </label>

              {watchedShipToDifferent ? (
                <div className="mt-4 space-y-4">
                  {/* Saved Shipping Address Selection */}
                  {user && shippingAddresses.length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Select Saved Shipping Address
                      </label>
                      <select
                        value={selectedShippingAddress}
                        onChange={(e) => {
                          const addressId = e.target.value;
                          setSelectedShippingAddress(addressId);
                          if (addressId) {
                            const address = shippingAddresses.find(a => a.id === addressId);
                            if (address) {
                              setValue('shipping.first_name', address.first_name);
                              setValue('shipping.last_name', address.last_name);
                              setValue('shipping.address_1', address.address_1);
                              setValue('shipping.address_2', address.address_2 || '');
                              setValue('shipping.city', address.city);
                              setValue('shipping.state', address.state);
                              setValue('shipping.postcode', address.postcode);
                              setValue('shipping.country', address.country);
                            }
                          }
                        }}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">Enter address manually</option>
                        {shippingAddresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.label || 'Address'} - {address.address_1}, {address.city}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">First Name</label>
                      <Controller
                        name="shipping.first_name"
                        control={control}
                        render={({ field }) => (
                          <input {...field} type="text" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                        )}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Last Name</label>
                      <Controller
                        name="shipping.last_name"
                        control={control}
                        render={({ field }) => (
                          <input {...field} type="text" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                        )}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
                      <Controller
                        name="shipping.address_1"
                        control={control}
                        render={({ field }) => (
                          <input {...field} type="text" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                        )}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                      <Controller
                        name="shipping.city"
                        control={control}
                        render={({ field }) => (
                          <input {...field} type="text" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                        )}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Postcode</label>
                      <Controller
                        name="shipping.postcode"
                        control={control}
                        render={({ field }) => (
                          <input {...field} type="text" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                        )}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
                      <Controller
                        name="shipping.state"
                        control={control}
                        render={({ field }) => (
                          <input {...field} type="text" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                        )}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
                      <Controller
                        name="shipping.country"
                        control={control}
                        render={({ field }) => (
                          <select {...field} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
                            <option value="AU">Australia</option>
                            <option value="NZ">New Zealand</option>
                          </select>
                        )}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Shipping Method */}
            <div className="rounded-xl border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">Shipping Method</h2>
              <Controller
                name="shippingMethod"
                control={control}
                render={({ field }) => (
                  <ShippingOptions
                    country={watchedShipToDifferent ? shippingCountry : billingCountry}
                    zone={(watchedShipToDifferent ? shippingCountry : billingCountry) === 'AU' ? 'Australia' : ''}
                    postcode={watchedShipToDifferent ? shippingPostcode : billingPostcode}
                    state={watchedShipToDifferent ? shippingState : billingState}
                    subtotal={cartSubtotal}
                    items={items}
                    selectedRateId={(field.value as ShippingMethodType | undefined)?.id}
                    onRateChange={(rateId, rate) => {
                      field.onChange({
                        id: rateId,
                        method_id: rate.id,
                        label: rate.label,
                        cost: rate.cost,
                        total: rate.cost,
                        description: rate.description,
                      });
                    }}
                    showLabel={false}
                    className=""
                  />
                )}
              />
              {errors.shippingMethod && (
                <p className="mt-2 text-xs text-rose-600">{errors.shippingMethod.message}</p>
              )}
            </div>

            {/* Payment Method */}
            <div className="rounded-xl border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">Payment Method</h2>
              <div className="space-y-2">
                {enabledPaymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className="flex cursor-pointer items-start gap-3 rounded border p-3 hover:bg-gray-50"
                  >
                    <Controller
                      name="paymentMethod"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="radio"
                          {...field}
                          value={method.id}
                          checked={field.value === method.id}
                          className="mt-1 h-4 w-4"
                        />
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{method.title}</div>
                      {method.description && <div className="mt-1 text-xs text-gray-500">{method.description}</div>}
                    </div>
                  </label>
                ))}
              </div>
              {errors.paymentMethod && (
                <p className="mt-1 text-xs text-rose-600">{errors.paymentMethod.message}</p>
              )}
            </div>

            {/* NDIS/HCP Fields */}
            <div className="rounded-xl border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">Additional Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">NDIS Number (Optional)</label>
                  <Controller
                    name="ndis_number"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Enter your NDIS number"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">HCP Number (Optional)</label>
                  <Controller
                    name="hcp_number"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Enter your HCP number"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Delivery Authority</label>
                  <Controller
                    name="deliveryAuthority"
                    control={control}
                    render={({ field }) => (
                      <select {...field} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
                        <option value="with_signature">With Signature Required</option>
                        <option value="without_signature">Without Signature</option>
                      </select>
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Delivery Instructions (Optional)</label>
                  <Controller
                    name="deliveryInstructions"
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={3}
                        placeholder="Special delivery instructions..."
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    )}
                  />
                </div>
                <label className="flex items-center gap-2">
                  <Controller
                    name="subscribe_newsletter"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <input
                        type="checkbox"
                        {...field}
                        checked={value || false}
                        onChange={(e) => onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    )}
                  />
                  <span className="text-sm text-gray-700">Subscribe to our newsletter</span>
                </label>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="rounded-xl border bg-white p-6">
              <label className="flex items-start gap-2">
                <Controller
                  name="termsAccepted"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <input
                      type="checkbox"
                      {...field}
                      checked={value || false}
                      onChange={(e) => onChange(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />
                  )}
                />
                <span className="text-sm text-gray-700">
                  I agree to the <Link href="/terms" className="text-blue-600 hover:underline">Terms and Conditions</Link> and{" "}
                  <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="mt-1 text-xs text-rose-600">{errors.termsAccepted.message}</p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border bg-white p-6 sticky top-4">
              <h2 className="mb-4 text-lg font-semibold">Order Summary</h2>

              <div className="mb-4 space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 text-sm">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs text-gray-400">No Image</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">Qty: {item.qty}</div>
                      <div className="font-semibold text-gray-900">{formatPrice(Number(item.price) * item.qty)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Input */}
              <div className="mb-4">
                <CouponInput />
              </div>

              <div className="space-y-2 border-t pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600">
                    <span>Discount {appliedCoupon && `(${appliedCoupon.code})`}</span>
                    <span className="font-medium">-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{formatPrice(shippingCost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">GST (10%)</span>
                  <span className="font-medium">{formatPrice(gst)}</span>
                </div>
                <div className="mt-4 border-t pt-3">
                  <div className="flex items-center justify-between text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">{formatPrice(orderTotal)}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={placing}
                className="mt-6 w-full rounded-md bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {placing ? "Processing..." : "Place Order"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 py-10 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}

