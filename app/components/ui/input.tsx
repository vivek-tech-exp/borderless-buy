import { forwardRef, type InputHTMLAttributes } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`flex h-12 w-full rounded-[12px] border px-4 py-3 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        borderColor: 'var(--input-border)',
        backgroundColor: 'var(--input-bg)',
        color: 'var(--input-text)',
      }}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
