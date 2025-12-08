"use client";

/**
 * Coupon Provider Context
 * Shares coupon state across all components
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface CouponData {
  id: number;
  code: string;
  type: 'percent' | 'fixed_cart' | 'fixed_product';
  amount: string;
  minimum_amount?: string;
  maximum_amount?: string;
  individual_use?: boolean;
  exclude_sale_items?: boolean;
  product_ids?: number[];
  excluded_product_ids?: number[];
  product_categories?: number[];
  excluded_product_categories?: number[];
  usage_limit?: number;
  usage_count?: number;
  expiry_date?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponData;
  discount?: number;
  error?: string;
}

interface CouponContextType {
  appliedCoupon: CouponData | null;
  discount: number;
  isLoading: boolean;
  error: string | null;
  validateCoupon: (code: string, items: any[], subtotal: number) => Promise<CouponValidationResult>;
  applyCoupon: (code: string, items: any[], subtotal: number) => Promise<boolean>;
  removeCoupon: () => void;
  calculateDiscount: (items: any[], subtotal: number) => Promise<number>;
}

const CouponContext = createContext<CouponContextType | undefined>(undefined);

export function CouponProvider({ children }: { children: ReactNode }) {
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load coupon from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const restoreCoupon = async () => {
      try {
        const savedCode = sessionStorage.getItem('applied_coupon');
        const savedDiscount = sessionStorage.getItem('coupon_discount');
        
        if (savedCode) {
          // Restore discount immediately
          if (savedDiscount) {
            setDiscount(parseFloat(savedDiscount) || 0);
          }
          
          // Fetch full coupon details
          try {
            const response = await fetch('/api/coupons/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: savedCode, items: [] }),
            });
            
            const data = await response.json();
            if (data.valid && data.coupon) {
              setAppliedCoupon(data.coupon);
            }
          } catch {
            // If validation fails, clear saved coupon
            sessionStorage.removeItem('applied_coupon');
            sessionStorage.removeItem('coupon_discount');
          }
        }
      } catch {}
    };
    
    restoreCoupon();
  }, []);

  /**
   * Validate coupon code
   */
  const validateCoupon = useCallback(async (
    code: string,
    items: any[],
    subtotal: number
  ): Promise<CouponValidationResult> => {
    if (!code || !code.trim()) {
      return {
        valid: false,
        error: 'Coupon code is required',
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          items,
        }),
      });

      const data = await response.json();

      if (!data.valid || !data.coupon) {
        setIsLoading(false);
        return {
          valid: false,
          error: data.error || 'Invalid coupon code',
        };
      }

      // Calculate discount
      const discountResponse = await fetch('/api/coupons/validate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          items,
          subtotal,
        }),
      });

      const discountData = await discountResponse.json();

      setIsLoading(false);

      if (!discountData.valid) {
        return {
          valid: false,
          error: discountData.error || 'Coupon cannot be applied',
        };
      }

      return {
        valid: true,
        coupon: data.coupon,
        discount: discountData.discount || 0,
      };
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to validate coupon');
      return {
        valid: false,
        error: err.message || 'Failed to validate coupon',
      };
    }
  }, []);

  /**
   * Apply coupon to cart
   */
  const applyCoupon = useCallback(async (
    code: string,
    items: any[],
    subtotal: number
  ): Promise<boolean> => {
    const result = await validateCoupon(code, items, subtotal);

    if (result.valid && result.coupon) {
      setAppliedCoupon(result.coupon);
      setDiscount(result.discount || 0);
      setError(null);
      
      // Store in sessionStorage
      try {
        sessionStorage.setItem('applied_coupon', result.coupon.code);
        sessionStorage.setItem('coupon_discount', String(result.discount || 0));
      } catch {}

      return true;
    } else {
      setError(result.error || 'Failed to apply coupon');
      return false;
    }
  }, [validateCoupon]);

  /**
   * Remove applied coupon
   */
  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setDiscount(0);
    setError(null);
    
    try {
      sessionStorage.removeItem('applied_coupon');
      sessionStorage.removeItem('coupon_discount');
    } catch {}
  }, []);

  /**
   * Calculate discount for current coupon
   */
  const calculateDiscount = useCallback(async (
    items: any[],
    subtotal: number
  ): Promise<number> => {
    if (!appliedCoupon) {
      setDiscount(0);
      return 0;
    }

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: appliedCoupon.code,
          items,
          subtotal,
        }),
      });

      const data = await response.json();

      if (data.valid && data.discount !== undefined) {
        setDiscount(data.discount);
        // Update sessionStorage
        try {
          sessionStorage.setItem('coupon_discount', String(data.discount));
        } catch {}
        return data.discount;
      }

      setDiscount(0);
      return 0;
    } catch {
      setDiscount(0);
      return 0;
    }
  }, [appliedCoupon]);

  return (
    <CouponContext.Provider
      value={{
        appliedCoupon,
        discount,
        isLoading,
        error,
        validateCoupon,
        applyCoupon,
        removeCoupon,
        calculateDiscount,
      }}
    >
      {children}
    </CouponContext.Provider>
  );
}

export function useCoupon(): CouponContextType {
  const context = useContext(CouponContext);
  if (context === undefined) {
    throw new Error('useCoupon must be used within a CouponProvider');
  }
  return context;
}

