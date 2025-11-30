/**
 * PremiumButton - Multi-Million Dollar Agency Quality Button
 *
 * Features:
 * - Glassmorphism effects
 * - Gradient backgrounds
 * - Smooth animations
 * - Loading states
 * - Icon support
 * - Multiple variants
 */

import React from 'react';

export interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'gradient' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  glow?: boolean;
}

export const PremiumButton = React.forwardRef<HTMLButtonElement, PremiumButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      glow = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      relative inline-flex items-center justify-center
      font-medium transition-all duration-200
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      overflow-hidden group
    `;

    // Size variants
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
      md: 'px-4 py-2 text-base gap-2 rounded-xl',
      lg: 'px-6 py-3 text-lg gap-2.5 rounded-xl',
      xl: 'px-8 py-4 text-xl gap-3 rounded-2xl',
    };

    // Variant styles
    const variantStyles = {
      primary: `
        bg-gradient-to-r from-violet-600 to-violet-700
        hover:from-violet-700 hover:to-violet-800
        text-white shadow-lg shadow-violet-500/50
        hover:shadow-xl hover:shadow-violet-500/60
        active:scale-95
      `,
      secondary: `
        bg-white/10 backdrop-blur-md
        border border-white/20
        text-white hover:bg-white/20
        shadow-lg
        active:scale-95
      `,
      accent: `
        bg-gradient-to-r from-blue-500 to-blue-600
        hover:from-blue-600 hover:to-blue-700
        text-white shadow-lg shadow-blue-500/50
        hover:shadow-xl hover:shadow-blue-500/60
        active:scale-95
      `,
      ghost: `
        bg-transparent hover:bg-white/10
        text-slate-300 hover:text-white
        active:scale-95
      `,
      gradient: `
        bg-gradient-to-r from-violet-600 via-blue-600 to-violet-700
        bg-size-200 bg-pos-0
        hover:bg-pos-100
        text-white shadow-lg
        hover:shadow-xl hover:shadow-violet-500/60
        active:scale-95
        transition-all duration-300
      `,
      glass: `
        bg-white/5 backdrop-blur-xl
        border border-white/10
        text-white hover:bg-white/10
        shadow-lg
        active:scale-95
      `,
    };

    // Glow effect
    const glowStyles = glow
      ? `
        before:absolute before:inset-0 before:rounded-inherit
        before:bg-gradient-to-r before:from-violet-600 before:to-blue-600
        before:opacity-0 before:transition-opacity before:duration-300
        hover:before:opacity-100 before:blur-xl before:-z-10
      `
      : '';

    // Full width
    const widthStyles = fullWidth ? 'w-full' : '';

    const buttonClasses = `
      ${baseStyles}
      ${sizeStyles[size]}
      ${variantStyles[variant]}
      ${glowStyles}
      ${widthStyles}
      ${className}
    `;

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        {...props}
      >
        {/* Shimmer effect on hover */}
        <span
          className="absolute inset-0 overflow-hidden rounded-inherit"
          aria-hidden="true"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </span>

        {/* Content */}
        <span className="relative flex items-center justify-center gap-2">
          {loading && (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}

          {!loading && icon && iconPosition === 'left' && (
            <span className="flex-shrink-0">{icon}</span>
          )}

          {children}

          {!loading && icon && iconPosition === 'right' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
        </span>
      </button>
    );
  }
);

PremiumButton.displayName = 'PremiumButton';

// Additional utility for background size animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .bg-size-200 {
      background-size: 200% auto;
    }
    .bg-pos-0 {
      background-position: left center;
    }
    .bg-pos-100 {
      background-position: right center;
    }
  `;
  document.head.appendChild(style);
}
