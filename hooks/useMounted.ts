import { useEffect, useState } from "react";

/**
 * Hook to track if component is mounted (client-side only)
 * Useful for preventing hydration mismatches and avoiding state updates on unmounted components
 * 
 * @returns {boolean} true if component is mounted, false otherwise
 * 
 * @example
 * const isMounted = useMounted();
 * if (!isMounted) return null;
 */
export function useMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}

