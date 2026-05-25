'use client';

import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type BadgeVariant = 'red' | 'amber' | 'green' | 'mint' | 'blue' | 'purple' | 'muted' | 'teal';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  red: 'bg-red/10 text-red border-red/20',
  amber: 'bg-amber/10 text-amber border-amber/20',
  green: 'bg-green/10 text-green border-green/20',
  mint: 'bg-mint/10 text-mint border-mint/20',
  blue: 'bg-blue/10 text-blue border-blue/20',
  purple: 'bg-purple/10 text-purple border-purple/20',
  muted: 'bg-faint text-muted border-border',
  teal: 'bg-teal/10 text-teal border-teal/20',
};

const dotColors: Record<BadgeVariant, string> = {
  red: 'bg-red',
  amber: 'bg-amber',
  green: 'bg-green',
  mint: 'bg-mint',
  blue: 'bg-blue',
  purple: 'bg-purple',
  muted: 'bg-muted',
  teal: 'bg-teal',
};

export function Badge({
  variant = 'mint',
  dot = false,
  size = 'sm',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 font-medium border rounded-full',
          size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}
