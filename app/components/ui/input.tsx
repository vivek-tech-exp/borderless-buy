import { forwardRef, type InputHTMLAttributes } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`flex h-12 w-full rounded-[12px] border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-all duration-200 focus-visible:outline-none focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-950 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
