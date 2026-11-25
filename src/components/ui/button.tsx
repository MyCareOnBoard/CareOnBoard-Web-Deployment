import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[14px] font-semibold leading-[1.4] transition-colors duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 px-4 h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]",
  {
    variants: {
      variant: {
        /** Dark green primary action. */
        default:
          "bg-[#003839] text-white hover:bg-[#0b4c4d] active:bg-[#002a2b] dark:bg-[#0f7e7d] dark:hover:bg-[#13908f]",
        default_full:
          "bg-[#003839] text-white hover:bg-[#0b4c4d] active:bg-[#002a2b] dark:bg-[#0f7e7d] dark:hover:bg-[#13908f] w-full",
        destructive:
          "bg-[#b42318] text-white hover:bg-[#9a1d14] active:bg-[#851910] dark:bg-[#d93a2f] dark:hover:bg-[#c2322a] [&>svg]:text-white",
        /** White with a grey border; secondary action. */
        outline:
          "border border-[#dcdfe2] bg-white text-[#10141a] hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5",
        secondary:
          "bg-[#eef0f2] text-[#10141a] hover:bg-[#e4e7ea] active:bg-[#dcdfe2] dark:bg-white/10 dark:text-[#f4f6f7] dark:hover:bg-white/15",
        ghost:
          "bg-transparent text-[#10141a] hover:bg-[#f4f6f7] dark:text-[#f4f6f7] dark:hover:bg-white/5",
        link: "text-[#007679] underline-offset-4 hover:underline dark:text-[#7fd3d3]",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-12 px-5",
        icon: "size-10 justify-center rounded-full px-0",
        "icon-sm": "size-9 justify-center rounded-full px-0",
        "icon-lg": "size-12 justify-center rounded-full px-0",
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
