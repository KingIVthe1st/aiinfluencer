/**
 * PremiumCard - Glassmorphic Card Component
 *
 * Features:
 * - Glassmorphism effects
 * - Gradient borders
 * - Hover animations
 * - Optional header/footer
 * - Multiple variants
 */

import React from 'react';

export interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'gradient' | 'bordered';
  hover?: boolean;
  glow?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  (
    {
      children,
      variant = 'glass',
      hover = true,
      glow = false,
      header,
      footer,
      padding = 'md',
      className = '',
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      rounded-2xl
      transition-all duration-300
      overflow-hidden
    `;

    // Padding variants
    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10',
    };

    // Variant styles
    const variantStyles = {
      glass: `
        bg-slate-900/80 backdrop-blur-xl
        border border-white/10
        shadow-xl
      `,
      solid: `
        bg-slate-800/90
        border border-slate-700/50
        shadow-xl
      `,
      gradient: `
        bg-gradient-to-br from-violet-600/20 via-slate-900/80 to-blue-600/20
        border border-white/10
        backdrop-blur-md
        shadow-xl
      `,
      bordered: `
        bg-slate-900/70
        border-2 border-violet-500/30
        shadow-xl
      `,
    };

    // Hover effects
    const hoverStyles = hover
      ? `
        hover:scale-[1.02]
        hover:shadow-2xl
        hover:border-white/20
        cursor-pointer
      `
      : '';

    // Glow effect
    const glowStyles = glow
      ? `
        shadow-violet-500/50
        hover:shadow-violet-500/70
      `
      : '';

    const cardClasses = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${hoverStyles}
      ${glowStyles}
      ${className}
    `;

    const contentPadding = paddingStyles[padding];

    return (
      <div ref={ref} className={cardClasses} {...props}>
        {/* Gradient overlay for extra depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

        {/* Header */}
        {header && (
          <div className={`border-b border-white/10 ${padding !== 'none' ? 'px-6 py-4' : 'p-0'}`}>
            {header}
          </div>
        )}

        {/* Content */}
        <div className={`relative ${contentPadding}`}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className={`border-t border-white/10 ${padding !== 'none' ? 'px-6 py-4' : 'p-0'}`}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

PremiumCard.displayName = 'PremiumCard';

/**
 * PremiumCardHeader - Specialized header component
 */
export interface PremiumCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PremiumCardHeader: React.FC<PremiumCardHeaderProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`} {...props}>
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-xl font-semibold text-white mb-1 truncate">{title}</h3>
        )}
        {subtitle && <p className="text-sm text-slate-400 truncate">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

/**
 * PremiumCardFooter - Specialized footer component
 */
export interface PremiumCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between';
}

export const PremiumCardFooter: React.FC<PremiumCardFooterProps> = ({
  children,
  justify = 'end',
  className = '',
  ...props
}) => {
  const justifyStyles = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`flex items-center gap-3 ${justifyStyles[justify]} ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * PremiumCardStat - Stat display for cards
 */
export interface PremiumCardStatProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const PremiumCardStat: React.FC<PremiumCardStatProps> = ({
  label,
  value,
  icon,
  trend,
  trendValue,
}) => {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-slate-400',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm text-slate-200">
        {icon && <span className="flex-shrink-0 text-violet-300">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        {trend && trendValue && (
          <span className={`text-sm font-medium ${trendColors[trend]}`}>
            {trendIcons[trend]} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
};
