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
        return sonnerToast.error(<div className="font-medium">{title}</div>, {
          description: description,
        })
      
      case 'success':
        return sonnerToast.success(<div className="font-medium">{title}</div>, {
          description: description,
        })
      
      case 'info':
        return sonnerToast.info(<div className="font-medium">{title}</div>, {
          description: description,
        })
      
      case 'warning':
        return sonnerToast.warning(<div className="font-medium">{title}</div>, {
          description: description,
        })
      
      case 'default':
      default:
        return sonnerToast(<div className="font-medium">{title}</div>, {
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
