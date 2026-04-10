import React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-papaya-orange disabled:opacity-50 disabled:pointer-events-none",
          {
            "bg-papaya-orange text-white hover:bg-orange-primary": variant === "primary",
            "bg-sidebar-dark text-white hover:bg-primary-dark": variant === "secondary",
            "bg-red-icon text-white hover:bg-red-700": variant === "danger",
            "border border-gray-300 bg-transparent hover:bg-gray-100 text-gray-700": variant === "outline",
            "bg-transparent hover:bg-gray-100 text-gray-700": variant === "ghost",
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-4 py-2 text-sm": size === "md",
            "h-12 px-8 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
