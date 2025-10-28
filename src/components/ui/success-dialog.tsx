import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { Button } from "./button"

const SuccessDialog = DialogPrimitive.Root

const SuccessDialogTrigger = DialogPrimitive.Trigger

const SuccessDialogPortal = DialogPrimitive.Portal

const SuccessDialogOverlay = React.forwardRef<
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
SuccessDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface SuccessDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  title?: string;
  description?: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

const SuccessDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SuccessDialogContentProps
>(({ className, children, title, description, buttonText, onButtonClick, ...props }, ref) => (
  <SuccessDialogPortal>
    <SuccessDialogOverlay />
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
      <div className="flex flex-col items-center gap-6">
        {/* Success Icon */}
        <div className="relative h-[100px] w-[100px]">
          <div className="absolute inset-0 rounded-full bg-[#f0faf4]" />
          <div className="absolute left-[14px] top-[14px] flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#0eaf52]">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex w-full flex-col gap-3 text-center">
          {title && (
            <h2 className="text-base font-medium leading-[1.6] text-[#10141a]">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-base font-medium leading-[1.6] text-[#808081]">
              {description}
            </p>
          )}
          {children}
        </div>

        {/* Button */}
        {buttonText && (
          <Button 
            className="w-full" 
            size="lg"
            onClick={onButtonClick}
          >
            {buttonText}
          </Button>
        )}
      </div>
    </DialogPrimitive.Content>
  </SuccessDialogPortal>
))
SuccessDialogContent.displayName = DialogPrimitive.Content.displayName

const SuccessDialogClose = DialogPrimitive.Close

export {
  SuccessDialog,
  SuccessDialogTrigger,
  SuccessDialogContent,
  SuccessDialogClose,
}

