'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, ChevronUp, Info, CheckCircle2, XCircle, AlertTriangle, Edit3 } from 'lucide-react';
import { clsx } from 'clsx';
import { Strategy } from '@/store/useAppStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatInrShort } from '@/lib/mock-bureau';

interface StrategyCardProps {
  strategy: Strategy;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (id: number) => void;
  onFeesChange?: (id: number, pf: number, fc: number) => void;
  index?: number;
}

const TAG_CONFIG = {
  BT: { label: 'Balance Transfer', variant: 'blue' as const, color: '#60a5fa' },
  TOPUP: { label: 'Top-up Loan', variant: 'purple' as const, color: '#c084fc' },
  PARTIAL: { label: 'Part Prepayment', variant: 'amber' as const, color: '#fbbf24' },
  CLOSURE: { label: 'Loan Closure', variant: 'green' as const, color: '#34d399' },
  LAP: { label: 'LAP Refinance', variant: 'teal' as const, color: '#2FAB8E' },
  CONSOLIDATE: { label: 'Consolidation', variant: 'mint' as const, color: '#25F0C0' },
};

export function StrategyCard({
  strategy,
  isSelected,
  isDisabled,
  onToggle,
  onFeesChange,
  index = 0,
}: StrategyCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingFees, setEditingFees] = useState(false);
  const [pf, setPf] = useState(strategy.fees?.pf ?? 1);
  const [fc, setFc] = useState(strategy.fees?.fc ?? 2);

  const tagConfig = TAG_CONFIG[strategy.tag];
  const isBT = strategy.tag === 'BT';

  const handleToggle = () => {
    if (!isDisabled) onToggle(strategy.id);
  };

  const handleSaveFees = () => {
    onFeesChange?.(strategy.id, pf, fc);
    setEditingFees(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={clsx(
        'rounded-2xl border transition-all duration-300 overflow-hidden',
        isDisabled
          ? 'opacity-40 cursor-not-allowed border-border bg-faint'
          : isSelected
          ? 'border-mint/50 shadow-mint-glow'
          : 'border-border bg-card hover:border-mint/20',
        isSelected && 'bg-gradient-to-br from-mint/5 to-card'
      )}
    >
      {/* Header */}
      <div className="p-4" onClick={!isDisabled ? handleToggle : undefined}>
        <div className="flex items-start gap-3">
          {/* Selector */}
          <div
            className={clsx(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
              isSelected
                ? 'bg-mint border-mint shadow-mint-glow'
                : isDisabled
                ? 'border-border bg-faint'
                : 'border-border hover:border-mint/50 cursor-pointer'
            )}
          >
            {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant={tagConfig.variant} size="sm">
                {tagConfig.label}
              </Badge>
              {isDisabled && (
                <Badge variant="red" size="sm">
                  Conflicts
                </Badge>
              )}
            </div>

            <h3 className="font-semibold text-text text-sm leading-snug mb-1">
              {strategy.title}
            </h3>
            <p className="text-xs text-muted leading-relaxed line-clamp-2">
              {strategy.reason}
            </p>
          </div>
        </div>

        {/* Transfer row */}
        {strategy.fromLoan && strategy.toLoan && (
          <div className="mt-3 flex items-center gap-2 bg-faint rounded-xl px-3 py-2">
            <div className="text-xs">
              <span className="text-muted">From: </span>
              <span className="text-text font-medium">{strategy.fromLoan.lender}</span>
              <span className="text-amber ml-1">@{strategy.fromLoan.rate}%</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-mint flex-shrink-0" />
            <div className="text-xs">
              <span className="text-muted">To: </span>
              <span className="text-text font-medium">{strategy.toLoan.lender}</span>
              <span className="text-green ml-1">@{strategy.toLoan.rate}%</span>
            </div>
            <div className="ml-auto text-xs font-semibold text-mint">
              {formatInrShort(strategy.toLoan.amount)}
            </div>
          </div>
        )}

        {/* Savings row */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="bg-faint rounded-xl p-2.5 text-center">
            <div className="text-xs text-muted mb-0.5">EMI Freed</div>
            <div className="text-sm font-bold text-green">
              {formatInrShort(strategy.monthlyEmiFreed)}/m
            </div>
          </div>
          <div className="bg-faint rounded-xl p-2.5 text-center">
            <div className="text-xs text-muted mb-0.5">Interest Saved</div>
            <div className="text-sm font-bold text-mint">
              {formatInrShort(strategy.totalInterestSaved)}
            </div>
          </div>
          <div className="bg-faint rounded-xl p-2.5 text-center">
            <div className="text-xs text-muted mb-0.5">Net Benefit</div>
            <div className="text-sm font-bold text-text">
              {formatInrShort(strategy.netSaving)}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable details */}
      <div className="border-t border-border">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted hover:text-text transition-colors"
        >
          <span>Details & fees</span>
          {detailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {detailsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 space-y-3"
          >
            {/* Recommendation */}
            <div className="bg-mint/5 border border-mint/20 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-mint mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text/80 leading-relaxed">{strategy.recommendation}</p>
              </div>
            </div>

            {/* Fees (BT only) */}
            {isBT && (
              <div className="border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-text">Fee Assumptions</span>
                  <button
                    onClick={() => setEditingFees(!editingFees)}
                    className="text-[10px] text-mint flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    {editingFees ? 'Cancel' : 'Edit'}
                  </button>
                </div>
                {editingFees ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted w-32">Processing Fee %</label>
                      <input
                        type="number"
                        value={pf}
                        onChange={(e) => setPf(parseFloat(e.target.value) || 0)}
                        className="flex-1 bg-faint border border-border rounded-lg px-2 py-1 text-xs text-text focus:border-mint/50 focus:outline-none"
                        step="0.1"
                        min="0"
                        max="5"
                      />
                      <span className="text-xs text-muted">%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted w-32">Foreclosure %</label>
                      <input
                        type="number"
                        value={fc}
                        onChange={(e) => setFc(parseFloat(e.target.value) || 0)}
                        className="flex-1 bg-faint border border-border rounded-lg px-2 py-1 text-xs text-text focus:border-mint/50 focus:outline-none"
                        step="0.1"
                        min="0"
                        max="5"
                      />
                      <span className="text-xs text-muted">%</span>
                    </div>
                    <Button size="xs" variant="outline" onClick={handleSaveFees} fullWidth>
                      Recalculate with these fees
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-muted">Processing Fee: </span>
                      <span className="text-amber font-medium">{pf}%</span>
                    </div>
                    <div>
                      <span className="text-muted">Foreclosure: </span>
                      <span className="text-amber font-medium">{fc}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Eligibility */}
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted">{strategy.eligibility}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* CTA */}
      {!isDisabled && (
        <div className="px-4 pb-4">
          <button
            onClick={handleToggle}
            className={clsx(
              'w-full py-2.5 rounded-xl text-sm font-semibold transition-all border',
              isSelected
                ? 'bg-red/10 border-red/30 text-red hover:bg-red/20'
                : 'bg-mint/10 border-mint/30 text-mint hover:bg-mint/20'
            )}
          >
            {isSelected ? 'Deselect Strategy' : 'Select This Strategy'}
          </button>
        </div>
      )}

      {isDisabled && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-red/5 border border-red/20 rounded-xl px-3 py-2">
            <XCircle className="w-3.5 h-3.5 text-red/60" />
            <span className="text-xs text-red/60">Conflicts with a selected strategy</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
