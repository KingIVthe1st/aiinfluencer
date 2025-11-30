/**
 * EmptyState - Premium Empty State Component
 *
 * Features:
 * - Icon support
 * - Call-to-action buttons
 * - Multiple variants
 * - Engaging animations
 */

import React from 'react';
import { PremiumButton } from './PremiumButton';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error' | 'success';
  illustration?: 'music' | 'image' | 'video' | 'search' | 'error' | 'custom';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  illustration,
  className = '',
}) => {
  // Variant colors
  const variantColors = {
    default: 'text-violet-400',
    search: 'text-blue-400',
    error: 'text-red-400',
    success: 'text-green-400',
  };

  // Illustrations (SVG icons)
  const illustrations = {
    music: (
      <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
    ),
    image: (
      <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    video: (
      <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    ),
    search: (
      <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
    error: (
      <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    custom: null,
  };

  const displayIcon = icon || (illustration && illustrations[illustration]);

  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      {/* Icon/Illustration */}
      {displayIcon && (
        <div
          className={`mb-6 ${variantColors[variant]} opacity-50 floating`}
          aria-hidden="true"
        >
          {displayIcon}
        </div>
      )}

      {/* Title */}
      <h3 className="text-2xl font-semibold text-white mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-slate-400 max-w-md mb-8 leading-relaxed">{description}</p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <PremiumButton
              variant="gradient"
              size="lg"
              onClick={action.onClick}
              icon={action.icon}
              glow
            >
              {action.label}
            </PremiumButton>
          )}
          {secondaryAction && (
            <PremiumButton variant="ghost" size="lg" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </PremiumButton>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Specialized empty states
 */

export const NoSingersEmptyState: React.FC<{ onCreateSinger: () => void }> = ({
  onCreateSinger,
}) => (
  <EmptyState
    illustration="music"
    title="No singers yet"
    description="Create your first AI singer to start generating music, images, and videos with a persistent persona."
    action={{
      label: 'Create Your First Singer',
      onClick: onCreateSinger,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
    }}
  />
);

export const NoSongsEmptyState: React.FC<{ onCreateSong: () => void }> = ({ onCreateSong }) => (
  <EmptyState
    illustration="music"
    title="No songs yet"
    description="Generate your first song with AI-powered vocals and music production."
    action={{
      label: 'Generate Song',
      onClick: onCreateSong,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
          />
        </svg>
      ),
    }}
  />
);

export const SearchEmptyState: React.FC<{ query: string }> = ({ query }) => (
  <EmptyState
    illustration="search"
    variant="search"
    title={`No results for "${query}"`}
    description="Try adjusting your search terms or filters to find what you're looking for."
  />
);

export const ErrorEmptyState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    illustration="error"
    variant="error"
    title="Something went wrong"
    description="We couldn't load this content. Please try again."
    action={
      onRetry
        ? {
            label: 'Try Again',
            onClick: onRetry,
          }
        : undefined
    }
  />
);
