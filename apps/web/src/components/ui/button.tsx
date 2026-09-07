import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  // Exactly one filled primary action is on screen at a time.
  primary:
    "bg-volt-400 text-ink-900 border border-volt-500 hover:bg-volt-300 font-semibold shadow-sm disabled:bg-paper-300 disabled:border-paper-300 disabled:text-ink-500",
  secondary:
    "bg-white text-ink-900 border border-paper-300 hover:bg-paper-50 disabled:text-ink-500",
  ghost: "bg-transparent text-ink-700 border border-transparent hover:bg-paper-200",
  danger: "bg-white text-bad-700 border border-bad-500/40 hover:bg-bad-100",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md whitespace-nowrap transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-70",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
