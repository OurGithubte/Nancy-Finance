import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-slate-950 shadow",
        secondary:
          "border-transparent bg-surface-card text-slate-200",
        destructive:
          "border-transparent bg-expense/10 text-expense border-expense/20",
        income:
          "border-transparent bg-income/10 text-income border-income/20",
        debt:
          "border-transparent bg-debt/10 text-debt border-debt/20",
        credit:
          "border-transparent bg-credit/10 text-credit border-credit/20",
        saving:
          "border-transparent bg-saving/10 text-saving border-saving/20",
        warning:
          "border-transparent bg-warning/10 text-warning border-warning/20",
        outline: "text-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
