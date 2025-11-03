import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[60px] text-sm font-semibold leading-[1.4] transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 px-4 h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#00b4b8] text-white hover:bg-[#00a0a4] active:bg-[#008f93]",
                   default_full:
          "bg-[#00B4B8] text-white hover:bg-[#029a9c] active:bg-[#029a9c] w-full",
        destructive:
          "bg-[#ff4d4d] text-white hover:bg-[#ff6161] active:bg-[#ff7575] [&>svg]:text-white",
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          "bg-[#b2b2b3] text-white hover:bg-[#9a9a9b] active:bg-[#888889]",
        ghost:
          "bg-transparent text-foreground hover:bg-accent/20 hover:text-accent-foreground backdrop-blur-0",
        link: "text-primary underline-offset-4 hover:underline backdrop-blur-0",
      },
      size: {
        default: "h-[44px] px-4 py-3",
        sm: "h-10 px-5",
        lg: "h-[52px] px-[16px] py-[12px]",
        icon: "size-11 justify-center",
        "icon-sm": "size-10 justify-center",
        "icon-lg": "size-12 justify-center",
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
