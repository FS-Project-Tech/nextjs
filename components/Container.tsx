import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  suppressHydrationWarning?: boolean;
}

/**
 * Reusable container component with consistent spacing
 * Uses the standard site width: w-[85vw] with responsive padding
 */
export default function Container({ 
  children, 
  className = "", 
  suppressHydrationWarning = false 
}: ContainerProps) {
  return (
    <div 
      className={`mx-auto w-[85vw] px-4 sm:px-6 lg:px-8 ${className}`}
      suppressHydrationWarning={suppressHydrationWarning}
    >
      {children}
    </div>
  );
}

