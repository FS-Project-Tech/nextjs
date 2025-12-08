"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef, useId } from 'react';

// Counter for generating unique toast IDs (client-side only)
let toastCounter = 0;

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const noop = (message: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Toast] ${message}`);
  }
};

const fallbackToastContext: ToastContextType = {
  success: noop,
  error: noop,
  info: noop,
  warning: noop,
};

// Toast icons
const ToastIcon = ({ type }: { type: Toast['type'] }) => {
  switch (type) {
    case 'success':
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const announcerRef = useRef<HTMLDivElement>(null);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = `toast-${++toastCounter}`;
    const newToast: Toast = { id, message, type };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after 5 seconds (4 seconds for errors)
    const duration = type === 'error' ? 6000 : 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast]);
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);
  const warning = useCallback((message: string) => addToast(message, 'warning'), [addToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Announce toasts for screen readers
  useEffect(() => {
    if (toasts.length > 0 && announcerRef.current) {
      const latest = toasts[toasts.length - 1];
      announcerRef.current.textContent = `${latest.type}: ${latest.message}`;
    }
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      
      {/* Screen reader announcer */}
      <div
        ref={announcerRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
      
      {/* Toast Container */}
      <div 
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)]"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto w-full min-w-[280px] max-w-sm px-4 py-3 rounded-lg shadow-lg
              transform transition-all duration-300 ease-out
              ${index === toasts.length - 1 ? 'animate-in slide-in-from-top-2 fade-in' : ''}
              ${
                toast.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : toast.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : toast.type === 'warning'
                  ? 'bg-amber-50 border border-amber-200 text-amber-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }
            `}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 mt-0.5">
                <ToastIcon type={toast.type} />
              </span>
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 -mr-1 rounded hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current"
                aria-label="Dismiss notification"
              >
                <svg className="h-4 w-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('useToast used outside ToastProvider. Falling back to console warnings.');
    }
    return fallbackToastContext;
  }
  return context;
}

export default ToastProvider;


