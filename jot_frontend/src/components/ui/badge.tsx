import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center border border-transparent font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "rounded-full px-2 py-0.5 text-xs bg-primary text-primary-foreground [a&]:hover:opacity-90",
        // Note tags use TagChip (category-colored), not this variant.
        secondary:
          "rounded-md px-2.5 py-1 text-xs font-mono bg-paper-panel text-ink-700 [a&]:hover:bg-line",
        destructive:
          "rounded-full px-2 py-0.5 text-xs bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "rounded-full px-2 py-0.5 text-xs border-line text-ink-900 [a&]:hover:bg-paper-panel",
        ghost: "rounded-full px-2 py-0.5 text-xs [a&]:hover:bg-paper-panel",
        link: "px-2 py-0.5 text-xs text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
