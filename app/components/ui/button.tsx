import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center h-12 rounded-[12px] px-6 text-sm font-medium uppercase tracking-wide transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed";
    
    const getVariantStyle = (): React.CSSProperties => {
      switch(variant) {
        case "default":
          return {
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
          };
        case "secondary":
          return {
            backgroundColor: 'var(--btn-secondary-bg)',
            color: 'var(--btn-secondary-text)',
            border: '1px solid var(--btn-secondary-border)',
          };
        case "outline":
          return {
            border: '2px solid var(--accent-primary)',
            backgroundColor: 'transparent',
            color: 'var(--accent-primary)',
          };
        case "ghost":
          return {
            backgroundColor: 'transparent',
            color: 'var(--accent-primary)',
          };
        default:
          return {};
      }
    };

    return (
      <button
        ref={ref}
        className={`${base} ${className}`}
        style={getVariantStyle()}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
