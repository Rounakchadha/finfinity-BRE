'use client';

import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';

const STEPS = [
  { label: 'Auth', path: '/auth', step: 1 },
  { label: 'Bureau', path: '/bureau', step: 2 },
  { label: 'Dashboard', path: '/dashboard', step: 3 },
  { label: 'Strategies', path: '/strategies', step: 4 },
  { label: 'Results', path: '/strategies/results', step: 5 },
];

function getActiveStep(pathname: string): number {
  if (pathname.includes('/strategies/results')) return 5;
  if (pathname.includes('/strategies')) return 4;
  if (pathname.includes('/dashboard')) return 3;
  if (pathname.includes('/bureau')) return 2;
  if (pathname.includes('/auth')) return 1;
  return 0;
}

interface StepperProps {
  compact?: boolean;
}

export function Stepper({ compact = false }: StepperProps) {
  const pathname = usePathname();
  const activeStep = getActiveStep(pathname);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {STEPS.map((step, i) => {
          const done = activeStep > step.step;
          const active = activeStep === step.step;

          return (
            <div key={step.step} className="flex items-center gap-1.5">
              <div
                className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                  done
                    ? 'bg-mint text-black'
                    : active
                    ? 'bg-mint/20 border border-mint text-mint'
                    : 'bg-faint border border-border text-muted'
                )}
              >
                {done ? <Check className="w-3 h-3" /> : step.step}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={clsx(
                    'w-4 h-0.5 rounded-full transition-all',
                    done ? 'bg-mint' : 'bg-border'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = activeStep > step.step;
        const active = activeStep === step.step;

        return (
          <div key={step.step} className="flex items-center">
            {/* Step */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                  done
                    ? 'bg-mint text-black shadow-mint-glow'
                    : active
                    ? 'bg-mint/20 border-2 border-mint text-mint'
                    : 'bg-faint border border-border text-muted'
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : step.step}
              </div>
              <span
                className={clsx(
                  'text-[10px] font-medium transition-colors whitespace-nowrap',
                  active ? 'text-mint' : done ? 'text-teal' : 'text-muted'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-2 mb-4">
                <div
                  className={clsx(
                    'h-0.5 w-10 rounded-full transition-all duration-500',
                    done ? 'bg-mint' : 'bg-border'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
