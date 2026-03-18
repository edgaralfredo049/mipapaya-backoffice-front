import React from "react";
import { cn } from "../../lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "danger" | "warning" | "info" | "default";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          {
            "bg-green-light text-green-icon": variant === "success",
            "bg-red-light text-red-icon": variant === "danger",
            "bg-yellow-100 text-yellow-800": variant === "warning",
            "bg-blue-light text-blue-icon": variant === "info",
            "bg-gray-100 text-gray-800": variant === "default",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
