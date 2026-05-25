'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ChevronLeft, ArrowRight, AlertTriangle,
  TrendingDown, Zap, Info, CheckCircle2, XCircle,
  Edit3, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore, BureauLoan, Strategy } from '@/store/useAppStore';
import { formatInrShort } from '@/lib/mock-bureau';
import { buildLoanStrategies, LoanStrategies, ExtendedStrategy } from '@/lib/bre-engine';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';

// ─── Account type icons ────────────────────────────────────────────────────────
const ACCOUNT_ICONS: Record<string, string> = {
  'Home Loan': '🏠', 'Personal Loan': '💼', 'Credit Card': '💳',
  'Auto Loan': '🚗', 'Car Loan': '🚗', 'Business Loan': '🏢',
  'SME Loan': '🏭', 'Education Loan': '🎓', 'Consumer Durable': '📦',
  'Multiple Loans': '🔀', 'Property (LAP)': '🏛️', 'EMI Health': '⚠️',
};

const TAG_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  BT:          { bg: 'bg-blue/10',   text: 'text-blue',   border: 'border-blue/30',   label: 'Balance Transfer' },
  TOPUP:       { bg: 'bg-purple/10', text: 'text-purple', border: 'border-purple/30', label: 'Top-up Loan' },
  PARTIAL:     { bg: 'bg-amber/10',  text: 'text-amber',  border: 'border-amber/30',  label: 'Part Prepayment' },
  CLOSURE:     { bg: 'bg-green/10',  text: 'text-green',  border: 'border-green/30',  label: 'Loan Closure' },
  LAP:         { bg: 'bg-mint/10',   text: 'text-mint',   border: 'border-mint/30',   label: 'LAP' },
  CONSOLIDATE: { bg: 'bg-teal/10',   text: 'text-teal',   border: 'border-teal/30',   label: 'Consolidation' },
};

const SUBTAG_LABELS: Record<string, string> = {
  TOPUP_CONSOLIDATE: 'Consolidate via Top-up',
  TOPUP_INVEST: 'Wealth via Top-up',
  BT_OD: 'Shift to OD',
  BT_LENDER: 'Lender Transfer',
  URGENT: 'Urgent',
  WEALTH: 'Wealth Creation',
};

// ─── Mini strategy card ────────────────────────────────────────────────────────
function MiniStrategyCard({
  strategy,
  isSelected,
  isDisabled,
  onToggle,
  loanFees,
  onFeesChange,
}: {
  strategy: ExtendedStrategy;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (id: number) => void;
  loanFees: Record<number, { pf: number; fc: number }>;
  onFeesChange: (id: number, pf: number, fc: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editFees, setEditFees] = useState(false);
  const [pf, setPf] = useState(strategy.fees?.pf ?? 1);
  const [fc, setFc] = useState(strategy.fees?.fc ?? 2);
  const tag = TAG_COLORS[strategy.tag] ?? TAG_COLORS.BT;
  const isBT = strategy.tag === 'BT' || strategy.tag === 'TOPUP';

  const handleToggle = () => { if (!isDisabled) onToggle(strategy.id); };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={[
        'rounded-xl border transition-all duration-200 overflow-hidden',
        isDisabled ? 'opacity-40 cursor-not-allowed border-border bg-faint'
          : isSelected ? 'border-mint/40 bg-mint/5 shadow-[0_0_20px_rgba(37,240,192,0.08)]'
          : 'border-border bg-surface hover:border-mint/20 cursor-pointer',
      ].join(' ')}
    >
      {/* Card header — always visible */}
      <div className="p-3" onClick={!isDisabled ? handleToggle : undefined}>
        <div className="flex items-start gap-2.5">
          {/* Selector dot */}
          <div className={[
            'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
            isSelected ? 'bg-mint border-mint' : 'border-border',
          ].join(' ')}>
            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
          </div>

          <div className="flex-1 min-w-0">
            {/* Tags row */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${tag.bg} ${tag.text} ${tag.border}`}>
                {strategy.subTag ? SUBTAG_LABELS[strategy.subTag] ?? tag.label : tag.label}
              </span>
              {strategy.isRecommended && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-mint/15 text-mint border border-mint/30">
                  ✅ BEST
                </span>
              )}
              {isDisabled && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red/10 text-red border border-red/20">
                  Conflicts
                </span>
              )}
            </div>

            {/* Title */}
            <p className="text-sm font-semibold text-text leading-snug">{strategy.title}</p>

            {/* Key numbers */}
            <div className="flex items-center gap-3 mt-1.5">
              {strategy.monthlyEmiFreed > 0 && (
                <span className="text-xs text-green font-semibold">
                  ▼ {formatInrShort(strategy.monthlyEmiFreed)}/mo EMI
                </span>
              )}
              {strategy.totalInterestSaved > 0 && (
                <span className="text-xs text-mint font-semibold">
                  {formatInrShort(strategy.totalInterestSaved)} saved
                </span>
              )}
              {strategy.netSaving > 0 && strategy.totalCost && strategy.totalCost > 0 && (
                <span className="text-xs text-muted">
                  Net: {formatInrShort(strategy.netSaving)}
                </span>
              )}
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-muted hover:text-text transition-colors p-0.5"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
              {/* From → To */}
              {strategy.fromLoan && strategy.toLoan && (
                <div className="flex items-center gap-2 bg-faint rounded-lg px-3 py-2 text-xs">
                  <div>
                    <span className="text-muted">From: </span>
                    <span className="text-text font-medium">{strategy.fromLoan.lender}</span>
                    <span className="text-red ml-1">@{strategy.fromLoan.rate}%</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-mint flex-shrink-0" />
                  <div>
                    <span className="text-muted">To: </span>
                    <span className="text-text font-medium">{strategy.toLoan.lender}</span>
                    <span className="text-green ml-1">@{strategy.toLoan.rate}%</span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <p className="text-xs text-muted leading-relaxed">{strategy.reason}</p>

              {/* Fee editor (for BT/TOPUP) */}
              {isBT && strategy.fees && (
                <div className="border border-border rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wide">Transfer Costs</span>
                    <button onClick={() => setEditFees(!editFees)} className="text-[10px] text-mint flex items-center gap-1">
                      <Edit3 className="w-2.5 h-2.5" /> {editFees ? 'Done' : 'Edit'}
                    </button>
                  </div>
                  {editFees ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted w-32">Processing Fee %</span>
                        <input type="number" value={pf} step="0.1" min="0" max="5"
                          onChange={e => setPf(parseFloat(e.target.value) || 0)}
                          className="flex-1 bg-faint border border-border rounded-md px-2 py-1 text-text text-xs focus:border-mint/40 outline-none"
                        />
                        <span className="text-muted">%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted w-32">Foreclosure %</span>
                        <input type="number" value={fc} step="0.1" min="0" max="5"
                          onChange={e => setFc(parseFloat(e.target.value) || 0)}
                          className="flex-1 bg-faint border border-border rounded-md px-2 py-1 text-text text-xs focus:border-mint/40 outline-none"
                        />
                        <span className="text-muted">%</span>
                      </div>
                      <button
                        onClick={() => { onFeesChange(strategy.id, pf, fc); setEditFees(false); }}
                        className="w-full text-[10px] bg-mint/10 border border-mint/20 text-mint rounded-md py-1 hover:bg-mint/20 transition-colors"
                      >
                        Recalculate →
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-4 text-xs">
                      <span className="text-muted">PF: <span className="text-amber">{pf}%</span></span>
                      <span className="text-muted">FC: <span className="text-amber">{fc}%</span></span>
                      {strategy.breakEvenMonths && strategy.breakEvenMonths > 0 && (
                        <span className="text-muted">Break-even: <span className="text-text">{strategy.breakEvenMonths}mo</span></span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Recommendation */}
              <div className="flex items-start gap-1.5 bg-mint/5 border border-mint/15 rounded-lg p-2">
                <Info className="w-3 h-3 text-mint mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-text/80 leading-relaxed">{strategy.recommendation}</p>
              </div>

              {/* Eligibility */}
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-green mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted">{strategy.eligibility}</p>
              </div>

              {/* Select button */}
              {!isDisabled && (
                <button
                  onClick={handleToggle}
                  className={[
                    'w-full py-2 rounded-lg text-xs font-semibold border transition-all',
                    isSelected
                      ? 'bg-red/10 border-red/30 text-red hover:bg-red/20'
                      : 'bg-mint/10 border-mint/30 text-mint hover:bg-mint/20',
                  ].join(' ')}
                >
                  {isSelected ? '✓ Deselect' : '+ Select this strategy'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Loan group section ────────────────────────────────────────────────────────
function LoanGroup({
  group, selectedIds, onToggle, loanFees, onFeesChange,
}: {
  group: LoanStrategies;
  selectedIds: number[];
  onToggle: (id: number) => void;
  loanFees: Record<number, { pf: number; fc: number }>;
  onFeesChange: (id: number, pf: number, fc: number) => void;
}) {
  const { loan, strategies, recommended } = group;
  const icon = ACCOUNT_ICONS[loan.accountType] ?? '📋';
  const isSpecial = loan.id < 0; // global strategies
  const selectedInGroup = strategies.filter(s => selectedIds.includes(s.id)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Loan header */}
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white truncate">{loan.lender}</span>
            <span className="text-xs text-muted">{loan.accountType}</span>
            {!isSpecial && loan.outstanding > 0 && (
              <span className="text-xs font-semibold text-amber ml-auto">{loan.rate}% p.a.</span>
            )}
          </div>
          {!isSpecial && loan.outstanding > 0 && (
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
              <span>Outstanding: <span className="text-text">{formatInrShort(loan.outstanding)}</span></span>
              {loan.closureMonths > 0 && <span>{loan.closureMonths} months remaining</span>}
              {loan.dpd > 0 && <span className="text-red">⚠️ DPD {loan.dpd}</span>}
            </div>
          )}
        </div>
        {selectedInGroup > 0 && (
          <span className="text-[10px] bg-mint/20 text-mint px-2 py-0.5 rounded-full font-bold">
            {selectedInGroup} selected
          </span>
        )}
      </div>

      {/* Strategies */}
      <div className="p-3 space-y-2">
        {strategies.map(s => {
          const isSelected = selectedIds.includes(s.id);
          const isDisabled = !isSelected && s.conflictsWith.some(cid => selectedIds.includes(cid));
          return (
            <MiniStrategyCard
              key={s.id}
              strategy={s}
              isSelected={isSelected}
              isDisabled={isDisabled}
              onToggle={onToggle}
              loanFees={loanFees}
              onFeesChange={onFeesChange}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Tally bar ─────────────────────────────────────────────────────────────────
function TallyBar({
  selectedIds, allGroups, onViewResults,
}: {
  selectedIds: number[];
  allGroups: LoanStrategies[];
  onViewResults: () => void;
}) {
  const allStrats = allGroups.flatMap(g => g.strategies);
  const selected = allStrats.filter(s => selectedIds.includes(s.id));
  const totalEmiFreed = selected.reduce((s, st) => s + st.monthlyEmiFreed, 0);
  const totalSaved = selected.reduce((s, st) => s + st.totalInterestSaved, 0);
  const count = selected.length;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2"
          style={{ background: 'linear-gradient(to top, #080808 60%, transparent)' }}
        >
          <div
            className="max-w-3xl mx-auto rounded-2xl border border-mint/30 px-5 py-3 flex items-center gap-4 flex-wrap justify-between"
            style={{ background: 'rgba(12,31,26,0.98)', backdropFilter: 'blur(20px)', boxShadow: '0 0 40px rgba(37,240,192,0.12)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-mint text-black flex items-center justify-center text-xs font-black">{count}</div>
              <div>
                <div className="text-xs font-semibold text-text">{count} {count === 1 ? 'strategy' : 'strategies'}</div>
                <div className="text-[10px] text-muted">selected</div>
              </div>
              {totalEmiFreed > 0 && (
                <div className="border-l border-border pl-3">
                  <div className="text-xs font-bold text-green">{formatInrShort(totalEmiFreed)}/mo</div>
                  <div className="text-[10px] text-muted">EMI freed</div>
                </div>
              )}
              <div className="border-l border-border pl-3">
                <div className="text-xs font-bold text-mint">{formatInrShort(totalSaved)}</div>
                <div className="text-[10px] text-muted">interest saved</div>
              </div>
            </div>
            <button
              onClick={onViewResults}
              className="bg-mint text-black text-sm font-bold px-5 py-2 rounded-xl hover:bg-teal transition-colors flex items-center gap-2"
            >
              View Results <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Income prompt ─────────────────────────────────────────────────────────────
function IncomePrompt({ onSet }: { onSet: (v: number) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="rounded-2xl border border-amber/30 bg-amber/5 p-4 mb-5 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-semibold text-amber mb-0.5">Add income for full analysis</p>
        <p className="text-xs text-muted mb-2">Unlocks EMI ratio check, top-up eligibility, and prepayment strategies.</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-xl overflow-hidden bg-surface flex-1 max-w-xs">
            <span className="px-2.5 py-2 text-muted border-r border-border text-sm">₹</span>
            <input type="number" placeholder="Monthly net income" value={val} onChange={e => setVal(e.target.value)}
              className="flex-1 bg-transparent outline-none px-2.5 py-2 text-text text-sm"
              onKeyDown={e => { if (e.key === 'Enter') { const n = parseInt(val); if (n > 0) onSet(n); } }}
            />
          </div>
          <button onClick={() => { const n = parseInt(val); if (n > 0) onSet(n); else toast.error('Enter valid income'); }}
            className="bg-mint text-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-teal transition-colors">
            Set
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function StrategiesPage() {
  const router = useRouter();
  const { auth, bureau, profile, strategies, setStrategies, selectedStrategyIds, toggleStrategy, setLoanFees, loanFees, setProfile } = useAppStore();
  const [loanGroups, setLoanGroups] = useState<LoanStrategies[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/auth');
    else if (!bureau.fetched) router.replace('/bureau');
  }, [auth.isAuthenticated, bureau.fetched, router]);

  const rebuild = useCallback(() => {
    if (!bureau.loans.length) return;
    setIsBuilding(true);
    setTimeout(() => {
      const groups = buildLoanStrategies(
        bureau.loans, bureau.cibilScore, profile.income,
        profile.houseValue, profile.ownHouse === true,
      );
      setLoanGroups(groups);
      // Flatten for global store (for results page)
      setStrategies(groups.flatMap(g => g.strategies));
      setIsBuilding(false);
    }, 200);
  }, [bureau.loans, bureau.cibilScore, profile.income, profile.houseValue, profile.ownHouse]);

  // Always rebuild fresh on mount
  useEffect(() => { rebuild(); }, []); // eslint-disable-line

  const maxEmiFreed = useMemo(() => loanGroups.flatMap(g => g.strategies).reduce((s, st) => s + st.monthlyEmiFreed, 0), [loanGroups]);
  const maxSaved = useMemo(() => loanGroups.flatMap(g => g.strategies).reduce((s, st) => s + st.totalInterestSaved, 0), [loanGroups]);
  const totalStrategies = useMemo(() => loanGroups.flatMap(g => g.strategies).length, [loanGroups]);

  return (
    <div className="min-h-screen bg-black pb-36">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Back + title */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-muted hover:text-text transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-mint" />
              <h1 className="text-2xl font-black text-white">Strategy Optimizer</h1>
            </div>
            <p className="text-xs text-muted">
              {bureau.loans.length} loans analysed · strategies grouped by loan
            </p>
          </div>
        </div>

        {/* Income prompt */}
        {!profile.income && (
          <IncomePrompt onSet={v => { setProfile({ income: v }); setTimeout(rebuild, 100); }} />
        )}

        {/* Summary strip */}
        {totalStrategies > 0 && !isBuilding && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3 mb-7">
            <div className="rounded-2xl border border-border bg-card p-3 text-center">
              <div className="text-2xl font-black text-mint">{totalStrategies}</div>
              <div className="text-xs text-muted mt-0.5">Strategies</div>
            </div>
            <div className="rounded-2xl border border-green/20 bg-green/5 p-3 text-center">
              <div className="text-lg font-black text-green">{formatInrShort(maxEmiFreed)}<span className="text-sm font-normal">/mo</span></div>
              <div className="text-xs text-muted mt-0.5">Max EMI Saving</div>
            </div>
            <div className="rounded-2xl border border-mint/20 bg-mint/5 p-3 text-center">
              <div className="text-lg font-black text-mint">{formatInrShort(maxSaved)}</div>
              <div className="text-xs text-muted mt-0.5">Max Interest Saved</div>
            </div>
          </motion.div>
        )}

        {/* Building spinner */}
        {isBuilding && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">Analysing {bureau.loans.length} loans...</p>
          </div>
        )}

        {/* No strategies */}
        {!isBuilding && loanGroups.length === 0 && (
          <div className="text-center py-16">
            <Zap className="w-10 h-10 text-muted/30 mx-auto mb-4" />
            <p className="font-semibold text-text">Your loans are already well-optimised</p>
            <p className="text-sm text-muted mt-1">No significant savings opportunities found with current rates.</p>
            <Button variant="ghost" size="sm" onClick={() => router.push('/bureau')} className="mt-4">
              ← Review Bureau Data
            </Button>
          </div>
        )}

        {/* Loan groups */}
        {!isBuilding && (
          <div className="space-y-5">
            {loanGroups.map((group, i) => (
              <motion.div key={group.loanId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <LoanGroup
                  group={group}
                  selectedIds={selectedStrategyIds}
                  onToggle={toggleStrategy}
                  loanFees={loanFees as Record<number, { pf: number; fc: number }>}
                  onFeesChange={(id, pf, fc) => setLoanFees(id, { pf, fc })}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Manual proceed if no strategies selected */}
        {!isBuilding && loanGroups.length > 0 && selectedStrategyIds.length === 0 && (
          <p className="text-center text-xs text-muted mt-8">
            Expand a strategy card above and click <span className="text-mint">+ Select this strategy</span> to begin.
          </p>
        )}
      </main>

      {/* Tally bar */}
      <TallyBar
        selectedIds={selectedStrategyIds}
        allGroups={loanGroups}
        onViewResults={() => {
          if (selectedStrategyIds.length === 0) { toast.error('Select at least one strategy first'); return; }
          router.push('/strategies/results');
        }}
      />
    </div>
  );
}
