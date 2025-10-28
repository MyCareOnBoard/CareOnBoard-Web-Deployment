/**
 * Toast Hook using Sonner
 * 
 * Wrapper around Sonner toast notifications for consistent API
 */

import { toast as sonnerToast } from 'sonner'

export interface Toast {
  id?: string | number
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'info' | 'warning'
}

export function useToast() {
  const toast = ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    // Handle different variants
    switch (variant) {
      case 'destructive':
        return sonnerToast.error(title, {
          description: description,
        })
      
      case 'success':
        return sonnerToast.success(title, {
          description: description,
        })
      
      case 'info':
        return sonnerToast.info(title, {
          description: description,
        })
      
      case 'warning':
        return sonnerToast.warning(title, {
          description: description,
        })
      
      case 'default':
      default:
        return sonnerToast(title, {
          description: description,
        })
    }
  }

  return {
    toast,
    dismiss: sonnerToast.dismiss,
  }
}

// Re-export sonner for direct usage
export { toast as sonner } from 'sonner'
