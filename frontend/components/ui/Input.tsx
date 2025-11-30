import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// Input variants
const inputVariants = cva(
  'flex w-full rounded-md border-2 bg-white px-4 py-3 text-base text-neutral-900 transition-all duration-base file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-50',
  {
    variants: {
      variant: {
        default: 'border-border focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20',
        error: 'border-error-500 focus-visible:ring-4 focus-visible:ring-error-500/20',
        success: 'border-success-500 focus-visible:ring-4 focus-visible:ring-success-500/20',
      },
      inputSize: {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-3 text-base',
        lg: 'px-5 py-4 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, error, success, type, ...props }, ref) => {
    // Determine variant based on error/success props
    const computedVariant = error ? 'error' : success ? 'success' : variant;

    return (
      <input
        type={type}
        className={inputVariants({ variant: computedVariant, inputSize, className })}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

// Textarea Component
const textareaVariants = cva(
  'flex min-h-[120px] w-full rounded-md border-2 bg-white px-4 py-3 text-base text-neutral-900 transition-all duration-base placeholder:text-neutral-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-vertical dark:bg-neutral-800 dark:text-neutral-50',
  {
    variants: {
      variant: {
        default: 'border-border focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20',
        error: 'border-error-500 focus-visible:ring-4 focus-visible:ring-error-500/20',
        success: 'border-success-500 focus-visible:ring-4 focus-visible:ring-success-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  error?: boolean;
  success?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, error, success, ...props }, ref) => {
    const computedVariant = error ? 'error' : success ? 'success' : variant;

    return (
      <textarea
        className={textareaVariants({ variant: computedVariant, className })}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

// Label Component
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    required?: boolean;
  }
>(({ className, children, required, ...props }, ref) => (
  <label
    ref={ref}
    className={`block text-sm font-medium text-white mb-2 ${className || ''}`}
    {...props}
  >
    {children}
    {required && <span className="text-error-500 ml-1">*</span>}
  </label>
));

Label.displayName = 'Label';

// Form Helper Text
const HelperText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    error?: boolean;
    success?: boolean;
  }
>(({ className, error, success, ...props }, ref) => {
  const colorClass = error
    ? 'text-error-500'
    : success
    ? 'text-success-500'
    : 'text-muted-foreground';

  return (
    <p
      ref={ref}
      className={`text-sm mt-2 ${colorClass} ${className || ''}`}
      {...props}
    />
  );
});

HelperText.displayName = 'HelperText';

export { Input, Textarea, Label, HelperText, inputVariants, textareaVariants };
