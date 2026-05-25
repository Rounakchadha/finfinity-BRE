'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger' | 'amber' | 'success';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'full';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: [
    'bg-mint text-black font-semibold',
    'hover:brightness-110 active:brightness-95',
    'shadow-mint-glow hover:shadow-mint-glow-lg',
    'border border-transparent',
  ].join(' '),
  ghost: [
    'bg-transparent text-muted',
    'hover:bg-faint hover:text-text',
    'border border-transparent',
  ].join(' '),
  outline: [
    'bg-transparent text-mint',
    'border border-mint/30',
    'hover:border-mint/70 hover:bg-mint/5',
  ].join(' '),
  danger: [
    'bg-red/10 text-red',
    'border border-red/30',
    'hover:bg-red/20 hover:border-red/50',
  ].join(' '),
  amber: [
    'bg-amber/10 text-amber',
    'border border-amber/30',
    'hover:bg-amber/20 hover:border-amber/50',
  ].join(' '),
  success: [
    'bg-green/10 text-green',
    'border border-green/30',
    'hover:bg-green/20 hover:border-green/50',
  ].join(' '),
};

const sizeStyles: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs rounded-lg',
  sm: 'px-3.5 py-1.5 text-sm rounded-xl',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-2xl',
  full: 'px-5 py-3 text-sm rounded-xl w-full',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center gap-2',
            'font-medium transition-all duration-200',
            'cursor-pointer select-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            variantStyles[variant],
            sizeStyles[size],
            fullWidth && 'w-full',
            className
          )
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
