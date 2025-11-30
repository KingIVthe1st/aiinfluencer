import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// Button variants using CVA (class-variance-authority)
const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-fast ease-spring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-primary text-white shadow-md hover:shadow-glow-primary hover:scale-102 active:scale-98',
        secondary:
          'border-2 border-primary bg-transparent text-primary hover:bg-primary-scale-50 hover:shadow-glow-primary',
        ghost:
          'bg-transparent text-foreground hover:bg-muted',
        outline:
          'border-2 border-border bg-transparent text-foreground hover:bg-muted',
        destructive:
          'bg-error-500 text-white shadow-md hover:bg-error-600 hover:shadow-lg',
        link:
          'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
        xl: 'px-10 py-5 text-xl',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, fullWidth, className })}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
