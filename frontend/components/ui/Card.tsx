import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// Card variants
const cardVariants = cva(
  'rounded-xl transition-all duration-base',
  {
    variants: {
      variant: {
        default: 'bg-card border border-border shadow-sm',
        glass: 'glass shadow-lg',
        feature: 'glass border border-white/20 shadow-lg',
        interactive: 'bg-card border border-border shadow-sm hover:shadow-md hover:scale-101 cursor-pointer',
        premium: 'glass border border-primary/30 shadow-lg hover:shadow-glow-primary',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cardVariants({ variant, padding, className })}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Card Header
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 ${className || ''}`}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// Card Title
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-2xl font-semibold leading-none tracking-tight text-white ${className || ''}`}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

// Card Description
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-muted-foreground ${className || ''}`}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// Card Content
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={`pt-0 ${className || ''}`} {...props} />
));
CardContent.displayName = 'CardContent';

// Card Footer
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center pt-0 ${className || ''}`}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
