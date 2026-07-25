import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-eucalypt-600 text-white hover:bg-eucalypt-700 active:bg-eucalypt-800 shadow-soft",
  secondary:
    "bg-white text-eucalypt-700 border border-eucalypt-200 hover:bg-eucalypt-50",
  ghost: "bg-transparent text-ink-soft hover:bg-eucalypt-50 hover:text-eucalypt-700",
  danger: "bg-white text-clay-600 border border-clay-200 hover:bg-clay-100",
  subtle: "bg-eucalypt-100 text-eucalypt-700 hover:bg-eucalypt-200",
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2.5 rounded-xl gap-2",
  lg: "text-base px-5 py-3 rounded-xl gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", fullWidth, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
});
