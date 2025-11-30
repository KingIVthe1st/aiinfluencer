/**
 * LoadingSkeleton - Premium Loading States
 *
 * Features:
 * - Shimmer animation
 * - Multiple variants
 * - Customizable shapes
 * - Accessible (aria-busy)
 */

import React from 'react';

export interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  count = 1,
  animation = 'shimmer',
  className = '',
  ...props
}) => {
  // Base styles
  const baseStyles = `
    bg-gradient-to-r from-slate-800/50 via-slate-700/50 to-slate-800/50
    bg-[length:200%_100%]
    rounded
    overflow-hidden
    relative
  `;

  // Animation styles
  const animationStyles = {
    pulse: 'animate-pulse',
    shimmer: 'animate-shimmer',
    none: '',
  };

  // Variant styles
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-2xl h-48',
  };

  // Size styles
  const widthStyle = width ? (typeof width === 'number' ? `${width}px` : width) : '100%';
  const heightStyle = height
    ? typeof height === 'number'
      ? `${height}px`
      : height
    : variant === 'circular'
    ? widthStyle
    : variant === 'text'
    ? '1em'
    : '100%';

  const skeletonClasses = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${animationStyles[animation]}
    ${className}
  `;

  const skeletons = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={skeletonClasses}
      style={{
        width: widthStyle,
        height: heightStyle,
      }}
      aria-busy="true"
      aria-label="Loading..."
      {...props}
    >
      {animation === 'shimmer' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-shimmer" />
      )}
    </div>
  ));

  return count > 1 ? <div className="space-y-3">{skeletons}</div> : <>{skeletons}</>;
};

/**
 * CardSkeleton - Pre-built card loading state
 */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  const cards = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <LoadingSkeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton variant="text" width="60%" />
          <LoadingSkeleton variant="text" width="40%" />
        </div>
      </div>

      {/* Body */}
      <div className="space-y-2">
        <LoadingSkeleton variant="text" width="100%" />
        <LoadingSkeleton variant="text" width="90%" />
        <LoadingSkeleton variant="text" width="80%" />
      </div>

      {/* Footer */}
      <div className="flex gap-2">
        <LoadingSkeleton variant="rectangular" width={80} height={32} />
        <LoadingSkeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  ));

  return count > 1 ? <div className="grid gap-6">{cards}</div> : <>{cards}</>;
};

/**
 * TableSkeleton - Table loading state
 */
export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, index) => (
          <LoadingSkeleton key={index} variant="text" height={40} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton key={colIndex} variant="text" height={32} />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * ListSkeleton - List loading state
 */
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  const items = Array.from({ length: count }, (_, index) => (
    <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
      <LoadingSkeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton variant="text" width="70%" />
        <LoadingSkeleton variant="text" width="40%" />
      </div>
    </div>
  ));

  return <div className="space-y-2">{items}</div>;
};

// Add shimmer animation to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
  `;
  document.head.appendChild(style);
}
