import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

// Heading Component
const headingVariants = cva('font-display font-bold tracking-tight text-slate-900', {
  variants: {
    as: {
      h1: 'text-6xl',
      h2: 'text-5xl',
      h3: 'text-4xl',
      h4: 'text-3xl',
      h5: 'text-2xl',
      h6: 'text-xl',
    },
    gradient: {
      true: 'gradient-text',
      false: '',
    },
    balance: {
      true: 'text-balance',
      false: '',
    },
  },
  defaultVariants: {
    as: 'h2',
    gradient: false,
    balance: true,
  },
});

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, as: Component = 'h2', gradient, balance, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={headingVariants({ as: Component, gradient, balance, className })}
        {...props}
      />
    );
  }
);

Heading.displayName = 'Heading';

// Text Component
const textVariants = cva('font-sans', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    weight: {
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    variant: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      accent: 'text-accent',
      error: 'text-error-500',
      success: 'text-success-500',
      warning: 'text-warning-500',
    },
    balance: {
      true: 'text-balance',
      false: '',
    },
  },
  defaultVariants: {
    size: 'base',
    weight: 'normal',
    variant: 'default',
    balance: false,
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'div' | 'label';
}

const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, as: Component = 'p', size, weight, variant, balance, ...props }, ref) => {
    return (
      <Component
        ref={ref as any}
        className={textVariants({ size, weight, variant, balance, className })}
        {...props}
      />
    );
  }
);

Text.displayName = 'Text';

// Display Text Component (for hero sections)
const displayVariants = cva(
  'font-display font-extrabold tracking-tighter leading-none',
  {
    variants: {
      size: {
        sm: 'text-4xl',
        md: 'text-5xl',
        lg: 'text-6xl',
      },
      gradient: {
        true: 'gradient-text',
        false: '',
      },
      animate: {
        true: 'gradient-animate',
        false: '',
      },
    },
    defaultVariants: {
      size: 'lg',
      gradient: false,
      animate: false,
    },
  }
);

export interface DisplayProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof displayVariants> {}

const Display = React.forwardRef<HTMLHeadingElement, DisplayProps>(
  ({ className, size, gradient, animate, ...props }, ref) => {
    return (
      <h1
        ref={ref}
        className={displayVariants({ size, gradient, animate, className })}
        {...props}
      />
    );
  }
);

Display.displayName = 'Display';

// Gradient Text Wrapper
interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  animate?: boolean;
}

const GradientText = React.forwardRef<HTMLSpanElement, GradientTextProps>(
  ({ className, animate = false, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={clsx('gradient-text', animate && 'gradient-animate', className)}
        {...props}
      />
    );
  }
);

GradientText.displayName = 'GradientText';

// Code/Mono Text
const codeVariants = cva('font-mono', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
    },
    variant: {
      inline: 'px-1.5 py-0.5 rounded bg-muted text-foreground',
      block: 'block p-4 rounded-lg bg-muted text-foreground overflow-x-auto',
    },
  },
  defaultVariants: {
    size: 'sm',
    variant: 'inline',
  },
});

export interface CodeProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof codeVariants> {}

const Code = React.forwardRef<HTMLElement, CodeProps>(
  ({ className, size, variant, ...props }, ref) => {
    return (
      <code
        ref={ref}
        className={codeVariants({ size, variant, className })}
        {...props}
      />
    );
  }
);

Code.displayName = 'Code';

// Blockquote
const Blockquote = React.forwardRef<
  HTMLQuoteElement,
  React.HTMLAttributes<HTMLQuoteElement>
>(({ className, ...props }, ref) => (
  <blockquote
    ref={ref}
    className={clsx(
      'border-l-4 border-primary pl-6 italic text-muted-foreground',
      className
    )}
    {...props}
  />
));

Blockquote.displayName = 'Blockquote';

// List Components
const List = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement> & { ordered?: boolean }
>(({ className, ordered = false, ...props }, ref) => {
  const Component = ordered ? 'ol' : 'ul';
  return (
    <Component
      ref={ref as any}
      className={clsx(
        'space-y-2',
        ordered ? 'list-decimal list-inside' : 'list-disc list-inside',
        className
      )}
      {...props}
    />
  );
});

List.displayName = 'List';

const ListItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={clsx('text-foreground', className)} {...props} />
));

ListItem.displayName = 'ListItem';

// Link
const linkVariants = cva(
  'inline-flex items-center gap-1 transition-colors duration-fast',
  {
    variants: {
      variant: {
        default: 'text-primary hover:text-primary-scale-600 underline-offset-4 hover:underline',
        muted: 'text-muted-foreground hover:text-foreground underline-offset-4 hover:underline',
        subtle: 'text-foreground hover:text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  external?: boolean;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant, external = false, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={linkVariants({ variant, className })}
        {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
        {...props}
      />
    );
  }
);

Link.displayName = 'Link';

export {
  Heading,
  Text,
  Display,
  GradientText,
  Code,
  Blockquote,
  List,
  ListItem,
  Link,
  headingVariants,
  textVariants,
  displayVariants,
  codeVariants,
  linkVariants,
};
