'use client';

import * as React from 'react';
import { clsx } from 'clsx';

// Motion Context for reduced motion preference
const MotionContext = React.createContext<{ prefersReducedMotion: boolean }>({
  prefersReducedMotion: false,
});

export const MotionProvider = ({ children }: { children: React.ReactNode }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <MotionContext.Provider value={{ prefersReducedMotion }}>
      {children}
    </MotionContext.Provider>
  );
};

export const useReducedMotion = () => {
  const context = React.useContext(MotionContext);
  return context.prefersReducedMotion;
};

// Animation wrapper types
interface AnimationProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: 'fast' | 'base' | 'slow' | 'hero';
}

// FadeIn Component
export const FadeIn = React.forwardRef<HTMLDivElement, AnimationProps>(
  ({ children, className, delay = 0, duration = 'base' }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    return (
      <div
        ref={ref}
        className={clsx(
          !prefersReducedMotion && 'animate-fade-in',
          className
        )}
        style={{
          animationDelay: !prefersReducedMotion ? `${delay}ms` : undefined,
          animationDuration: !prefersReducedMotion ? `var(--duration-${duration})` : undefined,
        }}
      >
        {children}
      </div>
    );
  }
);

FadeIn.displayName = 'FadeIn';

// SlideIn Component
interface SlideInProps extends AnimationProps {
  direction?: 'top' | 'bottom' | 'left' | 'right';
}

export const SlideIn = React.forwardRef<HTMLDivElement, SlideInProps>(
  ({ children, className, direction = 'bottom', delay = 0, duration = 'base' }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    const animationClass = !prefersReducedMotion
      ? `animate-slide-in-from-${direction}`
      : '';

    return (
      <div
        ref={ref}
        className={clsx(animationClass, className)}
        style={{
          animationDelay: !prefersReducedMotion ? `${delay}ms` : undefined,
          animationDuration: !prefersReducedMotion ? `var(--duration-${duration})` : undefined,
        }}
      >
        {children}
      </div>
    );
  }
);

SlideIn.displayName = 'SlideIn';

// ScaleIn Component
export const ScaleIn = React.forwardRef<HTMLDivElement, AnimationProps>(
  ({ children, className, delay = 0, duration = 'fast' }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    return (
      <div
        ref={ref}
        className={clsx(!prefersReducedMotion && 'animate-scale-in', className)}
        style={{
          animationDelay: !prefersReducedMotion ? `${delay}ms` : undefined,
          animationDuration: !prefersReducedMotion ? `var(--duration-${duration})` : undefined,
        }}
      >
        {children}
      </div>
    );
  }
);

ScaleIn.displayName = 'ScaleIn';

// Stagger Container - Animates children sequentially
interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  animation?: 'fade' | 'slide' | 'scale';
  direction?: 'top' | 'bottom' | 'left' | 'right';
}

export const Stagger = ({
  children,
  className,
  staggerDelay = 100,
  animation = 'fade',
  direction = 'bottom',
}: StaggerProps) => {
  const prefersReducedMotion = useReducedMotion();
  const childrenArray = React.Children.toArray(children);

  const AnimationComponent =
    animation === 'fade' ? FadeIn : animation === 'slide' ? SlideIn : ScaleIn;

  return (
    <div className={className}>
      {childrenArray.map((child, index) => {
        if (animation === 'slide') {
          return (
            <AnimationComponent
              key={index}
              delay={!prefersReducedMotion ? index * staggerDelay : 0}
              direction={direction}
            >
              {child}
            </AnimationComponent>
          );
        }
        return (
          <AnimationComponent
            key={index}
            delay={!prefersReducedMotion ? index * staggerDelay : 0}
          >
            {child}
          </AnimationComponent>
        );
      })}
    </div>
  );
};

// Reveal - Intersection Observer based animation
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade' | 'slide' | 'scale';
  direction?: 'top' | 'bottom' | 'left' | 'right';
  threshold?: number;
  triggerOnce?: boolean;
}

export const Reveal = ({
  children,
  className,
  animation = 'fade',
  direction = 'bottom',
  threshold = 0.1,
  triggerOnce = true,
}: RevealProps) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce && ref.current) {
            observer.unobserve(ref.current);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, triggerOnce, prefersReducedMotion]);

  const AnimationComponent =
    animation === 'fade' ? FadeIn : animation === 'slide' ? SlideIn : ScaleIn;

  return (
    <div ref={ref} className={className}>
      {isVisible ? (
        animation === 'slide' ? (
          <AnimationComponent direction={direction}>{children}</AnimationComponent>
        ) : (
          <AnimationComponent>{children}</AnimationComponent>
        )
      ) : (
        <div style={{ opacity: 0 }}>{children}</div>
      )}
    </div>
  );
};

// Pulse Glow - For loading states and emphasis
interface PulseGlowProps {
  children: React.ReactNode;
  className?: string;
  color?: 'primary' | 'accent' | 'success';
}

export const PulseGlow = React.forwardRef<HTMLDivElement, PulseGlowProps>(
  ({ children, className, color = 'primary' }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    const glowClass = !prefersReducedMotion
      ? {
          primary: 'shadow-glow-primary animate-pulse-glow',
          accent: 'shadow-glow-accent animate-pulse-glow',
          success: 'shadow-glow-success animate-pulse-glow',
        }[color]
      : '';

    return (
      <div ref={ref} className={clsx(glowClass, className)}>
        {children}
      </div>
    );
  }
);

PulseGlow.displayName = 'PulseGlow';

// Gradient Shift - Animated gradient background
export const GradientShift = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      ref={ref}
      className={clsx(
        'bg-gradient-mesh',
        !prefersReducedMotion && 'animate-gradient-shift',
        className
      )}
      {...props}
    />
  );
});

GradientShift.displayName = 'GradientShift';

// Spin - For loading spinners
interface SpinProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spin = ({ size = 'md', className }: SpinProps) => {
  const prefersReducedMotion = useReducedMotion();

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      className={clsx(
        'rounded-full border-2 border-current border-t-transparent',
        !prefersReducedMotion && 'animate-spin',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
};
