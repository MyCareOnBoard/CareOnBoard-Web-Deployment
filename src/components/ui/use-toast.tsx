/**
 * Toast Notification Hook
 * Simple toast implementation for user feedback
 */

import { useState, useCallback } from 'react';

export interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

let toastCallback: ((toast: Toast) => void) | null = null;

export function useToast() {
  const [toasts, setToasts] = useState<Array<Toast & { id: number }>>([]);

  const toast = useCallback((props: Toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...props, id }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Register global toast callback
  toastCallback = toast;

  return { toast, toasts };
}

// Export a function that can be called from anywhere
export function showToast(toast: Toast) {
  if (toastCallback) {
    toastCallback(toast);
  }
}
