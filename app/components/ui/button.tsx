import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center h-12 rounded-[12px] px-6 text-sm font-medium uppercase tracking-wide transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      default: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-md hover:shadow-lg",
      secondary: "bg-zinc-700 text-zinc-100 border border-zinc-600 hover:bg-zinc-600 hover:border-zinc-500 active:bg-zinc-800 shadow-sm hover:shadow-md",
      outline:
        "border-2 border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-900/50 hover:border-zinc-500 active:border-emerald-600 shadow-sm",
      ghost: "text-emerald-600 hover:text-emerald-500 hover:bg-zinc-900/50 active:text-emerald-700",
    };
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
