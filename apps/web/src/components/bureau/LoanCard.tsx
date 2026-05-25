'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Edit3, Home, CreditCard, Car, Briefcase, GraduationCap, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { BureauLoan } from '@/store/useAppStore';
import { formatInrShort } from '@/lib/mock-bureau';
import { Badge } from '@/components/ui/Badge';

interface LoanCardProps {
  loan: BureauLoan;
  onUpdate: (updates: Partial<BureauLoan>) => void;
  index?: number;
}

const LOAN_ICONS: Record<string, React.ElementType> = {
  'Home Loan': Home,
  'Personal Loan': CreditCard,
  'Auto Loan': Car,
  'Business Loan': Briefcase,
  'Education Loan': GraduationCap,
  'Credit Card': CreditCard,
  'SME Loan': Building2,
  'Consumer Durable': CreditCard,
};

function EditableField({
  label,
  value,
  onChange,
  prefix = '₹',
  suffix = '',
  min = 0,
  color = 'text-text',
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  color?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(value));

  const handleBlur = () => {
    const parsed = parseFloat(inputVal.replace(/,/g, ''));
    if (!isNaN(parsed) && parsed >= min) {
      onChange(parsed);
    } else {
      setInputVal(String(value));
    }
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted">{prefix}</span>
          <input
            autoFocus
            type="number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            className={clsx(
              'w-full bg-faint border border-mint/30 rounded-lg px-2 py-1 text-sm font-semibold',
              'focus:border-mint/60 focus:outline-none',
              color
            )}
          />
          {suffix && <span className="text-xs text-muted">{suffix}</span>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setInputVal(String(value));
            setEditing(true);
          }}
          className={clsx(
            'flex items-center gap-1.5 text-sm font-semibold text-left group',
            color
          )}
        >
          {prefix}{value >= 100000 ? formatInrShort(value).replace('₹', '') : value.toLocaleString('en-IN')}{suffix}
          <Edit3 className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
}

export function LoanCard({ loan, onUpdate, index = 0 }: LoanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = LOAN_ICONS[loan.accountType] || CreditCard;
  const hasDpd = loan.dpd > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={clsx(
        'rounded-2xl border transition-all duration-200',
        hasDpd ? 'border-amber/30 bg-amber/5' : 'border-border bg-card'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icon */}
        <div
          className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            hasDpd ? 'bg-amber/10' : 'bg-faint'
          )}
        >
          <Icon
            className={clsx('w-5 h-5', hasDpd ? 'text-amber' : 'text-muted')}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text text-sm">{loan.lender}</span>
            {hasDpd ? (
              <Badge variant="amber" dot size="sm">
                {loan.dpd} DPD
              </Badge>
            ) : (
              <Badge variant="green" dot size="sm">
                Active
              </Badge>
            )}
            {loan.isEdited && (
              <Badge variant="blue" size="sm">
                Edited
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted mt-0.5 truncate">
            {loan.accountType} • {loan.accountNumber}
          </div>
        </div>

        {/* OS + EMI summary */}
        <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
          <div className="text-right">
            <div className="text-xs text-muted">Outstanding</div>
            <div className="text-sm font-semibold text-mint">
              {formatInrShort(loan.outstanding)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">EMI</div>
            <div className="text-sm font-semibold text-text">
              {formatInrShort(loan.emi)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Rate</div>
            <div className="text-sm font-semibold text-amber">{loan.rate}%</div>
          </div>
        </div>

        {/* Expand */}
        <div className="text-muted ml-2 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Mobile summary */}
      <div className="sm:hidden px-4 pb-3 flex gap-4">
        <div>
          <div className="text-[10px] text-muted uppercase">Outstanding</div>
          <div className="text-sm font-semibold text-mint">{formatInrShort(loan.outstanding)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted uppercase">EMI</div>
          <div className="text-sm font-semibold text-text">{formatInrShort(loan.emi)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted uppercase">Rate</div>
          <div className="text-sm font-semibold text-amber">{loan.rate}%</div>
        </div>
      </div>

      {/* Expanded Edit Section */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-border"
        >
          {hasDpd && (
            <div className="mx-4 mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber/10 border border-amber/20">
              <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0" />
              <p className="text-xs text-amber">
                This account has {loan.dpd} days past due — may affect eligibility.
              </p>
            </div>
          )}

          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <EditableField
              label="Outstanding"
              value={loan.outstanding}
              onChange={(v) => onUpdate({ outstanding: v })}
              color="text-mint"
            />
            <EditableField
              label="Sanction Amount"
              value={loan.sanctionAmount}
              onChange={(v) => onUpdate({ sanctionAmount: v })}
              color="text-amber"
            />
            <EditableField
              label="Interest Rate"
              value={loan.rate}
              onChange={(v) => onUpdate({ rate: v })}
              prefix=""
              suffix="%"
              min={0}
              color="text-text"
            />
            <EditableField
              label="Monthly EMI"
              value={loan.emi}
              onChange={(v) => onUpdate({ emi: v })}
              color="text-text"
            />
          </div>

          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted bg-faint rounded-xl px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal flex-shrink-0" />
              Edit values if bureau data looks incorrect. These corrections will be used for BRE calculations.
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
