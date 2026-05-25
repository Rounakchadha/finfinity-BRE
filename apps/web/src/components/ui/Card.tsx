'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type CardVariant = 'default' | 'glow' | 'warn' | 'danger' | 'success' | 'highlight';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-card border-border',
  glow: 'bg-card border-mint/40 shadow-mint-glow',
  warn: 'bg-card border-amber/40',
  danger: 'bg-card border-red/40',
  success: 'bg-card border-green/40',
  highlight:
    'bg-gradient-to-br from-mint/5 to-teal/5 border-mint/20',
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = 'default', padding = 'md', hoverable = false, className, children, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'rounded-2xl border',
            variantStyles[variant],
            paddingStyles[padding],
            hoverable &&
              'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover',
            className
          )
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
