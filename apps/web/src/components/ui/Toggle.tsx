'use client';

import { clsx } from 'clsx';

// ─── Yes/No Binary Toggle ──────────────────────────────────────────────────────

interface YesNoToggleProps {
  value: boolean | null;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  yesLabel?: string;
  noLabel?: string;
}

export function YesNoToggle({
  value,
  onChange,
  disabled = false,
  yesLabel = 'Yes',
  noLabel = 'No',
}: YesNoToggleProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={clsx(
          'px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          value === true
            ? 'bg-green/15 border-green/50 text-green shadow-[0_0_12px_rgba(52,211,153,0.2)]'
            : 'bg-faint border-border text-muted hover:border-green/30 hover:text-green/70'
        )}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={clsx(
          'px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          value === false
            ? 'bg-red/15 border-red/50 text-red shadow-[0_0_12px_rgba(248,113,113,0.2)]'
            : 'bg-faint border-border text-muted hover:border-red/30 hover:text-red/70'
        )}
      >
        {noLabel}
      </button>
    </div>
  );
}

// ─── Generic Multi-Option Toggle ──────────────────────────────────────────────

interface ToggleOption<T extends string | number> {
  value: T;
  label: string;
  color?: 'mint' | 'green' | 'amber' | 'red' | 'blue' | 'purple';
}

interface MultiToggleProps<T extends string | number> {
  options: ToggleOption<T>[];
  value: T | null;
  onChange: (val: T) => void;
  disabled?: boolean;
}

const colorStyles = {
  mint: {
    active: 'bg-mint/15 border-mint/50 text-mint shadow-mint-glow',
    idle: 'hover:border-mint/30 hover:text-mint/70',
  },
  green: {
    active: 'bg-green/15 border-green/50 text-green',
    idle: 'hover:border-green/30 hover:text-green/70',
  },
  amber: {
    active: 'bg-amber/15 border-amber/50 text-amber',
    idle: 'hover:border-amber/30 hover:text-amber/70',
  },
  red: {
    active: 'bg-red/15 border-red/50 text-red',
    idle: 'hover:border-red/30 hover:text-red/70',
  },
  blue: {
    active: 'bg-blue/15 border-blue/50 text-blue',
    idle: 'hover:border-blue/30 hover:text-blue/70',
  },
  purple: {
    active: 'bg-purple/15 border-purple/50 text-purple',
    idle: 'hover:border-purple/30 hover:text-purple/70',
  },
};

export function MultiToggle<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
}: MultiToggleProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const color = opt.color ?? 'mint';
        const styles = colorStyles[color];
        const isActive = value === opt.value;

        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'bg-faint border-border text-muted',
              isActive ? styles.active : styles.idle
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Pill Switch Toggle ────────────────────────────────────────────────────────

interface PillSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function PillSwitch({ checked, onChange, label, disabled = false }: PillSwitchProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={clsx(
          'relative w-10 h-5 rounded-full transition-all duration-300',
          'border',
          checked ? 'bg-mint/20 border-mint/50' : 'bg-faint border-border',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && onChange(!checked)}
      >
        <div
          className={clsx(
            'absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300',
            checked ? 'left-5 bg-mint shadow-mint-glow' : 'left-0.5 bg-muted/50'
          )}
        />
      </div>
      {label && (
        <span className={clsx('text-sm', checked ? 'text-text' : 'text-muted')}>{label}</span>
      )}
    </label>
  );
}
