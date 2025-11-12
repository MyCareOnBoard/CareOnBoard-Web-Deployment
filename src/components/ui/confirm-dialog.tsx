import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { AlertTriangle } from "lucide-react"

const ConfirmDialog = DialogPrimitive.Root

const ConfirmDialogTrigger = DialogPrimitive.Trigger

const ConfirmDialogPortal = DialogPrimitive.Portal

const ConfirmDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
ConfirmDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface ConfirmDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const ConfirmDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ConfirmDialogContentProps
>(({ 
  className, 
  children, 
  title, 
  description, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  onConfirm, 
  onCancel,
  isLoading = false,
  ...props 
}, ref) => (
  <ConfirmDialogPortal>
    <ConfirmDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-full max-w-[379px] translate-x-[-50%] translate-y-[-50%]",
        "rounded-[30px] border border-white/30 bg-white p-5 backdrop-blur",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-[24px]">
        {/* Warning Icon */}
        <div className="relative inline-grid h-[100px] w-[100px] shrink-0">
          <div className="absolute inset-0 rounded-full bg-[#fff5f5]" />
          <div className="absolute left-[14.5px] top-[14px] flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#ef4444] overflow-hidden">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex w-full flex-col gap-[12px] text-center whitespace-pre-wrap">
          {title && (
            <p className="font-semibold text-[32px] leading-normal text-[#10141a]">
              {title}
            </p>
          )}
          {description && (
            <p className="font-medium text-[16px] leading-[1.6] text-[#808081]">
              {description}
            </p>
          )}
          {children}
        </div>

        {/* Buttons */}
        <div className="flex w-full gap-3">
          <Button 
            variant="outline"
            className="flex-1 rounded-[60px] border-[#e0e0e0] px-4 py-4 text-[14px] font-semibold leading-[1.4] text-[#808081] hover:bg-[#f5f5f5]" 
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button 
            variant="destructive"
            className="flex-1 rounded-[60px] bg-[#ef4444] px-4 py-4 text-[14px] font-semibold leading-[1.4] text-white hover:bg-[#dc2626]" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </DialogPrimitive.Content>
  </ConfirmDialogPortal>
))
ConfirmDialogContent.displayName = DialogPrimitive.Content.displayName

const ConfirmDialogClose = DialogPrimitive.Close

export {
  ConfirmDialog,
  ConfirmDialogTrigger,
  ConfirmDialogContent,
  ConfirmDialogClose,
}

