import { forwardRef, type ComponentPropsWithoutRef, type HTMLAttributes } from "react";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-[12px] border transition-all duration-200 ${className}`}
      style={{
        borderColor: 'var(--card-border)',
        backgroundColor: 'var(--card-bg)',
        color: 'var(--text-primary)',
      }}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`flex flex-col space-y-1.5 p-4 ${className}`} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, ComponentPropsWithoutRef<"h3">>(
  ({ className = "", children, ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-base font-semibold leading-tight tracking-tight ${className}`}
      style={{ color: 'var(--text-primary)' }}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`p-4 pt-0 ${className}`} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
